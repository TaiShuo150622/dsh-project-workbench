# dsh-chrome 插件侧内存占用与优化建议

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 结论

插件侧的主要内存来源不是 native host 本身，而是插件启动和管理的本地 headless Chrome，以及插件在 Node 进程中保留的 tab、截图、screencast、console 和 network capture 状态。

当前代码已经有一些限制和回收机制，但仍存在两个需要优先修复的生命周期问题：

1. 关闭 tab 后，部分 tab 相关状态没有从 Map 中删除。
2. 停止 network capture 后，完整 capture 记录会一直保留到整个 driver 关闭。

这类问题更容易造成“运行时间越长，内存逐步上涨”。如果同时创建多个 headless context，则会进一步放大占用，因为每个 context 都拥有自己的浏览器 driver 和本地 Chrome 实例。

## 主要内存来源

### 1. Headless context 和 Chrome 进程

每个 headless context 都由自己的 `HeadlessDriver` 管理，并可能启动一套本地 Chrome。context 的创建和 driver 生命周期由以下模块负责：

- `src/headless-contexts.js`
- `src/headless.js`
- `src/contexts.js`

插件当前默认允许最多 4 个 browser context。这个上限代表最多 4 套本地浏览器实例，不是 4 个轻量级逻辑对象。

插件已有性能记录显示，单套 headless Chrome：

- 空闲时约 672MB RSS；
- 活跃压测时约 1.1GB RSS；
- 通常包含多个 Chrome 子进程。

因此多个 context 并行时，内存会近似按实例数量叠加。

### 2. Screenshot stream 和 screencast

截图相关状态位于 `src/headless-screenshot.js`。每个活跃 tab 可能保留：

- 最新一帧 PNG/JPEG buffer；
- screencast pending frame；
- screenshot waiters；
- viewport 和 crop 相关缓存；
- 页面侧截图裁剪环境。

当前实现已经做了以下优化：

- 只保留最新 frame；
- screencast 写盘节流到约 100ms；
- screenshot stream 空闲后停止；
- 尽量复用 frame 做 crop；
- screencast 有停止计时器。

但实时截图和高分辨率页面仍会让 Chrome compositor、GPU 和 Node buffer 同时占用内存。

### 3. Console buffer

`src/headless-events.js` 中每个 tab 最多保留 200 条 console 记录，每条文本最多约 2000 字符。单个 tab 通常不是主要问题，但如果 tab 被频繁创建和关闭而旧 Map 项没有清理，累积后会形成长期占用。

### 4. Network capture

网络抓取代码位于：

- `src/headless.js`
- `src/headless-events.js`
- `src/headless-redact.js`

当前 capture 的限制包括：

- 默认最多 300 条请求；
- 硬上限 1000 条；
- response/request body 默认可保存；
- 单个 capture 的 body 总预算约 8MB；
- body task 并发限制为 4。

这些限制能防止单个 capture 无限增长，但停止 capture 后对象仍可能继续被 `this.captures` 保留，直到 driver 关闭。

## 已确认的生命周期清理缺口

### 1. 关闭 tab 时没有清理全部状态

创建 tab 时会写入：

```text
bySession
tabs
consoleBuffers
owners[owner].tabs
```

关闭 tab 或关闭 session 时，目前主要删除：

```js
entry.tabs.delete(tab.tabId)
this.tabs.delete(tab.tabId)
```

但没有统一删除：

```js
this.bySession.delete(tab.sessionId)
this.consoleBuffers.delete(tab.tabId)
this.captureByTab.delete(tab.tabId)
```

相关代码位置：

- `src/headless.js` 中 `tab.close_session`
- `src/headless.js` 中 `tab.tabs` 的 `op: "close"`

这会导致已经关闭的 tab 仍然可能被 session 映射、console buffer 或 capture 映射引用。

### 2. 停止 capture 后仍保留完整 capture 对象

`tab.capture_stop` 会将 capture 标记为 inactive，但不会自动从以下 Map 中删除：

```js
this.captures
this.captureByTab
```

capture 对象可能包含：

- 请求 entries；
- requestId 到 entry 的 `byId` Map；
- 脱敏后的 request/response body；
- 未完成 body task 的集合；
- timer 和统计字段。

如果一个长生命周期 driver 反复启动和停止 capture，内存会持续累积。

## 建议的代码修复

### P0：增加统一的 tab 清理函数

建议在 `HeadlessDriver` 中增加统一的 `cleanupTab(tab)`，所有以下路径都调用它：

- `tab.tabs op=close`；
- `tab.close_session`；
- context close；
- 浏览器断开或 target detach；
- tab 被页面或浏览器主动关闭。

清理内容至少包括：

```js
this.dropShotStream(tab)
this.bySession.delete(tab.sessionId)
this.consoleBuffers.delete(tab.tabId)

const capture = this.captureByTab.get(tab.tabId)
if (capture) {
  clearTimeout(capture.timer)
  capture.active = false
  capture.entries.length = 0
  capture.byId.clear()
  captureByTab.delete(tab.tabId)
  captures.delete(capture.captureId)
}

entry.tabs.delete(tab.tabId)
this.tabs.delete(tab.tabId)
```

实际实现时应避免在清理过程中使用未定义的局部变量，统一从 `this.captureByTab`、`this.captures` 访问。

### P0：为停止后的 capture 设置生命周期

建议采用以下任一策略：

- `capture_stop` 后只保留摘要，原始 entries 设置短 TTL；
- 每个 owner 最多保留 1–2 个停止后的 capture；
- `chrome_capture_requests` 读取完成后立即释放；
- driver 级别最多保留固定数量的历史 capture。

推荐默认策略：停止后保留 10 分钟，超过后删除完整 body 和 entries，只保留计数摘要。

### P1：让 capture 默认不保存 body

建议把默认行为从：

```text
storeBodies: true
```

改成：

```text
storeBodies: false
```

只有明确需要调试响应内容时，才通过参数开启 body 保存。这样可以显著降低字符串和 JSON 对象占用，也减少敏感内容在内存中的停留时间。

### P1：处理 CDP target detach

当前关闭路径主要依赖插件主动调用 `Target.closeTarget`。还应监听或处理 CDP 的 target/session detach 事件，避免页面崩溃、用户手动关闭或浏览器主动回收时留下孤儿状态。

detach 时应调用与显式关闭相同的 `cleanupTab(tab)`。

### P1：对截图 frame 增加字节上限

建议对单帧做硬限制：

- 超过限制时不进入 `shot.last`；
- 直接回退到一次性 `Page.captureScreenshot`；
- 对超大 viewport 限制最大像素面积；
- 非实时 viewer 场景优先使用 JPEG。

这样可以避免异常页面或超大 viewport 让单个 frame buffer 过大。

## 可立即使用的低风险配置

不改代码时，可以先在插件运行环境中收紧这些参数：

```text
browser.maxContexts = 1
browser.idleTimeoutMs = 60000 或 120000
DSH_HEADLESS_MAX_TABS = 4
DSH_HEADLESS_SHOT_STREAM = 0
DSH_HEADLESS_SHOT_STREAM_KEEPALIVE = 0
DSH_AUTO_POINTER = 0
```

网络抓取调用建议使用：

```json
{
  "storeBodies": false,
  "maxEntries": 100
}
```

### 配置优先级建议

如果目标是先稳定内存，推荐按以下顺序收紧：

1. `browser.maxContexts = 1`；
2. 关闭 screenshot stream；
3. `DSH_HEADLESS_MAX_TABS = 4`；
4. capture 默认不保存 body；
5. 缩短不可见 context 的 idle timeout；
6. 最后再考虑降低 viewport 或截图质量。

## 验证方案

修复后建议用同一组操作做前后对比：

1. 创建并关闭 20 个 headless tab；
2. 循环启动/停止 20 次 capture；
3. 每次 capture 产生 300–1000 条请求；
4. 反复开启/停止 screenshot stream；
5. 每轮记录 Node RSS、Chrome RSS、tab 数量、capture 数量和 frame buffer 数量；
6. 等待 idle timeout，确认 Chrome 进程退出且 driver Map 归零。

应重点观察：

```text
tabs.size
bySession.size
consoleBuffers.size
captures.size
captureByTab.size
owners.size
```

理想结果是：

- 关闭 tab 后这些计数同步下降；
- capture 停止并过期后 entries/body 被释放；
- context 空闲回收后 Chrome 子进程退出；
- 重复测试 20 轮后 RSS 回到接近初始水平，而不是阶梯式上涨。

## 总结

插件侧最重要的减负动作不是单独压缩某个图片，而是：

1. 限制本地 headless context 数量；
2. 让 capture body 默认关闭；
3. 对停止 capture 设置 TTL 或数量上限；
4. 在所有 tab/session/detach 路径统一清理 `bySession`、`consoleBuffers`、`captures` 和 `captureByTab`；
5. 非实时场景关闭 screenshot stream 和 keepalive；
6. 用 RSS、Map 数量和 Chrome 子进程数量做回归验证。

其中第 4 项是插件代码层面最明确的生命周期修复点，应优先实现。
