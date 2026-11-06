# DeepSeek Harness 插件开发复盘与 AI Coding 流程

> 公开整理版 · 整理日期：2026-11-06 · 源版本：未标版本；2026-10-19文件快照。
> 保留个人通用研究、方法和公开来源；已省略公司案例、项目专属实现、个人身份与会话材料。
> 本次仅整理文本，未重新运行原实验、复测宿主兼容性或更新外部资料；历史结论仍受原研究范围限制。


这份文档记录本次插件内存问题暴露出的工程不足，并把它们转成以后开发时可以重复使用的检查流程。目标不是记住某几个 bug，而是在写第一行代码之前就把资源生命周期、内存预算、错误回滚和观测方式设计好。

## 这次开发暴露出的主要不足

### 1. 没有在功能开发开始前建立内存基线

开发时关注了功能是否可用，但没有先记录以下基线：

- Node 插件进程 RSS、heapUsed、external、arrayBuffers；
- 每个 headless context 对应的 Chrome 进程和内存；
- tab、owner、session、capture、screencast、pending request 的数量；
- 一轮 agent run 结束后仍保留多少内存。

结果是出现内存爆炸后，只能从总进程占用反推原因，无法立即判断是 Chrome、Buffer、网络 body，还是 Map 没有释放。

以后凡是涉及浏览器、文件、网络、缓存、并发任务的功能，都要先定义基线和结束状态。

### 2. 资源的所有权没有统一建模

当前资源分散在多个 Map、Set、timer 和异步任务中。创建 tab 时会同时写入多个状态，但关闭 tab 时不一定走同一套清理逻辑。

这导致了几类典型问题：

- tab 关闭后 `bySession`、console buffer 或 capture 映射仍可能存在；
- owner 没有 tab 后仍留在 `owners`；
- capture stop 后完整 entries 和 body 仍被保留；
- browser 断开后只清理 CDP 连接，没有清理业务状态；
- close 路径没有覆盖所有 timer 和异步任务。

以后每个资源都必须明确写出：

```text
谁创建
谁拥有
谁使用
谁释放
释放失败怎么办
异常退出时谁兜底
```

### 3. 容量检查放在资源创建之后

Tab 数量达到上限时，代码仍可能先创建 Chrome target，再检查是否超限。这样调用虽然返回失败，Chrome 资源却已经产生。

正确顺序应当是：

```text
检查预算 -> 创建资源 -> 注册状态 -> 初始化 -> 对外返回
```

任何一步失败，都必须回滚前面已经创建的资源。

### 4. 初始化过程没有事务式回滚

Tab 注册到 Map 后，如果后续 `Page.enable`、`Runtime.enable` 或视觉追踪初始化失败，可能留下半初始化 tab。

以后初始化代码要采用以下模式：

```js
let target
let session

try {
  checkCapacity()
  target = await createTarget()
  session = await attachTarget(target)
  await enableDomains(session)
  await installTrackers(session)
  registerResource({ target, session })
} catch (error) {
  await safeDetach(session)
  await safeCloseTarget(target)
  cleanupPartialResource(target, session)
  throw error
}
```

只有初始化全部成功后，才把资源放入正式状态表。

### 5. 默认配置偏向功能完整，没有偏向资源安全

多 context、网络 body、实时截图、较大的请求缓存都很方便调试，但组合起来会放大内存占用。

以后默认配置应该优先保证可控：

- 默认只允许 1 个 headless context；
- 默认限制 tab 数量；
- capture 默认不保存 body；
- screenshot stream 默认关闭或自动停止；
- 所有数组、Map、Buffer 和 pending request 都有数量或字节上限；
- 超过上限时降级、丢弃旧数据或返回明确错误。

调试模式可以放宽限制，但必须显式开启，并在日志中记录当前资源预算。

### 6. 没有把长时间运行测试作为验收条件

单次功能测试通过，不代表生命周期正确。此次问题更接近“重复调用若干轮后逐渐上涨”，因此需要固定的 soak test：

```text
创建 context
创建多个 tab
重复 goto/snapshot/screenshot
重复 start/stop capture
重复 start/stop screencast
关闭所有 tab
关闭 context
等待 60 秒
重复 20 轮
```

验收不能只看“调用是否成功”，还要看每轮结束后的 Node RSS、Chrome RSS、Map 数量和残留进程是否回到基线附近。

### 7. 平台和失败路径没有在早期纳入验收

Windows 测试暴露出 bridge 使用 Unix socket、headless Chrome 路径不完整等问题。这类问题如果只在最后测试，会变成阻断性缺陷。

以后在设计阶段就建立平台矩阵：

| 平台 | desktop bridge | headless | native host | 路径/权限 | 退出清理 |
|---|---|---|---|---|---|
| macOS | 必测 | 必测 | 必测 | 必测 | 必测 |
| Windows | 必测 | 必测 | 必测 | 必测 | 必测 |
| Linux | 必测 | 必测 | 必测 | 必测 | 必测 |

### 8. AI 参与写代码时，约束没有前置给出

AI 很容易生成“主流程能跑”的代码，但如果没有明确要求，它通常不会自动补齐：

- 异常回滚；
- timer 和 listener 销毁；
- Map/Set 的上限；
- child process 的退出处理；
- 资源的 owner 和生命周期；
- 长时间运行测试；
- 监控指标。

以后不能只让 AI “实现这个功能”，而要让它先输出资源清单、状态机、失败路径和验收指标，再开始写代码。

## 以后新功能开始前的检查清单

### 需求阶段

- 功能成功条件是什么？
- 失败时必须保持哪些状态不变？
- 是否会创建进程、socket、tab、文件、timer、listener、Buffer 或异步任务？
- 资源的最大数量和最大字节数是多少？
- agent run 结束后，哪些资源必须归零？
- 是否需要跨平台支持？

### 设计阶段

为每个资源建立一张表：

| 资源 | 创建者 | 所有者 | 上限 | 正常释放 | 异常释放 | 监控指标 |
|---|---|---|---:|---|---|---|
| context | router | run/driver | 1 | context close | browser exit | context count/RSS |
| tab | headless driver | context | 4 | tab close | target detach | tab count |
| capture | capture manager | tab/run | 1–2 | capture stop | tab close | entries/body bytes |
| screenshot frame | screencast | tab | 1 | next frame/stop | stream close | frame bytes |
| pending request | host | operation | 64 | response/timeout | disconnect | pending count |
| timer/listener | owning object | owning object | fixed | dispose | process exit | timer/listener count |

设计阶段还要明确这些不变量：

```text
tabs.size === bySession.size
关闭 tab 后该 tab 不存在于任何状态表
关闭 capture 后 body bytes 最终归零
关闭 context 后 Chrome 子进程最终退出
agent run 结束后 pending request 最终归零
```

### 实现阶段

按一个资源一个生命周期来实现：

1. 先写资源创建和上限检查；
2. 再写正常释放；
3. 再写异常回滚；
4. 再接入监控计数器；
5. 最后接入业务主流程。

每个生命周期对象都应提供一个幂等的 `dispose()`。调用两次不会报错，也不会重复释放。

### 验证阶段

至少运行四类测试：

- 正常路径：功能成功；
- 单点失败：每个初始化步骤分别失败，状态能回滚；
- 重复运行：同一操作重复 20–50 轮，内存基线不持续上升；
- 中断退出：tab 关闭、浏览器崩溃、provider 重启、网络断开。

验证时记录：

```text
Node RSS / heapUsed / external / arrayBuffers
Chrome browser/renderer/GPU RSS
contexts / drivers / tabs / owners
captures / capture entries / body bytes
screencast frame bytes / waiters
pending requests / timers / listeners
残留 Chrome PID
```

## 使用 AI coding 时推荐的流程

### 第一步：让 AI 先读代码和规则，不要立即写代码

第一轮只要求它回答：

```text
请先不要改代码。
1. 找出本功能会创建或持有的所有资源。
2. 为每个资源列出创建、使用、正常释放、异常释放路径。
3. 标出所有可能无界增长的 Map、Set、数组、Buffer、timer 和 pending request。
4. 给出容量上限、内存预算和监控指标。
5. 列出需要补充的测试。
```

这一步的产物应该是一份设计和风险清单，而不是代码。

### 第二步：让 AI 先定义验收条件

要求它把验收条件写成可检查的句子，例如：

```text
关闭 tab 后 tabs、bySession、consoleBuffers、captureByTab 均不包含该 tab。
capture stop 后 60 秒内释放完整 body，最多保留摘要。
context close 后 30 秒内没有属于该 context 的 Chrome 子进程。
重复 20 轮后，任务结束基线相对第一轮增加不超过 10%。
```

没有这些句子时，代码很容易只验证“主流程能跑”。

### 第三步：按小切片实现

不要一次让 AI 重写整个 headless 或 bridge 模块。建议按以下顺序：

1. 统一清理函数；
2. 容量检查和回滚；
3. 内存计数器和诊断接口；
4. capture、screenshot、pending 的上限；
5. 业务功能接入。

每完成一个切片就检查 diff、运行测试和查看资源计数，不把多个生命周期改动混在一个大 patch 中。

### 第四步：让 AI 做一次专门的“资源审查”

实现完成后，不要只让 AI 说“代码是否正确”，而要单独发起审查：

```text
请只做资源生命周期审查，不改代码。
逐个检查 process、child process、socket、tab、session、Map、Set、Buffer、timer、listener、async task。
对每个资源回答：创建在哪里，所有者是谁，正常释放在哪里，异常释放在哪里，是否有上限，是否有监控，是否可能在重复调用后增长。
最后按 P0/P1/P2 给出问题和复现步骤。
```

这比一次泛化的 code review 更容易发现内存问题。

### 第五步：让 AI 对照同一份压测数据做优化

每次优化都使用相同 workload，并要求 AI 只根据数据判断：

```text
这是优化前后的 Node RSS、Chrome RSS、对象计数和 retained memory。
请找出增长斜率变化最大的指标，推断最可能的资源类别，并只提出有数据支持的改动。
```

这样可以避免凭感觉改参数，或者为了降低 RSS 而误删必要功能。

## 每次开发结束后的交接记录

每个涉及进程、浏览器或并发的功能，至少记录：

```text
功能名称：
创建了哪些资源：
资源上限：
正常释放路径：
异常释放路径：
监控指标：
固定压测 workload：
优化前峰值：
优化后峰值：
优化前结束基线：
优化后结束基线：
仍存在的风险：
```

这份记录会让下一次开发从“先想生命周期和观测”开始，而不是等内存爆炸后再逆向排查。

## 对本次开发的评价

本次实现的主要不足不是某一行代码写错，而是工程顺序偏向“先把功能跑通，再补稳定性”。对于会创建 Chrome、tab、capture 和异步任务的插件，这个顺序风险较高。

具体表现是：没有先建立内存观测，没有把资源所有权统一起来，没有把失败回滚作为初始化的一部分，也没有把长时间重复运行列为验收条件。AI 在这种约束不足的情况下通常会完成主流程，却不会主动推导出完整的生命周期管理。

以后最重要的改变是把“资源表、预算、不变量、监控、重复压测”放到功能实现之前，并把 AI 分成设计者、实现者和审查者三个角色使用。这样可以把这次发现的模式提前暴露，减少依赖人工在生产环境里观察内存上涨。

## 从零开始一个项目时还应该增加的内容

前面的清单主要解决“代码写出来以后是否稳定”。从零开始时，还需要先把项目的边界、决策和交付方式固定下来，否则后面很容易出现功能越做越多、架构和验收标准不断变化的问题。

### 1. 先写一页项目章程

在建立代码目录之前，先写清楚：

- 项目解决什么问题；
- 明确不解决什么问题；
- 第一版必须完成的最小能力；
- 第一版暂时不做的能力；
- 目标用户和使用场景；
- 支持的平台和运行环境；
- 成功指标和不可接受的失败；
- 第一版的时间、内存、并发和数据保留预算。

第一版应当有一个可以在 1–2 周内完成的最小垂直切片，而不是一开始就实现完整平台。

### 2. 建立架构边界和数据流图

至少画出以下组件及边界：

```text
调用方
  -> provider/router
  -> host/bridge
  -> extension 或 headless driver
  -> Chrome / 页面
  -> 返回结果与日志
```

对每条边界写明：

- 输入和输出格式；
- 超时和取消方式；
- 重试规则；
- 错误码；
- 哪一侧负责清理；
- 哪些数据允许跨边界传输；
- 断开后如何恢复。

涉及重要选择时，写一页 ADR，而不是把决定只留在聊天记录里。至少要记录 bridge 传输方式、desktop/headless 分工、状态存储、日志格式和跨平台策略。

### 3. 先定义接口和错误模型

在写实现之前确定：

- 工具名称和参数；
- 返回结构；
- 错误码和用户可见消息；
- 幂等性；
- 请求 ID、run ID、context ID、tab ID 的关系；
- 超时、取消和重试的语义；
- 版本兼容策略。

例如 `NOT_CONNECTED`、`UNSUPPORTED_BACKEND`、`MAX_TABS`、`TIMEOUT`、`BROWSER_EXITED` 应该是稳定错误码，而不是依赖不同路径生成的任意文本。

### 4. 从第一天加入可观测性

不要等出现故障再加日志。第一版就应包含：

- 结构化日志；
- operation ID 和 run ID；
- 关键生命周期事件；
- Node、Chrome 和逻辑对象内存指标；
- 请求延迟、失败率和重试次数；
- context、tab、capture、pending request 的数量；
- bridge 连接、断开和重连次数。

日志必须有级别和保留策略。默认日志只记录元数据和大小，不记录页面完整 body、cookie、token 或 API key。

### 5. 先设资源预算，再设计并发

不要先允许并发，再观察是否扛得住。先写预算表：

| 资源 | 第一版预算 | 超限策略 |
|---|---:|---|
| headless context | 1 | 拒绝或排队 |
| tabs/context | 4 | 返回稳定错误码 |
| capture body | 8 MB | 丢弃 body、保留摘要 |
| screenshot frame | 8 MB | 降质量或拒绝 |
| pending requests | 64 | 快速失败 |
| console entries/tab | 200 | 丢弃最旧记录 |
| 历史下载记录 | 100 | TTL/淘汰 |

预算应当作为配置和监控指标存在，而不是只写在文档里。

### 6. 先做安全和权限模型

从零项目最容易遗漏的是“谁能调用什么”。第一版就应定义：

- API key、cookie、token 的存储位置和读取权限；
- 日志、错误消息和诊断接口的脱敏规则；
- 哪些工具可以访问页面内容、下载文件或执行脚本；
- native host、bridge 和 extension 之间的信任边界；
- 本地 socket/pipe 的访问权限；
- 调试模式如何开启、谁可以开启、如何关闭；
- 敏感数据的保留时间和清除方式。

### 7. 把平台支持当成架构约束

如果目标包含 macOS、Windows、Linux，就不能先按一个平台实现再最后移植。第一天就要建立平台抽象：

- Chrome 可执行文件发现；
- socket 与 named pipe；
- 进程启动和退出；
- 进程内存统计；
- 路径、权限和临时目录；
- native messaging manifest 安装方式。

每个平台至少需要一个最小 smoke test，覆盖安装、连接、一次工具调用和退出清理。

### 8. 先把仓库和自动检查搭起来

从零项目的第一批提交不应该只有业务代码，还应包含：

- README 和本地启动方式；
- `.env.example`，不提交真实密钥；
- lint、format、typecheck、unit test 命令；
- CI 的最小检查；
- 版本和变更记录规则；
- issue/变更模板；
- 诊断和压测脚本；
- 贡献和发布说明。

这样 AI 后续每次修改都能通过同一套自动检查，而不是依赖人工记忆。

### 9. 先做一个可观测的最小垂直切片

推荐的第一条开发链路是：

```text
一次请求
 -> 一次路由
 -> 一个 context
 -> 一个 tab
 -> 一个最小动作
 -> 一个结果
 -> 完整清理
 -> 诊断指标归零
```

这条链路稳定后，再增加多 tab、capture、截图流、并发和重连。每增加一个资源，就增加对应的上限、监控和释放测试。

### 10. 预先定义升级、回滚和数据迁移

即使是本地插件，也需要明确：

- 配置格式如何升级；
- bridge/host/extension 版本不一致时如何处理；
- 新版本启动失败如何回滚；
- 缓存、日志和临时文件是否兼容；
- 用户如何清理旧进程和旧状态；
- 哪些版本可以互相连接。

这次 Windows bridge 兼容问题说明，安装成功、进程启动和真正连接是三个不同的验收阶段，必须分别测试。

## 从零项目推荐的 AI coding 启动顺序

第一轮让 AI 只产出项目章程、组件边界、资源表、错误模型和测试矩阵。

第二轮让 AI 建立仓库骨架、CI、日志格式、诊断接口和最小 smoke test，不实现复杂业务。

第三轮实现一个完整垂直切片，要求成功路径、失败路径、清理路径和内存指标同时完成。

第四轮让 AI 对照资源表做生命周期审查，对照平台矩阵做兼容性审查，对照错误模型做接口审查。

第五轮使用固定 workload 做重复运行和故障注入，再决定是否增加并发、缓存或功能。

可以直接使用下面这段启动提示词：

```text
这是一个从零开始的项目。请先不要写业务代码。
请先输出：
1. 项目目标、非目标和第一版最小范围；
2. 组件边界与数据流；
3. API/错误模型和版本策略；
4. 进程、Tab、session、Map、Set、Buffer、timer、listener、异步任务的资源表；
5. 每类资源的上限、所有者、正常释放和异常回滚路径；
6. Node、Chrome 和逻辑对象的监控指标；
7. 平台矩阵、安全边界和敏感数据处理规则；
8. smoke test、故障注入和长时间压测方案；
9. 第一版需要建立的仓库、CI、文档和回滚能力。
只有这些内容完整后，再提出最小垂直切片的实现计划。

## 如何让 AI 参考成熟项目或开源项目

参考项目的正确目标是提取经过验证的设计模式、边界和测试方式，而不是复制代码。复制代码往往会把别人的平台假设、资源预算、权限模型和历史兼容负担一起带进来。

### 先按能力和边界找项目

不要只搜索项目名称。先把要解决的能力拆出来，再按能力找参考：

```text
native messaging / bridge
Chrome CDP session lifecycle
headless browser pooling
network capture with body budgets
screencast backpressure
structured operation logging
cross-platform process management
```

每个能力至少找 2–3 个候选项目，记录：

| 项目 | 参考能力 | 可借鉴边界 | 测试证据 | 活跃程度 | 许可证 | 不适用原因 |
|---|---|---|---|---|---|---|
| A | CDP session | detach/cleanup | 测试目录/CI | 最近提交 | MIT | 只支持单进程 |
| B | capture | body budget | 集成测试 | 稳定 | Apache-2.0 | 数据模型不同 |

AI 必须给出具体文件、测试、issue 或提交作为证据，不能只说“这是成熟方案”。如果只是根据印象总结，应明确标成推断。

### 让 AI 做“参考项目拆解”，不要让它直接照搬

可以使用这个提示词：

```text
请比较以下参考项目在 [能力] 上的实现。
只做研究，不改本项目代码。
请输出：
1. 各项目的资源生命周期和错误处理方式；
2. 它们的并发、缓存、超时和内存上限；
3. 测试如何证明这些行为；
4. 哪些设计适合本项目，哪些不适合；
5. 可以借鉴的接口/状态机/测试模式；
6. 许可证和依赖风险；
7. 一个最小 spike，用来验证最关键的假设。
每个结论都要引用具体文件、测试或提交；没有证据的部分标为待验证。
```

研究结果应先进入 ADR 或参考表，经过本项目的约束检查后才转成代码。需要特别检查：运行平台、Chrome 版本、进程模型、数据敏感性、内存预算和许可证是否一致。

### 先做 spike，再决定是否采用

对参考项目中最关键、最不确定的部分，先做一个隔离 spike：

- 验证 bridge 在目标平台能否连接；
- 验证 CDP target detach 后能否完整清理；
- 验证 capture 在 body 上限下的内存曲线；
- 验证多个 context 的 Chrome 进程是否能被正确归属；
- 验证失败重试是否会产生孤儿进程。

spike 只回答一个问题，不与正式业务代码共享状态，也不应该直接成为生产实现。通过后再把结论写进 ADR。

## 功能反推架构，还是架构增加功能

两种方向都需要，但作用不同。

### 第一版以功能和场景反推边界

先从用户任务写出最小能力链路：

```text
一次请求 -> 一次路由 -> 一个 context -> 一个 tab -> 一个动作 -> 一个结果 -> 清理
```

这一步确定的是“必须存在什么”。它能避免一开始为了未来可能的需求设计过大的平台。

### 用非功能要求反推基础架构

再从约束反推必须提前存在的基础能力：

- 需要跨平台，就先抽象进程、路径和 IPC；
- 需要安全，就先确定权限和敏感数据边界；
- 需要低内存，就先有预算、计数器和清理协议；
- 需要并发，就先确定 owner、队列、限流和取消；
- 需要升级，就先确定协议版本和兼容策略；
- 需要排障，就先有 operation ID、结构化日志和诊断接口。

这一步确定的是“为了让功能可靠，哪些基础能力不能推迟”。

### 不要为不确定需求做完整扩展框架

第一版推荐的顺序是：

```text
用户场景
 -> 能力地图
 -> 非功能约束
 -> 最小架构边界
 -> 最小垂直切片
 -> 压测和真实环境验证
 -> 只为已证实的变化点增加扩展点
```

可以提前设计稳定的边界，例如 provider、browser backend、transport、resource manager；不要提前实现还没有实际需求的插件注册系统、通用工作流引擎或多级缓存。

判断一个能力是否值得提前放进架构，可以问三个问题：

1. 没有它，第一版的安全、稳定性或平台支持是否无法成立？
2. 它是否会被两个以上独立功能立即复用？
3. 延后实现是否会导致协议或数据格式无法兼容？

三个问题都答“否”时，通常应该先放到功能需求里，而不是提前做成架构层。

## 哪些内容可以分开并行

并行开发的前提是先锁定少量不可变契约：接口、错误码、事件格式、资源 owner、配置结构和验收指标。共享契约确定后，工作可以按边界拆开。

| 线 | 适合负责的内容 | 依赖 | 不能自行改变 |
|---|---|---|---|
| A：协议与状态机 | router、请求/响应、错误码、版本 | 项目章程 | 不改变平台实现 |
| B：headless backend | Chrome 启动、CDP、context/tab 生命周期 | A 的接口 | 不改变公共协议 |
| C：extension/desktop | background、debugger、capture、screencast | A 的事件格式 | 不改变 driver owner 规则 |
| D：观测与压测 | 内存采样、计数器、诊断 API、soak test | A 的事件和指标 | 不修改业务生命周期 |
| E：平台与发布 | native host、bridge、安装、Windows/macOS/Linux | A 的 transport 契约 | 不改变工具语义 |
| F：文档与 CI | README、ADR、CI、变更记录 | 项目章程 | 不修改实现逻辑 |

其中 D 和 F 通常可以最早并行；B、C、E 可以在 A 的接口锁定后并行；集成、真实环境验证和最终安全审查必须串行。

### 必须串行的事项

以下内容不适合多个 agent 同时自由设计：

- 项目目标和第一版范围；
- 组件边界和数据流；
- 公共 API、错误码和版本策略；
- 资源 owner、清理协议和内存预算；
- 数据安全和权限模型；
- 数据库/配置/协议迁移；
- 集成分支的最终合并和真实环境验证。

这些内容如果没有先锁定，多个 agent 会各自做出合理但互不兼容的局部设计。

### 并行开发的实际规则

每条线使用独立工作树和分支；集成分支只负责合并和验证。任务书的头两行固定写依赖和验证命令：

```text
depends: A-01-contract
verify: npm test -- --runInBand && npm run typecheck
```

每条线只允许修改任务书列出的目录。几条线都需要碰的公共文件，应先做一个小的接入点，后续功能写在各自的新文件里，减少合并冲突。

执行者不自行宣布“通过”；由集成侧运行验证命令。每合并一条线就运行一次集成验证，所有功能完成后还要在真实环境走一次。审查者应与实现者保持不同模型、不同工具或至少不同上下文。

### 当前插件适合的拆分方式

如果把当前插件重新按并行方式开发，我会这样切：

1. 先由主线确定工具协议、错误码、run/context/tab ID 和资源清理协议；
2. headless 线实现 Chrome 生命周期和 CDP；
3. extension 线实现 background、debugger、capture 和 screencast；
4. observability 线实现内存采样、对象计数、诊断接口和固定压测；
5. platform 线实现 bridge、native host、路径、进程和安装；
6. 集成线逐条合并，并在中途就做一次真实连接和退出清理测试。

这样“功能实现”和“观测/验证”可以并行，平台适配也不会阻塞核心状态机，但公共协议和资源生命周期仍由一条主线先锁定。

## 当前项目的下一步路线

当前项目已经具备 provider、bridge、extension、headless、截图、capture 和多种浏览器工具，下一步不适合继续无边界增加工具数量。应该先把现有能力变成一个可长期运行、可诊断、可恢复的系统，再增加高阶功能。

### 第一阶段：先修稳定性和资源生命周期

这一阶段的目标是：一轮 agent run 结束后，插件和 Chrome 都能回到可预测状态。

优先做以下内容：

1. 增加统一的 `ResourceRegistry` 或生命周期管理器，统一登记和释放 context、driver、tab、session、capture、screencast、download、timer、listener 和 pending request。
2. 统一 `cleanupTab`、`cleanupCapture`、`cleanupOwner`、`cleanupContext` 和 `cleanupBrowser`，让显式关闭、异常断开、超时、浏览器崩溃和 provider 重启都走同一套清理路径。
3. 修复 `attachTab` 的容量检查顺序，达到上限时不要先创建 Chrome target。
4. 给 Tab 初始化增加事务式回滚，任何 CDP 初始化失败都要关闭 target、detach session 并撤销已经写入的 Map。
5. 修复 idle timer、owner、downloadByGuid、bySession、console buffer 和 capture 的清理。
6. capture stop 后默认释放 body 和完整 entries，只保留摘要或短 TTL 历史记录。
7. 浏览器或 CDP 断开时清理全部业务状态，并确认 Chrome 子进程最终退出。
8. 为 host pending request、截图帧、console entries 和网络 body 增加数量或字节上限。

这一阶段结束前，不建议增加新的复杂工具。

### 第二阶段：加入可观测性和恢复能力

这一阶段的目标是：出现内存、连接或浏览器异常时，系统能说明发生了什么并自动恢复到安全状态。

需要增加：

- `chrome_memory_stats` 或等价诊断接口；
- Node RSS、heap、external、arrayBuffers；
- Chrome browser/renderer/GPU 进程统计；
- context、tab、owner、capture、stream、pending request 数量；
- `runId`、`contextId`、`tabId`、`operationId` 的统一关联；
- 每个生命周期事件的开始、结束、耗时和内存变化；
- provider、bridge、extension、Chrome 的 health check；
- CDP 断线自动重连和重连上限；
- 浏览器崩溃后的状态重建；
- 操作取消、超时和孤儿任务回收；
- 诊断日志轮转和敏感字段脱敏。

恢复逻辑要有限制：重连次数、重启次数和等待时间都要有上限，避免故障时不断重启 Chrome，反而造成更多进程和内存。

### 第三阶段：补齐插件真正有价值的功能

稳定性完成后，功能上最值得增加的不是更多零散工具，而是以下几类能力。

#### 1. 统一会话和 Tab 管理

增加明确的 session/owner 视图：

- 查看当前 context、owner、Tab 和 Chrome PID；
- 将 Tab 按 owner 或 agent run 分组；
- 显式释放某个 run 的全部资源；
- 处理 Tab 被用户手动关闭、页面崩溃或浏览器重启的情况；
- 支持安全的 session resume，而不是依赖残留的旧 session ID。

#### 2. 资源安全的网络诊断

现有 capture 可以进一步增加：

- URL、域名、资源类型和状态码过滤；
- 只保存摘要或指定响应类型的 body；
- HAR 或结构化导出；
- 单请求和总 capture 的字节预算；
- capture 结束后的自动清理；

#### 3. 可控的截图和实时浏览

截图流应支持：

- 最大 FPS；
- 最大 viewport 像素面积；
- PNG/JPEG 质量；
- 最大帧大小；
- 是否保留最后一帧；
- 无订阅者时自动停止；
- 单次截图和实时流两种明确模式。

这样可以根据 agent 的任务选择低内存模式或高质量模式。

#### 4. 更完整的浏览器状态工具

建议增加统一的只读诊断能力：

- `chrome_status` 返回 context、Tab、连接、PID 和资源计数；
- `chrome_tabs` 返回 owner、session、最后活动时间和状态；
- `chrome_health` 检查 bridge、extension、CDP 和 headless；
- `chrome_cleanup` 按 run、owner、context 或全部资源执行安全清理；
- `chrome_limits` 返回当前并发、内存和缓存预算。

这些工具比继续增加大量页面操作工具更能降低长期运维成本。

#### 5. 下载和文件操作的可控性

下载功能应增加：

- 下载数量和总字节预算；
- 完成、取消、失败状态的 TTL；
- 下载目录隔离；
- 文件名和路径安全检查；
- 中断后的清理；
- 不把完整文件内容长时间保存在内存中。

#### 6. provider 和版本兼容能力

建议在 bridge、host、extension、provider 之间增加：

- 协议版本协商；
- 能力发现；
- 最低兼容版本；
- 不兼容时的明确错误码；
- 安全升级和回滚；
- Windows named pipe 与 macOS/Linux socket 的平台适配层。

### 当前阶段暂时不要增加的功能

以下能力容易扩大复杂度，建议等核心稳定后再做：

- 多级 context 池和自动弹性扩容；
- 任意插件动态加载框架；
- 全量网络 body 长期缓存；
- 无限历史 session；
- 自动化工作流编排器；
- 多 agent 之间复杂的共享浏览器状态；
- 没有明确用例的通用缓存层。

### 建议的当前项目验收门槛

在进入下一轮功能开发前，至少满足：

```text
20 轮固定 workload 后，Node 和 Chrome 的结束基线没有持续上升。
关闭 tab 后 tabs、bySession、consoleBuffers、captureByTab 都归零。
关闭 context 后属于它的 Chrome 进程在 30 秒内退出。
capture stop 后 body bytes 在限定时间内释放。
所有 pending request 都能完成、超时或取消。
bridge 断开后不会无限重连或产生重复 listener。
macOS、Windows、Linux 至少完成安装、连接、一次动作和退出清理 smoke test。
```

达到这些门槛后，再考虑提高并发、打开更多默认功能或增加复杂的 agent 协作能力。
```
