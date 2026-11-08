# FORMAL_MODEL P1–P15 反例审查：mechanisms 线

2026-11-08 06:29 UTC · 只读审查记录 · 未改 integration 原文

审查性质：与 root 相同模型、不同代理上下文的复核；不是不同模型审查，也不是形式证明。root 已反馈接受 M1–M4，具体原文修改与验证由整合线负责。

审查对象：integration 工作树的 `docs/research/harness-20261107/FORMAL_MODEL.md`，读取于 06:25 UTC。该稿已清楚区分局部原子性与外部效果，并且承认取消、租约和测试的范围。本轮发现的是需要补精确的定义与证明义务，不是已发现产品缺陷。

## 需要改清楚的四点

| 编号 | 对应位置 | 反例 / 缺口 | 建议改法 |
| --- | --- | --- | --- |
| M1 | P3–P4，Supported/Usable/Accepted 的“当前” | 对象在目标端删除，Harness 尚未收到观察：同一日志前缀 n 下，外部世界已有不可用，账本仍显示可用。仅按 n 索引不能同时表示这两种真值。 | 显式定义 `Usable_L(t,n)` 为基于接纳观察、水位和新鲜度规则的账本判断；另有 `Usable_W(t,τ)` 为世界事实。Supported/Accepted 同样说明是规范/证据判定。只有额外观察完整性、新鲜度和目标一致性假设才能推出世界断言。 |
| M2 | P1 与 Grant expiry/Admit 的衔接 | 日志没有变化但墙钟越过 grant expiry：若 δ 隐式读当前时间，同一日志重放结果不同；若不读时间，账本中的未过期状态可以滞后。 | 将时间作为显式接纳观察/命令输入，或在核外最终 dispatch gate 检查可信当前时间，并记录评估依据。区分时间戳完整性、可信时钟与允许偏差。P1 仍只证明固定事件解释等价。 |
| M3 | P7 reserve 与 dispatch | reserve 时权限/依赖/预算均有效，等待期间授权撤回或依赖失效，旧 reserve 凭证并不授权实际发送。Pi 的初次 hook 与 safe replay 不同路径提供具体适配器提醒。 | 定义 `Reserve` 和 `DispatchIntent` 两个转移，后者重新检查当前定义、授权、冲突和对应预算负担，并持久化发送意图。原子边界只到意图接纳，网络目标执行点另列假设。P7 证明不能被读成“一次 reserve 永久有效”。 |
| M4 | P13 的 R 与“剩余消耗” | R 若是固定常数，安全收尾实际花钱后 U 增而 R 不减，写出的不变量不对结算转移封闭。另，已经消费但未上报的额度若既不算 U、也不算“未来剩余”r，会从账上消失。 | 把 `R_remaining` 作为可扣减的收尾预留，或说明 R 仅在停止新准入的最终阶段使用并分别证明。把 `r_i` 定义为“尚未结算的已发生消费 + 可能未来消费”的保守负担上界，不能仅指未来费用。所有转换必须原子且不得双重释放。 |

M1/M2 并不否定原有命题：它们要求把“纯日志确定性”和“当前世界判断”之间缺的映射说出来。P4 已写“权限和适用规则不变”；建议同时说明到期、观察 TTL 和策略版本等是否属于绑定适用谓词的自由变量，避免读者误以为绑定向量未变就永远有效。

M4 的可核查小例：预算 B=10，已结算 U=0，任务 A 最初预留 10。A 已消费 8 但账单未到；若将 A 的 r 错改为未来最多 2，再接纳费用 8 的任务 B，则最终可到 18。错误来自把未结算消费丢掉；正确的 outstanding liability 此时仍最多为 10。这与 PydanticAI `unmeasured_requests` 将已知消耗明确视为下界的实现相符。

## 已经处理正确的边界

| 位置 | 审查结论 |
| --- | --- |
| P2 | 散列一致性与来源认证分开是正确条件；不必因使用 hash 就声称防恶意替换。 |
| P5 | `(a ∧ b) ∨ c` 的替代证据反例足以否定“可达后代一律失效”；不需要宣称支持公式解决全部否定/时态逻辑。 |
| P6 | 工作流定义可有环而发生实例因果图无环；前提是边遵循实际因果，稿件已排除接收序伪造因果。 |
| P7 | 已主动否定“永远至多一个 activeAction”的错误全局不变量，这比单纯 claim/lease 模型精确。 |
| P8–P9 | 取消 ACK 不代表无效果、两世界条件性不可区分证明、不是 FLP 泛化，这三项边界均正确。 |
| P10–P11 | 可追溯性不代表语义充分，硬义务与预算冲突需要显式不可行，没有偷加贪心最优性。 |
| P14 | 接口假设与整体验收必须独立；具体部署/运行版本反例有效。应在实施契约中将 IntegrationConstraints 展开为兼容版本和一致观察切面。 |
| P15 | 固定有限测试集不能推出未来全部输入更优；选择偏差和重复挑最好结果的警告适当。 |

## 可直接重新打开的已有机制

固定提交与完整限制均在 [sources.json](sources.json)；下面仅给重开路径，避免把已有机制说成我们的新发明。

| 模型接口 | 样本与定位 | 对应条件 |
| --- | --- | --- |
| 取消意图与实际结束 | Temporal `615a684ac41a22c881df11157775e326843f7b04`，`packages/common/src/activity-options.ts:13–60`；`packages/worker/src/activity.ts:86–110,206–279` | 明确三种取消等待语义；worker signal 与实际函数 settle 不等价。 |
| 短取消返回与迟到工具 | Letta Code `9176d8c0b16f408e9240422a98379a423e2176c3`，`src/agent/approval-execution.ts:446–533` | 500ms grace 之后 straggler 仍可执行；调用者返回不等于 sender 全部终止。 |
| 恢复授权入口 | Pi `6e2222a8dda06e3d69fad46d630f152f5873567a`，`packages/durable/src/harness/tool.ts:130–246` | 初次 beforeTool 与恢复 execute 分支不同；应检查工具适配器权限 gate，而非仅 UI 审批。 |
| 迟到结果不覆盖 successor | Letta Code 同上，`src/websocket/listener/interrupted-turn-record.ts:435–518` | lineage 精确匹配；independent successor 时 exact result 写 sidecar，主 revision 保留。 |
| 旧取消观察不能取消新 waiter | DBOS `236142bd7a99ff77d04becf5f405a60d6f330591`，`dbos/_core.py:2309–2326` | 在读远端状态前快照本批 waiters，限制读结果的作用域。 |
| 旧执行者记录 fencing | Agno `f45ccee83dcd332c6a2cf46b0a0add3e7f7d3e68`，`libs/agno/agno/db/postgres/async_postgres.py:4892–4990` | 同事务 run/session，拒绝旧 attempt；只保证存储结果，未 fence 外部目标。 |
| 消费计量不完备 | PydanticAI `0f7648a1b0685389ea368ea4f7b754b393cea8c7`，`pydantic_ai_slim/pydantic_ai/usage.py:704–724` | 缺失 usage 是已知费用下界，无法完整执行预算；需上游完整计量或上界预留。 |

## ARCHITECTURE H03 的目标适配附注

截至 06:30 UTC 的 [GitHub 官方 REST 文档](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request-asynchronously) 推荐异步合并 API：202 只是接纳；enqueued 表示入合并队列，是该队列请求的终态而非已合并。异步 UUID 结果最后更新24小时后过期404。因此 H03 的验收应从请求状态继续定位 PR 本体和实际提交；请求 terminal、引用 unavailable 与 effectResolved 是三件事。这是动态官方文档核查，未实际调用合并接口；来源 GH-01 单独标示非固定 commit。

未实施代码、未跑真实适配器。本文件给的是模型修改建议和对照证据；root 决定是否采纳并更新命题编号。

