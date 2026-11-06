# 真宿主探针

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


写契约前做的实测，契约里的限制都从这里来。复现：`node probe/run.mjs`、`node probe/escape-check.mjs`。

环境：Apple M1，16GB，Chrome 156 无头走 Metal。宿主是桌面版自带的 CLI，0.2.1-rc.3，网页模式，隔离的 `DSH_HOME`，会话是现建的夹具，不调模型。**没有在桌面窗口里跑过。**

## 能接上

| 项 | 结果 |
|---|---|
| 第三方插件注册 `panel.json` 后缀 | 通，点开时正文收到完整字节，优先于内置代码预览 |
| `sidebarRight.openResource` 打开工作区里的文件 | 通 |
| 宿主响应头 CSP | 网页模式没有，所以 iframe 不继承额外限制 |
| 不调模型建夹具会话 | 通，`workspaceRegistry.create` + `sessionController.create` |

## 沙箱能力

| 项 | 不加 CSP | 加契约的 CSP |
|---|---|---|
| WebGL2 | 有 | 有 |
| blob Worker | 有 | 有 |
| WebAssembly | 有 | 有 |
| fetch 外网 | **通** | 拦住 |
| fetch 本机宿主 | **通** | 拦住 |
| 外部图片、外部脚本 | **能加载** | 拦住 |
| localStorage、indexedDB、SharedArrayBuffer | 没有 | 没有 |
| 碰父页面 | 不能 | 不能 |

WebGPU：这轮 `requestAdapter()` 返回了适配器，之前的上限测试记的是没有，两次不一致，不进契约。

## CSP 之外

| 通道 | 结果 |
|---|---|
| WebRTC | **能打通**，拿到外部 STUN 返回的 `srflx` 候选 |
| 页面跳转自己 | **能跳**，`load` 触发第二次，可作为检测信号 |
| 弹窗 | 被 sandbox 拦住 |

结论写在契约第 7 节：第二级首次运行要人点，跳转立刻拆 iframe。

## 读文件

| 路径 | 第一轮（随机数据） | 第二轮（规律数据） |
|---|---|---|
| `readBytes` 整读 31 MiB | 1156 ms | 477 ms |
| `readBytes` 超 32 MiB | `workspace-file/too-large` | 同左 |
| `readBytes` 按 2 MiB 窗口读 64 MiB | 1896 ms | 4210 ms |
| 插件接口，`no-transform`，512 MiB | 1193 ms | 2461 ms |
| 插件接口，不写 `no-transform`，512 MiB | 15635 ms | 6177 ms |

两轮之间机器负载不同，只看同一轮内的比例。压缩是最大的单一损失。

`fetch` 响应体约 16 KiB 一段，512 MiB 拆成 32770 段，转发前要攒块。

## 帧率

100 万个 WebGL 点，1000×800 画布：

| 负载 | DSH 右栏 | 空页面 |
|---|---|---|
| 机器空闲 | 60 帧 | 60 帧 |
| 机器忙 | 29 帧 | 31 帧 |

4 个 iframe 各 100 万点同屏：每个约 10 帧。

## 内存

这轮没量准。无头 Chrome 总 RSS 在 540 到 1040 MB 之间跳，主要是页面 GC，增量是负数的时候也有。P-14 用固定序列重测，不用这里的数。

## 还没验

- 桌面窗口：Electron 44 的 WebGL、CSP、WebRTC、跳转行为。M2 由人走一遍。
- `conversation.input.for` 要保活的 Session 作用域，从标签正文怎么拿到，P-11 查实。
- 终端：`tuiPanels` 里的真实显示。
