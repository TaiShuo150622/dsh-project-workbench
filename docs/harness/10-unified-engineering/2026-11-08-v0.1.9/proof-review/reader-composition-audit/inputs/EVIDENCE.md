# 证据与结论状态

本轮最明确的成果是把不同保证的对象拆开，并为若干条件命题提供可复核证明和反例。**模型正确、源码路径可达、真实环境运行成功和用户任务完成是四种不同证据。** 下表只在对应范围内使用“通过”。

## 已实际执行的核查

| 编号 | 对象 | 执行结果 | 入口与限制 |
| --- | --- | --- | --- |
| E01 | 有限 DAG 的局部重算 | Lean 4.35.0 编译，一般定理及非空例子通过；不同模型线独立编译和改变读取集的实例 | [证明说明](dag-proof/README.md)、[独立审查](proof-review/general-proof-audit/REVIEW.md)。对任意有限节点前缀，要求确定性、完整依赖、合法拓扑、旧状态一致和完整影响闭包；不证明提取器或性能 |
| E02 | 保守预算上界 | 任意有限合法转移链的 Lean 证明编译；独立非零消费实例通过 | [预算说明](china/budget-proof/README.md)、[独立审查](proof-review/general-proof-audit/REVIEW.md)。真实消费必须被上界覆盖；数值释放凭据没有自动证明主体/动作身份或实际终止 |
| E03 | 准入、支持撤回、预算、验收 | Python 有限模型实际穷尽检查；削弱变体给出反例；root 及审查线复跑 | [范围与计数](china/bounded-models/README.md)、[语义审查](proof-review/model-audit/REVIEW.md)。支持公式的原算法与 oracle 共享解释函数，后加不同表达的核查及变异说明此边界 |
| E04 | 目标效果与迟到提交 | EffectContract 八配置、ExpiryContract 三配置已运行 | [TLA+ 入口](formal-spec/README.md)。一个逻辑意图，固定有限发送/代际/时间域，目标原子假设；没有任意并发或真实目标结论 |
| E05 | 持久接纳与 sent | DurableRelay 三配置：9 步丢失接纳记录反例、52 状态完整安全检查、4 步全局错误不等于目标缺失反例；不同模型线独立复跑 | [模型](formal-spec/RELAY_README.md)、[独立审查](proof-review/relay-durability-audit/REVIEW.md)。worker→lead、目标未提交、崩溃前无补救、sent 可恢复等条件；未在真实宿主复现 |
| E06 | Record S1 固定实现映射 | 20 条选定既有测试通过；8 个派生探针，5 项映射差异、3 个控制 | [修正版报告](china/record-refinement/REPORT-v0.1.1.md)、[独立审查](proof-review/record-mapping-audit/REVIEW.md)。使用合成角色/观察；入口认证、存储和实际外部效果不在这些测试内 |
| E07 | 运行器错误接受检查 | Expiry runner 首版只看退出码的缺口已修正；改查 Init 的负对照被拒绝；Relay runner 同类独立负对照也被拒绝 | [Expiry 修正](proof-review/expiry-contract-audit/REPAIR_REVIEW.md)、[Relay 审查](proof-review/relay-durability-audit/REVIEW.md)。只覆盖冻结工具格式与这类替换，不证明能识别任意坏日志 |
| E08 | 工作台方法的条件代码探针 | 固定 Native/Projects 源码副本配可控模拟接口；5 个探针、22 个断言通过 | [探针说明](mechanisms/relay-code-probes/README.md)。仅验证实际方法在声明 fake 条件下的控制流，未执行真实 DSH、磁盘、网络或进程崩溃 |
| E09 | 自主推进、终止、期限与责任接纳 | 21 个有限图：162 状态、239 显式边、11 公平反例、6 错误前缀；独立 SCC oracle 与最短见证核查，另 1,200 个随机图一致 | [条件稿](china/progress-conditions/自主推进与终止条件讨论稿-v0.1.0.md)、[独立审查](proof-review/progress-audit/REVIEW.md)。公平性按事件标签与完整图可用性定义，Halt 仅补齐终止行为；一般 L1–L4 没有新 Lean 证明，无实际长期任务或真实期限保证 |
| E10 | 争议证据与修正 | 原四态模型及定向检查复现；独立事件集 oracle 核对 5040 混合排列、70560 前缀键投影、20736 资格赋值与 4032 异键对 | [提案](west/evidence-disputes/Record证据争议与修正讨论稿-v0.1.0.md)、[独立审查](proof-review/evidence-dispute-audit/REVIEW.md)。这些范围不相加为覆盖率；无真实 ACL/coverage 测量，四态不判断世界真值，操作权限未计算 |
| E11 | 接管与未结算负担连续性 | 原 5 配置、5076 状态、14172 边及 8 条原失败轨迹最短长度由另一研究线复现；新增历史账本与逐边检查 | [当前 v0.1.1](proof-review/handoff-composition/责任接管与负担连续性讨论稿-v0.1.1.md)、[C10 审查](china/handoff-audit/REVIEW.md)。共享转移生成器；R=0，仅终态观察授权入模，跨预算需可重归属政策及持续有效占位；未组合进旧 Lean |
| E12 | 资源计量与引用释放条件 | RL1 算术在 7803 个满足准入的合成快照核对；正确引用模型 180 状态/304 边，重复扣数变体 7 步误释放 | [资源 v0.1.1](resource-lifecycle/资源归属与环境生命周期讨论稿-v0.1.1.md)、[R14 审查](proof-review/resource-audit/REVIEW.md)。不是内存基准或新一般机器证明；错误计数违反真实使用前提，不能称 RL2 的反例 |

E04–E05 共 **14 个主配置：5 个完整有限安全检查通过，9 个找到预期反例**。预期反例是主动检验一个过强命题或削弱机制，不是 9 个产品事故；独立复跑、负对照和初始解析失败不新增配置数量。各模型域不同，状态数不相加为产品覆盖率。“完整安全检查”只指所声明有限可达域搜索结束且未见指定违例，不指业务完成或整个工程安全。E09 是另一个 Python 有限图检查器，不加入这 14 项计数。

E03 中验收模型访问 238,244 个状态，支持模型检查 117,128 个固定点赋值，描述的是枚举域大小。没有据此算真实任务通过率、可靠性概率或运行收益。TLA+ 遇首反例停止的计数也不能称全图穷尽。

E10–E12 是新增的独立专题核查，不加入 E04–E05 的 14 个配置，也不增加两项 Lean 一般证明的数量。不同研究线独立推导检查式仍可能共享原转移遗漏；结果中明确记录这些共同前提。

## 已核查但没有运行产品的材料

| 材料 | 可用来支持 | 不可用来支持 |
| --- | --- | --- |
| 官方产品文档与固定开源代码 | 特定版本声明的机制、接口、控制流及限制 | 我们已购买/运行该服务、所有部署配置有同样行为 |
| 论文正文、图表与作者开源实现 | 作者在明确任务和设定中报告的结果；代码的具体逻辑 | 本轮重现实验、跨任务普遍收益、独立验证作者全部数据 |
| 员工/作者署名公开讨论 | 该作者在当时身份下的观点或经验 | 公司承诺、当前在职身份、产品功能已经交付 |
| Record PR 与 CI 公开状态 | 核读时该提交存在、PR 状态及相应 CI 状态 | PR 已合并、全部历史测试本轮已复跑、真实用户验收 |
| 原公开讨论归档 | 之前提过的目标、接口草案、历史检查及设计沿革 | 当前统一实现已支持所有旧稿功能 |

来源册保存版本、链接及读取范围。访问失败或只见摘要的候选不作为已读全文；同一论文 PDF/HTML、同一个源码的不同位置和不同审查线重读，不冒充不同研究。

## 尚未执行的验证计划

| 编号 | 计划 | 目前状态 |
| --- | --- | --- |
| N01 | 16 组真实适配场景、43 个细化变体 | [目录](mechanisms/conformance/catalog.json)全部未运行；扩展说明中的新增变体不自动加入原 43 的计数 |
| N02 | 3 场景、6 家族、2 条件的 12 次校准 | [设计 v0.1.1](west/evaluation-design-review/design-v0.1.1.json)尚未运行；正常终点包括全部约定阶段及最终验收，提前退出另列 |
| N03 | 七个实施切片、29 项行为检查 | [任务书清单](west/implementation-taskbook/slice-checklist.json)为 PROPOSED_NOT_RUN；不是已有 29 条通过测试 |
| N04 | 记忆/上下文收益对照及后续成长实验 | [上下文协议](west/context-evaluation/protocol.json)、[工作改进协议](mechanisms/work-improvement/minimal-experiments.json)未运行；不同方案预算不能相加为默认试验 |
| N05 | 跨版本迁移与持久切点故障注入 | [迁移场景](mechanisms/lifecycle-migration/fault-scenarios.json)、[持久切点](mechanisms/durability-boundary/crash-cuts.json)仍未运行实际宿主 |
| N06 | MCP/A2A/Native 跨宿主映射 | [六个见证](mechanisms/interop-contracts/acceptance.json)全部 PROPOSED_NOT_RUN；固定规范和九条映射是静态研究，未实现 wire 适配 |
| N07 | 资源生命周期六类真实场景 | [验证路线](resource-lifecycle/资源归属与环境生命周期讨论稿-v0.1.1.md)全部未运行；R14 的合成引用模型不替代真实进程、文件与内存观察 |

模型检查的成功不能把 N01/N05 改成已运行。E08 的源码 mock 探针只验证它实际调用的方法及注入假设，不能替代真实 writer、目标端与掉电试验。

## 已修正的问题

- **解释器同源**：两个算法一致可能共享错误语义。保留原结果，增加不同表达的检查与变异，见 [model audit](proof-review/model-audit/REVIEW.md)。
- **期限 runner 的错误接受**：相同退出码不代表命中了目标不变量；当前运行器核对名称与完整结束条件，原日志仍保留。
- **Record RF03**：撤回整个完成结论不能模拟撤回一个独立支持项。修正版按表达能力差异解释，不把结果称为 OR 算法反例。
- **两次输入捕获**：Record 映射报告原写先 p,κ 后 q，实际两份是相同 SHA 的 q 版；[勘误核对](proof-review/snapshot-errata-check/REVIEW.md)确认探针与源码输入未因此变化。
- **实验终点**：首次基础验收不是多阶段任务的正常终点；[工作策略审查](proof-review/work-policy-audit/REVIEW.md)已反馈进最小评估 v0.1.1 及实施任务书。
- **接管范围**：C10 指出模型未带入非零收尾预留，授权只检查终态观察。v0.1.1 明确 R=0 及其他操作未建模；原模型和回执不变。
- **资源实现义务**：R14 使并发瞬态合计、预留使用转记、引用 token/代际与幂等释放更明确；不把这些修订包装成新的物理资源保证。

## 证据保管与实际工程缺口

历史接收 manifest、输入 SHA、工具版本、退出码、原始日志和独立审查各自保留。哈希证明字节身份，不能单独证明作者、真实来源或执行环境可信。自动化审查使用不同上下文或不同模型；没有把它称为人类审核。

阅读包也接受了独立核查：[R10](proof-review/portable-package-audit/REVIEW.md)指出来源校验器依赖工作区路径、渲染中间回执不能代表最终 HTML 两项缺口。[R15 修复复核](proof-review/portable-fix-audit/REVIEW.md)随后在搬迁副本中通过 3150 条条件，并拒绝读取原 checkout 补缺的负对照；70 个生成视图和 18 个离线视图身份一致。旧导出实际排除的 14 个阶段回执已恢复，早先口头数字 13 已更正。该审查仅覆盖 09:26 中间包，较晚材料仍须在最终导出核对；[整合范围](proof-review/portable-fix-audit/IMPORT_SCOPE.md)说明未重复打包的执行副本。

本轮仍缺真实的可信入口、持久化精化、目标级耐久确认、权限撤回一致性、真实效果对账，以及完整任务的质量/成本测量。这些缺口对应下一轮切片，不能通过增加形式符号、来源条目或日志数量消除。
