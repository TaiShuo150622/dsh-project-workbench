# R-04：期限模型与适配契约 v0.1.1 的定向模型审查

结论：**TTL/期限模型的三项结果独立复现，未发现类型、变量赋值或所声明有限域保证的错误。** “发送/接收发生在期限前，实际效果却在线性化时已到期”的反例成立；提交点拒绝配置在其明确假设下通过，不是通用幂等证明。v0.1.1 对产品 unknown 与测试 UNKNOWN、无界等待与进展、按 q 的可用性及合法派生发布，目前未发现实质混淆。

发现一项具体检查器缺口：冻结版 `run_expiry.py` 只匹配退出码，没有核对失败不变量。隔离负对照中，检查一个完全不同的不变量 Init 得到退出12，整套运行器仍退出0。本次原始及独立复跑日志确实都是 NoDuplicate 违例，所以这项缺口不推翻已读取的模型结果；应修运行器的判定规则。

**修复状态补充：** root 已修订运行器；本线随后只读核查新源码与正负对照证据，EA01 在 SHA `7c4b0ade1401f863c9a47a4052f1dd3dd93565e4a86bb50c479b3fa55582ea0c` 下已解决。原版发现及输入快照保留，详见 [REPAIR_REVIEW.md](REPAIR_REVIEW.md)。

本轮是不同模型的模型审查与独立 TLC 执行，非人类审核、非产品验收。原作者文件与此前审查输出均只读，没有提交、推送或调用模型 API。未对契约稿中的全部外部引用重新开展来源审计。

## 固定输入与独立执行

完整固定输入见 [INPUT_MANIFEST.json](INPUT_MANIFEST.json)。主要 SHA256：

| 文件 | SHA256 |
| --- | --- |
| ExpiryContract.tla | `c6f6c41d37ad1d3fc567cac48182042da9fdf2cd45c74f40dc14ddaf3f98cdd4` |
| run_expiry.py | `87c273c62dbce044f3aa3d5075513bf17481cf34d97afe10e6663f3253d2043a` |
| formal-spec/README.md | `65981f634c8f4d109d34fc64257184f7de569cb8e4bfdbae2751bec4d78f863d` |
| 原 expiry-results/receipt.json | `c5d3981993d85bc90a6be5f1565c089f4bee7d88e31b52a863c9b3d09362c360` |
| 适配契约与贯穿场景讨论稿 v0.1.1 | `32e2fc71df489af9d8558743fff51ff5966a92a7f69f2acf7e363671345ab7bd` |
| FORMAL_MODEL.md | `a7c3b0b0e37e95a730677149f7d862cdc6fb042b9edd2e5317431ed28d78ebcd` |

本线在固定副本运行原 runner，输出到 `rerun/`。使用同一已提供 TLC jar，实际 SHA256 为 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`；日志显示 TLC2 2.19、Java17、单 worker BFS。原运行器退出0。随后本线额外检查模型/cfg/jar/日志散列、违例名称、完成标志、队列数及轨迹长度，没有仅凭该退出码判定通过。详见 [rerun/receipt.json](rerun/receipt.json) 和 [verification_receipt.json](verification_receipt.json)。

| 配置 | 原运行与独立复跑一致的结果 | generated | distinct | 剩余队列 |
| --- | --- | ---: | ---: | ---: |
| none | NoDuplicate 违例，退出12，9个转移 | 109 | 59 | 3 |
| admission | NoDuplicate 违例，退出12，9个转移 | 131 | 81 | 8 |
| commit | 完整结束，无错误，退出0 | 115 | 66 | 0 |

两条反例有10个状态，包括初态，故为9次转移。前两项在违例处停止，不是全部可达状态计数；README 的“遇反例停止”准确。commit 的66个不同状态是本实例完整状态图。首次解析失败的历史记录单独保存，未计入状态检查通过结果。

## 模型检查：类型、转移和范围

变量为 now、sent、received、finished、admitted、seen、effects。各动作完整赋值：

| 动作 | 更新变量 | 其余变量 |
| --- | --- | --- |
| Send | sent | 六项 UNCHANGED |
| Receive | received、admitted | 五项 UNCHANGED |
| Commit | finished；拒绝分支保持 seen/effects，允许分支赋值 seen/effects | now/sent/received/admitted UNCHANGED |
| Evict | seen | 六项 UNCHANGED |
| Tick | now | 六项 UNCHANGED |

没有发现未约束的 primed 变量。Send 的 m 域由 Next 的 `m∈Messages` 限定；Receive 和 Commit 分别要求尚未接收/完成。初态、各转移保持 sent/received/finished 的包含关系，effects 只在对应消息 finished 的原子步增加。

所有配置固定 Deadline=2，now 只按0→1→2前进，消息集合固定{1,2}，其余集合都是有限子集，seen为布尔值。时间在到期值2饱和，足以表达此模型只区分“未到期/已到期”的后续行为；并非验证了任意精度时钟或任意TTL长度。允许无限 stuttering 不扩大不同状态数，也不提供活性保证。

effects 保存不同发送消息ID，seen 则代表同一不可变业务意图的去重记录。这种分离允许把两个发送产生的效果计成两次，而不是因共享业务键在集合中被自动合并。模型没有显式参数或多个 key，不能检查参数冲突、命名空间碰撞、不同意图误合并。

### 期限反例确实发生在提交点

两条原始轨迹与本线轨迹均可概括为：

```text
now=0: Send(1) → Receive(1) → Commit(1)，effects={1}, seen=true
now=0: Send(2) → Receive(2)，第二条请求已获得准入
Tick → now=1
Tick → now=2
Evict → seen=false
Commit(2) → effects={1,2}
```

所有发送和接收均发生在0，严格早于Deadline=2。因此 admission 反例不是偷用“接收时已过期却仍准入”的非法路径；缺的是从接收到实际效果之间仍有效的条件。反例也没有违反 Send 的期限守卫。

9步具有明确事件下界：产生两次效果需两次Send、Receive、Commit共6步；从初态0达到到期2需两次Tick；两次效果之间删除去重状态至少一次Evict，共9步。当前最短轨迹达到该下界。该长度仅指模型的原子动作数，不是实际网络调用数或墙钟时间。

### commit 配置为什么只能给有限、条件性的安全保证

commit 模式在 Commit 的同一原子步检查 `now>=Deadline` 并拒绝效果。到期前不能 Evict，所以目标对第二条消息仍有 seen；到期后即使 Evict，所有 Commit 都拒绝新效果。这是当前 NoDuplicate 通过的关键。

它没有把所有消息永久拒绝作为唯一行为：未到期时的 Send→Receive→Commit 路径允许一次效果。但它允许到期后一个效果都未发生的任务永久不完成；模型没有承诺期限内必定完成，这不是当前安全性质的反例。

需保留以下范围：

- 本模型是**同一绝对业务截止点**控制发送、提交和允许删除记录，不是已经证明所有“从首次请求/首次提交起算TTL”的策略。
- 提交期限检查与效果共用一个目标时钟、同一原子步骤；时钟不会倒退，期限不会动态延长，key不会提前丢失。
- 每个消息只提交一次，重试由两条不同消息表示；没有目标崩溃、持久化丢失或任意数量重试。
- 提交点拒绝是此模型采用的一种充分协议，并不是所有安全幂等系统都必须采用的唯一办法。永久保留key、可靠排除迟到请求或其他更强目标约束会改变前提。

README:45–57 和契约v0.1.1:59–70 已明确主要边界，没有将66状态的通过写成通用幂等证明。

## EA01：运行器可能把错误不变量的失败当成预期反例

**分类：检查器判定缺口。优先级：中；影响后续自动核查可靠性，不是已发现产品或模型错误。** 位置：`inputs/formal-spec/run_expiry.py:27,36–43`。

程序预期 none/admission 退出12、commit退出0；summary_lines虽然保存错误文本，最终条件只比较退出码。多个不同不变量的违例都可以使用12，因此返回码并不指明哪条命题被反驳。

本线在 `runner-probe/` 建立隔离副本，只修改 none 配置：

```text
INVARIANTS TypeOK NoDuplicate
改为
INVARIANTS Init
```

模型和原 runner 本身均保持相同字节。实际结果：none 在第一次状态变化后报告 `Invariant Init is violated.`，仅1个转移，退出12；其他两配置保持原结果；**整个 runner 仍退出0**。详见 [runner_probe_receipt.json](runner_probe_receipt.json) 及 `runner-probe-results/none.log`。

这证明“退出码符合预期”并不等于“预期 NoDuplicate 反例已出现”。若未来模型引入 TypeOK 失败，现有模式也可能接受同类错误。

建议逐mode核对：

1. none/admission 必须观察到指定的 NoDuplicate 违例；出现 TypeOK、Init 或其他错误不能当预期成功。
2. commit 必须无违例/错误、有完整完成标志且队列为0。
3. 记录 observed_violations、complete_exploration 与退出码；负对照要验证错不变量确实被拒绝。

本节的反例仍对应原SHA；修订版及其独立阅读结论另列于 REPAIR_REVIEW.md，不覆盖原版证据。原始和本轮独立日志都确实满足正确的NoDuplicate判据，因此已有TTL反例与正向结果可以保留。

## 契约 v0.1.1 与 authority/q 的定向审查

本节只检查任务指定的混淆点，不扩展成全面安全审计，也未运行真实适配器场景。

| 关注点 | 已读取的具体边界 | 判断 |
| --- | --- | --- |
| 产品unknown与测试UNKNOWN | v0.1.1:136明确前者可能是正确产品行为，后者是测试证据不足不能通过；140要求记录具体预期谓词，并分开抽象与实现pass | 未发现混淆。SUCCESS只能读作该场景断言成立，不等于业务任务完成。 |
| 永久等待与进展 | v0.1.1:138说无有界进展承诺时，超时不能直接断言协议违例；FORMAL:182又明确永久外部阻塞不保证完成、频繁“仍在运行”不证明进展 | 二者相容。有限等待窗口可导致测试UNKNOWN，不因此给活性成功或业务完成。 |
| Usable按q判断 | FORMAL:58明确q至少包含consumer/operation/recipients，63/77分开访问、副本与验收变化；P4在固定主体/用途语境下使用 | 未发现用单一全局available继承所有主体判定。 |
| C14a撤单主体授权 | v0.1.1:132要求A/B独立授权，且B相关输入不变才保持B判定 | 有前提的局部不干扰，没有无条件承诺撤A永不影响B。 |
| C14b删除唯一副本 | v0.1.1:133限定指定版本唯一可用副本的权威删除确认；只否定依赖读取该原件的消费，保留历史完成 | 没有把一次403/读取失败当全球删除，也没有把删除等同撤回历史证据真实性。 |
| C14c派生发布 | v0.1.1:134允许有权流程向无原文权主体发布汇总；FORMAL:158同时要求明确范围，区分消费/原文读取/重验，未经授权摘要不扩权 | 没有要求所有汇总消费者拥有祖先原文权，也没有允许摘要天然绕过披露政策。 |
| 当前策略与历史材料 | v0.1.1:120–121及FORMAL:116要求最终语义资源、参数和当前可信策略，旧会话材料不能授权新写入 | 未发现把历史批准无条件恢复为持续权限。 |

“权限相关读取失败不推出全局删除”“合法派生发布不要求原文可读”“证据不足不等于产品失败”都是本轮应保留的区别。它们的真实实现仍需各场景声明的权威来源、操作/收件范围、时钟、版本与观察窗口；本报告没有将这些前提视为已在产品中实现。

## 交接范围

本轮仅提出EA01一项具体缺口，随后完成其修复的定向只读复核。没有为了增加发现数量而把模型明示的有限域、单时钟或无活性假设当作新错误。输入与模型结果保持原样；未因运行器修复重复执行全部模型检查，也未撤销仍有效的原模型结论。
