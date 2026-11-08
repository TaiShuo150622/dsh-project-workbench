# M09 跨专题组合审查 v0.1.0

2026-11-08 · 静态研究审查；构造反例未运行

结论：未发现已核命题直接互相否定；风险主要在专题之间尚未闭合的映射。必须保留“来源声明→证据评估→操作准入”与“责任接管→效果解决”之间的区别。输入文件、SHA 和定位见 [inputs.json](inputs.json)，三条构造轨迹见 [counterexamples.json](counterexamples.json)。

**需要补齐的接口**

1. 首读 FORMAL_MODEL §3、ARCHITECTURE §7 尚未显式接入 W11 的 Assessment。Supported 不能直接改成 S⁺；BOTH、覆盖不完整、政策不适用时，正支持存在仍不释放发布。四态 NEITHER、效果 UNKNOWN、能力 UNSUPPORTED 是不同判断。W11 的事实真值与行动权限仍为 NOT_COMPUTED。coverage 须指明义务/来源域，流结束不等于完整。root 已接受补充评估接口；这不是旧 P3/P5 的反例。
2. M08 保留了终态范围和未解决义务，但最小 envelope 未明确列 handoffId、obligationId、acceptanceKind 关系。R12 的 custody/forward/resolve 应作为接管决定的内容；协议 ACK 只证明其原操作，不得经任务 completed 投影改变原动作 effectState 或清空 claim。
3. 各稿的 q、水位及版本须按实际依赖闭合：q 至少含 consumer/operation/recipients，purpose、resourceScope 不能因另一个表未列而丢失；水位绑定 history/incarnation，跨日志只比较明确关联的切点。观察时间、收到时间、逻辑顺序与期限时钟分别保留。
4. Grant 的主体须带身份命名空间；颁发者、执行者、代表对象、评估者不混用。查询授权不授予提交/结算，历史决定不自动成为当前许可。若要求执行点撤权生效，须取得该强度的权威重检，不能靠旧回执或本地缓存冒充。

**统一核心的最小数据关系**

| 关系 | 必须保留 |
| --- | --- |
| Observation → EvidenceState → Assessment | 原协议/版本/状态与命题键；正反证、来源与 loss；operation、policyVersion、inputWatermark、coverage、disposition |
| Assessment → ConsumptionDecision / Acceptance | 各自的 q、定义/产物/证据版本及实际读取输入；不能把提供方成功或本地 accept 当通用验收 |
| LogicalAction / ActionAttempt → Obligation → BudgetClaim | 原动作及代际、未知效果；budgetId、boundVersion、未结算负担；新 owner 不改掉旧效果身份 |
| HandoffDecision → Obligation.owner | handoffId、义务引用、scopeDigest、水位及尾部规则、recipient/ownerEpoch、接纳类型；不旁路修改效果与预算 |
| Admit / Commit / Settle → 当前主体和 Grant | 分操作核对身份、资源、参数、代际、期限与政策；评估通过只提供其中一类依据 |

以上是关系建议，不是新 schema 或已实现控制器；纯适配不得增强证据，新观察可以改变判断但须保留新来源。

**三个跨层反例（构造，NOT_RUN）**

- **CR01，状态偷换。** MCP 返回 completed+isError；桥接仅按状态名生成“报告合格”的正证，再把工作台本地 accept 当 Accepted。W11 可能忠实保存这条输入，但它并未证明输入命题正确，更未补足 coverage。修复在入口先绑定“协议请求返回”这个原命题，业务判据另评估。
- **CR02，ACK 洗成世界终态。** 原动作仍 unknown，接收者仅承诺 custody；包装交接的 A2A 任务 completed。错误桥接把该 completed 写回原动作 terminal，并释放预算。两端协议各自完成也不能提供 R12 所假设的“排除未来消费”证据；应只更新 owner，保留未知与负担。
- **CR03，旧切点变成当前许可。** h1/n10 的评估及接管 ACK 绑定旧政策和限时 Observe Grant；尾部随后有反证或撤权。新宿主在 h2/n10 仅比较数字相等，复用它执行 Settle。相同序号不证明同一历史或覆盖；Observe 也不授权 Settle。即使旧观察内容仍真实，当前操作仍须独立核对主体、期限、版本与 Grant。

**必须留给宿主与目标端的边界**

真实身份和撤权一致性、可信时钟及延迟界、原始事件覆盖/尾部投递、排除迟到写入的效果证据、幂等/fencing、成本上界与计量、持久预留和跨账本提交，都需要具体宿主/目标契约。核心可以拒绝不满足要求的组合，不能通过字段转换制造这些保证。公开摘要可用于接管，但不能自动证明接收者具备下一操作能力。

**本轮证据限制**

已读 R12 v0.1.1：数值模型 R=0，不证明非零收尾预算；授权性质只覆盖 ObserveAuthoritativeTerminal，Commit/Settle 的 actor/Grant 未表示；HC2 未组合进旧 Lean。C08 的按期接管条件亦不能由该安全模型推出。本轮没有执行模型、适配器或真实操作；机器检查仅核对文件、引用及状态标记。

