# DeepSeek Harness 下一步执行路线与智能体团队分工

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标

把现有插件从“功能基本可用”推进到：

- 长时间运行后内存可控；
- Tab、context、capture、截图流和 pending request 可以完整回收；
- Chrome、bridge、extension 和 provider 断开后能够恢复或明确失败；
- 有可持续运行的内存监控、诊断接口和压测；
- 可以让多个智能体并行开发，而不会破坏公共协议和生命周期；
- macOS、Windows、Linux 都有明确的安装、连接和退出清理验证。

## 总体原则

1. 先修生命周期和可观测性，再增加高阶功能。
2. 公共协议、错误码、资源 owner 和清理规则必须先锁定。
3. 每条执行线使用独立工作树和分支，集成分支只负责合并与验证。
4. 一个智能体只负责一条清晰的工作线，不能同时修改多个边界不清的模块。
5. 智能体不自行宣布通过，最终验证由协调者在集成环境执行。
6. 功能、观测、平台适配和文档可以并行；公共协议、集成、真实环境测试和发布必须串行。

## 优先级路线

### P0：生命周期和内存安全

目标：重复执行 20 轮固定 workload 后，Node 和 Chrome 的结束内存基线不持续上升。

任务：

1. 统一 context、driver、tab、session、owner、capture、screencast、download、timer、listener 和 pending request 的生命周期。
2. 增加幂等的 `cleanupTab`、`cleanupCapture`、`cleanupOwner`、`cleanupContext` 和 `cleanupBrowser`。
3. 修复 Tab 容量检查顺序，达到上限时不得先创建 Chrome target。
4. 给 Tab/CDP 初始化增加事务式失败回滚。
5. 修复 idle timer、owner、`bySession`、console buffer、`downloadByGuid` 和 capture 的清理。
6. capture stop 后释放完整 body 和 entries，只保留摘要或短 TTL 历史记录。
7. 浏览器/CDP 断开时清理全部业务状态，并确认 Chrome 子进程最终退出。
8. 给 pending request、截图帧、console entries 和 network body 增加数量或字节上限。

### P1：观测、诊断和恢复

目标：任何内存上涨、连接断开或浏览器崩溃，都能定位到具体 run、context、tab 和资源类型。

任务：

1. 增加 Node RSS、heap、external、arrayBuffers 采样。
2. 增加 Chrome browser、renderer、GPU 进程统计。
3. 增加 context、driver、owner、tab、capture、stream、pending request 计数。
4. 统一 `runId`、`operationId`、`contextId`、`tabId` 的关联。
5. 增加 `chrome_memory_stats`、`chrome_health`、`chrome_limits` 和 `chrome_cleanup` 诊断能力。
6. 增加操作超时、取消、CDP 断线重连和浏览器崩溃恢复。
7. 为重连、重启和重试设置上限，避免故障时无限重启 Chrome。
8. 增加结构化日志、日志轮转和敏感字段脱敏。

### P1：平台和发布可靠性

目标：安装成功、连接成功、工具调用成功和退出清理分别可验证。

任务：

1. 抽象 macOS/Linux socket 与 Windows named pipe。
2. 统一 Chrome 可执行文件发现和配置优先级。
3. 检查 native host manifest、路径、权限和进程启动方式。
4. 增加 bridge、host、extension、provider 的协议版本协商。
5. 增加 macOS、Windows、Linux 的安装、连接、一次调用和退出 smoke test。
6. 定义版本不兼容、升级失败和回滚时的稳定错误码。

### P2：稳定性之后的功能增强

目标：增加真正降低运维成本和提升 agent 使用效率的功能。

任务：

1. 统一 session、owner 和 Tab 管理，支持按 run/owner/context 清理。
2. 增加安全的 session resume，处理用户手动关 Tab、页面崩溃和浏览器重启。
3. 增加网络 capture 的 URL、域名、资源类型和状态码过滤。
4. 增加 capture body 白名单、HAR/结构化导出和总字节预算。
5. 增加截图流最大 FPS、最大像素面积、JPEG 质量、最大帧大小和无订阅者自动停止。
6. 增加下载数量、总大小、TTL、目录隔离和中断清理。
7. 增加统一浏览器健康状态和资源预算展示。

以下功能暂不排入第一轮：多级 context 自动扩容、无限历史 session、全量 network body 长期缓存、通用工作流编排器和复杂的多 agent 共享浏览器状态。

## 智能体团队分工

### 主协调者 / 架构与集成线

职责：

- 维护项目章程、架构边界和 ADR；
- 先锁定公共 API、错误码、ID 体系和资源 owner；
- 维护资源生命周期表和内存预算；
- 分配任务、检查依赖、管理集成分支；
- 运行最终验证和真实环境测试；
- 处理跨线冲突和公共文件改动；
- 维护决策记录和风险清单。

不负责一次性重写所有模块。主协调者主要负责契约、集成和验收。

### 智能体 A：Headless / CDP 生命周期

负责：

- Chrome 启动、连接、退出和异常退出；
- context、driver、tab、session、owner 生命周期；
- Tab 容量检查和初始化回滚；
- CDP target detach、browser disconnect 和孤儿进程处理；
- idle timer 和 browser close 清理。

建议修改范围：

```text
src/headless*.js
src/contexts*.js
src/lease*.js
```

不负责：

- 公共工具协议；
- extension background 业务；
- 日志格式的大范围修改；
- 未经协调者确认的配置格式变化。

验收：

- Tab 达到上限时不创建额外 target；
- Tab 初始化任一步失败后状态完全回滚；
- 关闭 Tab 后 `tabs`、`bySession`、console 和 capture 映射不残留；
- context 关闭后 Chrome 子进程退出；
- 浏览器异常退出后 driver 状态归零或明确标记为 dead。

### 智能体 B：Extension / Capture / Screencast

负责：

- background debugger session 生命周期；
- console、network capture 和 body task 清理；
- frame registry、screencast stream 和 waiter 清理；
- capture body、entries、截图帧的上限；
- 页面关闭、扩展 reload、provider 断开时的回收。

建议修改范围：

```text
extension/background.js
extension/console-hook.js
extension/overlay.js
src/headless-events.js
src/headless-screenshot.js
src/tools-screencast.js
```

不负责：

- Chrome 进程启动；
- bridge 传输协议；
- 公共错误码的重新命名。

验收：

- capture stop 后 body bytes 和 entries 在 TTL 内释放；
- screenshot stream 停止后 frame、waiter、timer 都清理；
- console entries 有硬上限；
- 扩展 reload 或 Tab 被手动关闭后无孤儿 debugger session；
- 默认不记录 cookie、Authorization、API key 和完整敏感 body。

### 智能体 C：Observability / Benchmark / QA

负责：

- Node 和 Chrome 内存采样；
- 逻辑对象计数器；
- `chrome_memory_stats`、`chrome_health` 和诊断输出；
- 固定 workload 和 20 轮 soak test；
- 失败注入：超时、断线、Tab 关闭、Chrome 崩溃、provider 重启；
- 优化前后数据比较。

建议修改范围：

```text
diagnostics/
benchmarks/
tests/soak/
src/diagnostics*.js
```

如果仓库没有这些目录，优先新建目录，避免和业务线争抢核心文件。

不负责：

- 为了让指标通过而修改业务生命周期；
- 删除失败测试；
- 只验证文件存在、不验证实际行为。

验收：

- 能按 run/context/tab 输出内存和对象指标；
- 20 轮 workload 有可比较的峰值和结束基线；
- 能检测 Map 数量不一致、孤儿 Chrome PID 和 pending request 泄漏；
- 监控本身的 CPU 和内存开销可接受。

### 智能体 D：Platform / Bridge / Release

负责：

- bridge socket/named pipe 平台抽象；
- native messaging host；
- Chrome 可执行文件发现；
- 安装、升级、回滚和版本协商；
- macOS、Windows、Linux smoke test；
- 发布包和运行时诊断说明。

建议修改范围：

```text
src/bridge*.js
host/
packaging/
platform/
tests/platform/
```

不负责：

- 改变工具的业务语义；
- 直接修改 headless 核心状态机；
- 在没有记录 ADR 的情况下改变协议。

验收：

- 安装、发现、连接、一次工具调用和退出清理分别有测试；
- Windows 不使用 Unix socket 文件路径；
- 版本不匹配时有稳定错误码；
- 失败重试不会无限产生 host 或 Chrome 进程。

### 文档、CI 和审查角色

文档和 CI 可以由主协调者或独立智能体承担，职责包括：

- README、架构图、ADR 和运行手册；
- `.env.example` 和敏感数据规则；
- lint、typecheck、unit test、soak test 和平台 smoke test；
- 变更记录、版本兼容和回滚说明；
- 对已完成代码做独立的资源生命周期审查。

审查者不应与实现者使用完全相同的上下文来宣布通过。至少要使用不同的提示词和独立检查清单。

## 并行和依赖关系

推荐的依赖图：

```text
项目章程 / 公共协议 / 资源表
            |
      +-----+-----+
      |     |     |
   Headless Extension Observability
      |     |     |
      +-----+-----+
            |
      Platform integration
            |
   真实环境和发布验证
```

具体顺序：

1. 主协调者先锁定协议、错误码、ID、资源 owner、清理协议和预算。
2. Headless、Extension 和 Observability 可以并行启动。
3. Platform 线在 transport 和版本协议确定后启动，避免反复返工。
4. 每条线完成后由协调者运行验证，不以执行者自报为准。
5. 合并顺序建议是 Headless → Extension → Observability → Platform → 集成修复。
6. 全部合并后运行 20 轮 soak test，再做真实平台 smoke test。

如果当前只有四个并行槽位，建议采用“主协调者 + 三条执行线”：

- 执行线 1：Headless；
- 执行线 2：Extension；
- 执行线 3：Observability；
- Platform 线在前面三条完成公共契约后再启动，或由主协调者与发布工作合并处理。

## 每条任务卡必须包含的内容

```text
任务名称：
depends: 依赖的任务编号，或 none
verify: 可执行的验证命令
允许修改的目录：
禁止修改的目录：
资源边界：
输入契约：
输出契约：
成功条件：
失败条件：
需要留档的指标：
卡住时的处理方式：
```

任务卡必须说明“只能修改哪些目录”。公共文件如果确实需要修改，要由主协调者安排一个单独的接入任务，避免多条线同时编辑同一个文件。

## 第一轮建议任务清单

### A-01：锁定公共契约

产出：工具协议、错误码、ID 体系、资源 owner、清理协议、内存预算。

依赖：none。

验证：所有执行线可以根据文档确定输入、输出和失败语义，不需要自行发明公共结构。

### A-02：建立生命周期清单

产出：context、driver、tab、session、capture、screencast、download、timer、listener、pending request 资源表。

依赖：A-01。

验证：每个资源都有创建者、所有者、上限、正常释放和异常释放路径。

### B-01：修复 Headless Tab 回滚

产出：容量检查前置、初始化事务回滚、统一 Tab 清理。

依赖：A-01、A-02。

验证：Tab 超限、CDP 初始化失败、target detach 和浏览器退出都不会留下孤儿状态。

### C-01：修复 Capture/Screencast 回收

产出：body/entries/frame/waiter/timer 的上限和清理。

依赖：A-01、A-02。

验证：重复 start/stop 20 轮后 capture 和 stream 指标回到基线附近。

### D-01：建立内存监控和固定压测

产出：Node/Chrome 采样、对象计数、诊断输出、20 轮 workload。

依赖：A-01、A-02。

验证：能生成优化前基线，识别 Node heap、Buffer、Chrome RSS 和逻辑 Map 的增长。

### E-01：平台 bridge smoke test

产出：macOS、Windows、Linux 的安装、连接、动作和退出清理测试。

依赖：A-01。

验证：每个平台能区分安装失败、连接失败、工具失败和退出清理失败。

## Definition of Done

一条线只有同时满足以下条件，才算完成：

- 任务范围内的代码和测试已完成；
- 只修改了任务卡允许的目录；
- 验证命令由协调者执行并通过；
- 正常路径、失败路径和清理路径都有验证；
- 相关资源指标没有持续增长；
- 没有引入未记录的公共协议变化；
- 文档、日志和风险记录已更新；
- 已说明哪些内容只在离线环境验证，哪些内容已在真实平台验证。

## 推荐的下一步

现在先执行 A-01、A-02 和 D-01 的设计与基线工作，再开始修改 Headless 和 Extension。这样后面的每个修复都有统一的接口、资源表和内存数据作为依据。
