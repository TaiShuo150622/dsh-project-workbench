# Record S1 → 统一 Harness 模型的精化对照

2026-11-08 UTC · R-04 · 冻结产品基线 `7264be10387963f4d575d8688ed8573f4c16c8c4`

Record S1 已经实现一组有价值的**同步内存语义**：严格作用域的普通 PR 合并证据、完成与验收分离、证据撤回、跨任务资源占位、最终派发重检、精确请求去重和确定性重放。它还不是统一 Harness 模型的完整实现。最需要避免的误映射有五项：旧尝试未绑定定义版本、普通命令未携带历史身份、重复观察没有形成 OR 支持、预检查与最终派发不是同一个谓词、首次合并观察默认建立“可用”结果。

本轮从未改动产品源码；只读执行其冻结副本。**20 条选定现有测试通过；8 条新短轨迹复现了 5 个更强映射的反例和 3 个窄域控制行为，断言失败为 0。真实适配器 C01–C16 一条也没有运行。** 这里的反例不等于 S1 违反了自己已经声明的边界，也不代表任意有限轨迹的实现精化证明。

## 1. 输入、证据和复查入口

真实实现位于 china 工作树的 `record/kernel.mjs`，共 387 行。逐字核对该文件、README、夹具和五份现有测试与冻结提交相同；执行后再次核对源文件散列，全部未变。副本保存在 [inputs/record/kernel.mjs](inputs/record/kernel.mjs) 与 [inputs/tests](inputs/tests)，引用行号与原文件一致。

| 材料 | 本轮用途与状态 |
| --- | --- |
| [输入清单](inputs.json) | 每个源路径、冻结提交或工作稿身份、SHA-256、捕获时间；研究工作稿不能只用共同 git HEAD 标识 |
| [结构化精化矩阵](refinement-matrix.json) | 12 个对象映射、C01–C16 全部映射；已实现内存行为、部分实现和 S1 未支持分别标记 |
| [实际短轨迹](TRACES.md) / [原始 JSON](probes.json) | 五项过强映射反例、三个控制；打印实际命令和观察结果 |
| [执行回执](execution_receipt.json) | 命令参数、Node 版本、开始/结束时间、退出码、输出与源码散列、20 条选定测试计数 |
| [现有测试原始输出](existing-tests.stdout.txt) | 只选与撤回、绑定、准入、未知效果、回放有关的 20 项；未运行全项目测试 |
| [探针源码](refinement-probes.mjs) | 只调用冻结内核与原测试夹具，不提供网络或持久存储替身 |

规格读取了 integration 的 FORMAL_MODEL、ARCHITECTURE、适配契约讨论稿以及 mechanisms 的 conformance/catalog.json，均保留内容快照。初次 FORMAL 快照用 `Usable(t,p,κ,n)`；收到总稿更新后另保存 [消费请求 q 版本](inputs/specifications/FORMAL_MODEL-q-update.md)，本报告使用 `Usable_L(t,q,n)`，`q=(consumer, operation, recipients)`。这次规范化不为 S1 补上任何新能力。

## 2. 可以成立的窄映射

| 统一模型对象或事件 | S1 实际实现与定位 | 能保留什么；不能扩张到哪里 |
| --- | --- | --- |
| TaskDefinition | `spec()` 34–41；创建 140–169；修订 219–228 | 固定仓库/PR/目标分支/source SHA/普通 merge；不是任意研究、交付、部署任务协议 |
| ObservationAccepted / CompletionWitness | `evidence()` 49–60；`complete()` 73–88；`verifyCompletion` 230–234 | 校验合成输入的形状、作用域和父提交关系；调用者必须另外认证 verifier 并核实真实 GitHub 状态 |
| Recorded / Supported | 日志和 completions 保留声明；`currentCompletion()` 47；`dependency()` 342–348 | `historical-completion` 实际近似 Supported，撤回后为 false；不能把它读成“历史上曾记录过完成” |
| WitnessWithdrawn | `withdrawCompletion` 236–250 | 使当前完成失效、保留旧验收；匹配的 succeeded 动作恢复 unknown。没有通用支持图传播 |
| Reserve | `actionDecision()` 90–101；`reserveAction` 282–291 | 同一实例中检查并建立资源占位；冲突键为 `(repositoryId,targetRef)`，不依赖仅任务级 revision 来防跨任务竞争 |
| DispatchIntent | `dispatchAction` 293–304 | 再查当前 task/授权/规格/其他未决动作，然后把状态改成 sent；**没有真实发送调用或持久出站队列** |
| Cancel / unknown / terminal proof | `cancel` 205–209；`resolveAction` 306–325 | 已发动作不因任务取消而释放；not_applied 要求两个真值及 reference；这些值是可信模拟输入，不是内核观察到进程终止 |
| AcceptanceGiven | `tokenFor()` 62–71；`acceptResult` 269–280 | 绑定 stream/task/spec/completion/result/availability/acceptance 写入版本；备注不影响该向量 |
| 原子接纳与重放 | `apply()` 116–135；`replay()` 360–368 | 正常同步调用与校验失败的内存事务边界；给定完整日志可重放。没有崩溃持久性或外部效果事务 |

`apply()` 先复制状态，在 draft 上完成校验和变更，之后同步发布 state、event、receipt。RF06 特意选了一条**已经修改 draft 动作状态、随后完成证据冲突才抛错**的路径：原动作仍是 sent，快照和日志不变，重复失败请求仍失败。这比仅在入口形状校验时报错更能检验本地回滚边界，但仍不包含进程在发布三项之间崩溃的模型。

P7 的局部准入条件可以映射到一个实例；不能因此写成“任意时刻 active ≤ 1”。现有 R2-S01 测试实际建立了 A unknown 与 B reserved 共存，拒绝 B 的派发且保持其原预留，终态证明到达后 B 才能继续。这与统一模型的限定一致。若两个 RecordKernel 分别管理同一目标，没有共同资源权威或持久事务，本轮的局部串行化结论不能跨实例使用。

## 3. 五个实际轨迹揭示的映射差异

### RF01：旧 Attempt 可进入新规格

轨迹：在规格 v1 开始 A1 → 用户修订到 v2 → 另一 actor 开始 A2 → A1 持有者使用最新 task revision 预留并派发。

结果：派发成功；action 同时记录 `attemptId=A1` 和 `specVersion=2`。`beginAttempt` 183–188 只保存 id/host/sessionId/actorId；`reserveAction` 284–290 检查 actorId 并复制**当前任务**规格，没有 A1 的原始规格版本可比较。

这不说明未经用户授权扩大了任务：轨迹中 v2 已由用户显式授权。它否定的是“旧尝试自身已绑定 v1，而且 A2 出现就自动退休 A1 权限”的映射。现有 S1 没有当前尝试指针、host/environment generation 或执行者权限代际。适配器必须另行维护这些关联；同时不能因此丢弃 A1 已发动作的迟到真实证据。

### RF02：普通命令的历史身份依赖路由

轨迹：两个独立 history 各创建一次任务，sourceId 不同而本地 ID 同为 `task:1`、revision 同为 1 → 将旧 history 的原封不动 cancel 命令送进新 kernel。

结果：新任务被取消，旧任务仍 open。`apply()` 118 的 envelope 没有 streamId；task 查找与 revision 校验只作用于接收该调用的实例。相反，同一探针的控制轨迹证明跨 history 的 acceptance token 被 `ACCEPTANCE_CONFLICT` 拒绝。

所以普通命令的 `(historyId,taskId)` 绑定是未来适配器的责任，不能从 token 的防串历史能力外推到所有命令。路由器可在外层绑定并认证历史，未必必须改内核字段；但必须存在可核查的拒绝错误路由机制。主体也需由认证层规范化：当前 attempt/action 只比较平面 actorId，没有 `(authority,subject)` 命名空间。

### RF03：重复观察留在日志，但不是替代支持

轨迹：用两个不同 observationRef 提交同一 merge 结果 → 撤回当前完成。

结果：日志保留两次 verifyCompletion，task 只有一个 completion，仍引用第一次 evidence；`complete()` 84 在结果相同时返回旧 completion。撤回这个 completion 后 Supported 为 false。探针仅把第二条观察设为合成的候选替代来源，没有证明两个真实观察者独立。

这说明 S1 不能忠实表达 `w1 ∨ w2`，更不能借用 P5 的局部重算定理宣称已经实现 AND/OR 支持撤回。它不是在一个已建模的 OR 图上算错了，而是尚未建立那个图。C03/C04 对 S1 应标为未支持；relatedTaskId 不是证据支持边。

### RF04：checkAction 不是已有预留的 dispatch guard

轨迹：预留动作 A → 调用 `checkAction(task)` → 调用 `dispatchAction(A)`。

结果：前者返回 `wait/action-unresolved`，指向自己的 A；后者成功改成 sent。`actionDecision()` 97 查任意 active action；`dispatchAction` 302 明确排除自身。

两个接口服务不同阶段。把 checkAction 包装成“已有 reservation 的发送前必须 allow”会使合法动作被自己的预留阻塞。适配器应把它映射为新动作预检查；真正发送前的权威转移必须调用 dispatchAction，并明确这仍只是发送意图准入。返回历史 dispatch receipt 也不能被包装器解释成一次新的发送授权。

### RF05：首次 available=true 没有独立可用性观察

轨迹：只提交文档规定的历史普通合并证据，没有独立访问、产物副本或消费检查 → 查询 current-result。

结果：`complete()` 80 初始化 `available:true`，current-result 为 true。输入没有 observedAt、principal、operation、recipients、访问状态或独立 availability evidence。随后接受全局不可用标记，再重复历史合并观察，current-result 仍 false；这一已知失效保护有效。

因此 S1 的精确含义是“当前完成证据有效，且绑定结果尚未被接纳为不可用”。它不能单独推出 `Usable_L(t,q,n)`，更不能推出此刻世界中的 `Usable_W`。结果本体、某个副本的存在、特定消费请求的允许与适用性都没有分别建模。若未来展示“可下载”“可供某人使用”，必须另有匹配 q 的观察与政策，而不是直接换一个 UI 标签。

## 4. 验收向量的有效映射条件

现有七字段 token 已经挡住陈旧结果按钮、不同 history、不同 task、错误完成修正、availability 修订以及竞争性接纳。source SHA 与 merge SHA 固定在结果指纹中，因此在这个窄任务域里可把不可变产物版本视为 resultId 的内涵，无须仅为字段数量机械增加 artifactVersion。

但以下条件必须明示：

- `acceptanceRevision` 是接纳命令的乐观并发版本。`acceptResult` 把当时的值写入 accepted，然后使 task.acceptanceRevision 加 1；`dependency('current-acceptance')` 不把旧 accepted 的该值与新值比较。直接将它解释成“有效验收必须等于当前 decisionRevision”会让刚提交的验收马上失效。要分别映射写入竞争控制与已存决定适用性。
- 当前 read predicate 为 `有效 completion ∧ result.available ∧ 存在匹配 completionId/resultId/availabilityRevision 的 acceptance`。它没有独立的 q、政策版本、时钟、新鲜度、验收撤回和主体权限变更输入。接受时的角色限制不能证明后来每种消费语境仍被允许。
- 在固定代码、固定政策及可信调用者的 S1 域内，缺少可变政策字段不自动构成漏洞；把 S1 规则扩展到新业务后，旧短向量不再自动充分。
- 完成任务不可原地 revise，C01 要使用目录已允许的“显式 successor”变体。RF07 核实原地修改被拒绝、新任务不继承验收；新任务 specVersion 从 1 开始，不能把它误报成原 task 的 v2。

## 5. C01–C16 的适用范围

| 场景 | S1 现状 | 必须补足或避免的误判 |
| --- | --- | --- |
| C01 / C02 | 相关版本保护、显式新任务、无关备注保护在内存中成立 | C01 不能默认原地修改 completed；完整规则读取集合仍限于固定 S1 |
| C03 / C04 | 未支持 | 没有 AND/OR 支持模型与支持循环准入，不能把未知命令被拒绝算作循环检查通过 |
| C05 | 局部机制已实现 | 精确重检已由 R2-S01 执行；实际出站覆盖、共同权威域和存储事务未实现 |
| C06 / C09 | 有未决动作和迟到证据的模拟语义 | 没有目标故障注入或认证读回；cancel 不自动把 sent 改成 unknown，更不会变 not_applied |
| C07 / C08 | 无目标 fencing / 目标幂等 | 本地 authorizationRevision 与 requestId 去重不是目标端保证 |
| C10 / C11 | 有固定 spec 和角色规则；文本不直接授权 | 无认证、最终工具参数拦截、当前政策服务或上下文恢复机制 |
| C12 / C13 | 未支持 | 没有费用账本、预留成本、时钟、expiry 或 freshness；P13 一般证明没有证明 S1 |
| C14 | 已知全局结果失效能传播 | 默认可用不等于独立可用性读回；没有按 q 的消费判断与副本模型 |
| C15 | 内存回滚、精确重试、完整日志重放可用 | 无持久 ACK、崩溃恢复存储、日志认证；旧回执始终只是历史回执 |
| C16 | 尝试 ID 和迟到动作归属部分存在 | 没有尝试规格/代际、当前尝试权限与普通命令的跨 history 自校验 |

[矩阵](refinement-matrix.json) 对每条场景分别记录函数行号、已有测试是实际选跑还是只读审查、探针 ID 和下一条精化义务。所有 `real_adapter_scenario_status` 都保持 `NOT_RUN`；这些本地结果不更改原 catalog，也没有给任何真实宿主发合格证。

## 6. 下一步应冻结的最小义务

后续产品切片应先把解释清楚的边界变成适配契约：

1. **历史与主体入口**：认证后的 `(historyId, authority, subject)` 如何绑定到一个内核、一个 task/attempt；给出跨历史碰撞的拒绝轨迹。
2. **尝试与动作分离**：创建尝试时绑定的 spec/环境/权限代际，以及新尝试出现后旧尝试还能做什么。保留旧效果证据通道，不能用退休写权限抹掉物理效果。
3. **持久接纳与真实发送**：指出冲突扫描与占位的事务点、ACK 级别、发送器使用哪条持久 intent，以及响应丢失后的目标对账；task revision CAS 单独不足以串行化共享资源。
4. **完成、结果和消费**：保留 S1 当前已知全局失效的语义；另建有来源的副本/消费观察。UI 在缺少观察时显示缺口，不将 available 的默认值当作现时读回。
5. **支持与验收规则**：只有实现完整 AND/OR 输入和明确政策之后，才将 P4/P5 的一般证明精化到实现；同理，没有费用账本不能沿用 P13 的已证明结论。

这些是下一轮需要证明的映射义务，本轮没有实施产品改造、接入宿主、认证来源、合并 PR 或发布内容。
