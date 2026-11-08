# 适配契约稿的定向审查

2026-11-07 · mechanisms 研究线

审查对象：integration/docs/research/harness-20261107/适配契约与贯穿场景讨论稿-v0.1.0.md。

- 固定内容 SHA-256：`69c2282172eb38309d06be764190076863fadb703e20eed2e7212075e092c44b`。
- integration Git HEAD：`7264be10387963f4d575d8688ed8573f4c16c8c4`。
- 行号均对应上述内容，后续 root 修订不在本轮固定快照内。
- 审查性质：同模型、不同上下文的定向交叉审阅；不是独立证明。
- 本文只报告需要补清或收窄的地方；没有修改 root 稿。

## 需要修订的具体点

| 编号 | 位置 | 问题与最短反例 | 建议修改 | 目录对应 |
| --- | --- | --- | --- | --- |
| R01 | C03，113 行 | “只重算受影响判断”是内部工作量保证。全量重算但输出正确的实现，会被文字误判不合格；黑盒输出也无法证明它只做局部重算 | 核心 oracle 检查 AND/OR 真值、替代支持和无关判断。重算数量作为有显式遥测的可选性能断言 | C03.and/or/work |
| R02 | C14，124 行 | 产物被删除与某主体访问权撤回不是一个 availability 事实。P1 得到 403 时 P2 可能仍能读取同一版本 | 分全局存在性、版本适用性、principal-scoped access；只有依赖该主体访问的判断失效，不全局标删除 | C14.deleted/access_revoked/version_changed |
| R03 | 67 行、C08 118 行 | 保留期只写自动重试期限仍不够：到期前发出的重复请求可能在到期后才到达。另缺独立意图同参及跨命名空间碰撞 | 固定去重起算点、到达/提交边界、最大迟到界或目标端过期拒绝；到期未知不得沿用更强保证。增加独立意图、tenant/operation、并发与子效果变体 | C08 各变体 |
| R04 | C10，120 行 | “最终参数”若只指审批前 JSON，cwd、账号、重定向、符号链接或资源别名解析后仍可能换目标 | 绑定语义动作描述及最终稳定资源身份，列 canonicalization 规则和授权检查点；范围内合法变化不要求重复审批 | C10.target/parameters/resolution/in_scope |
| R05 | C13，123 行；128 行 | 没有时钟域、误差界、期限开闭区间和观察截止，场景可无限等待或误判过期。规则不声明有界传播时，超时不是失败证据 | profile 必填时钟/期限语义与 observation deadline；未到可判边界或证据不足判 UNKNOWN，只有明确有限进展承诺被反驳才因超时 FAILURE | C13；shared_contract |
| R06 | C15，125 行、154 行 | “恢复后可解释回执”不足以区分提交前失败与提交后丢 ACK；也可能把历史幂等回执重新当成当前状态 | 列 atomic commit set 与派生重建关系、ACK 等级、故障域；相同请求精确重放返回历史收据，同 requestId 改内容拒绝或显式冲突；独立读当前状态 | C15 四变体 |
| R07 | C16，126 行 | “不覆盖后继当前权威状态”容易被实现成丢弃所有旧尝试证据。旧请求的真实迟到效果仍可能改变当前共享资源判定 | 禁止覆盖后继尝试身份/状态；允许经认证、作用域匹配的迟到效果证据解决原动作，并触发共享资源重判 | C16.report/effect_evidence/cross_history |
| R08 | C06/C07，116–117 行 | cancel ACK 与 target installed ACK 的主体及线性化点未在场景中固定。控制器说“已安装 epoch”不能证明目标提交门已安装 | 明确目标屏障回执与 audit coverage；C07 只拒绝目标安装之后的旧代际提交；C06 无终止/未应用证据时保留未知 | C06、C07 |
| R09 | 演示故障恢复，141 行 | “未知效果未被重复执行”比“恢复器没有主动重发”更强。一次 target GET 没发现第二条效果，不排除迟到或未覆盖子效果 | 分开描述恢复器行为与目标效果观察。前者需完整出站覆盖，后者需目标权威记录和窗口/契约；证据不足保留 UNKNOWN | C09 与 observation_channels |
| R10 | 107 行、C12 122 行 | C12 的负担保留/结算可用于软预算；若整项都要求硬预算，会让有用的基础会计行为被跳过 | 分 liability 基础变体与 hard_cap 额外变体，只有后者要求可信成本界/目标配额；两者结果分列 | C12.liability/hard_cap |
| R11 | C02，112 行 | 添加备注时真实时间仍在走；若同一时刻授权过期，验收失效不能反过来证明“备注相关” | 固定其他输入或证明有效性区间不变，读取集合是审查前提，黑盒不能证明其完整 | C02 |
| R12 | 65 行 | “在同一目标事务中”可作为一种足够实现，却未必是唯一实现；有可恢复原子协议时不一定是同一数据库事务 | 改为“去重决定与覆盖效果具备可说明的原子/可恢复关系”，具体适配器指出提交与恢复点 | C08；C15 |

R01–R09 影响核心判定口径，建议先处理。R10–R12 用于避免把能力要求写得过窄。

## 状态用词需要再分一层

文档 40、107、128 行已经强调结果差异，建议追加一条通用规则：

- **产品动作状态 unknown** 是被观察系统的合法状态；C06/C09 正确保留 unknown 时，验收场景可以 SUCCESS。
- **测试 verdict UNKNOWN** 是证据或扰动覆盖不足，检查者无法判断，不能当 SUCCESS。
- **UNSUPPORTED** 只用于该配置明确不具备所需能力的断言；不是替错误实现免责，也不能把未经执行的能力声明当“在配置下通过”。
- **本目录状态 PROPOSED_NOT_RUN** 与上述运行判定分开。当前所有 case 的 verdict 均为 NOT_RUN，actual_execution 均为 false。

## DSH 缺失的精确引文

root 稿 101 行写到了 DSH，但当前该段只有 Temporal 和 Letta 链接。建议补以下固定来源：

- [pipeline.ts:243–285](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/core/tools/src/pipeline.ts#L243)：bodyInvoked、取消阶段、signal 融合、内层工具体等待。
- [contracts.ts:263–267](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/core/tools/src/contracts.ts#L263)：ABORTED 与 ABORTED_BEFORE_DISPATCH。
- [events.ts:20–29](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/core/tools/src/events.ts#L20)：wrapper 恢复 signal、达到 quiescence 是作者义务。
- [pipeline.ts:295–323](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/core/tools/src/pipeline.ts#L295)：外层等待 waterfall；不能由内层 await 推导任意违约 wrapper 都被强制排空。
- [index.ts:264–296](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/core/tools/src/index.ts#L264)：已入选工具仍核对当前 definition/registration 身份。

这些代码在本线前一轮已固定阅读，未运行。完整限定见 [Cordis 专题](../cordis-boundary/Cordis-组合与外部效果边界讨论稿-v0.1.0.md)。不需要把源码中同名事件直接当成上述验收已经通过。

## 交接

场景目录见 [catalog.json](catalog.json)，格式及执行边界见 [README.md](README.md)。目录是未运行的验收协议，内容审查不证明真实适配器行为；root 修改稿件后应重新固定最终版本摘要。

