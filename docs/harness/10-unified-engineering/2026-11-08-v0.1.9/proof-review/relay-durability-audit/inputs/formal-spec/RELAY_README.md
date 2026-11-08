# 持久回执与内存去重：有限状态模型

2026-11-08 UTC · 本轮新建的条件模型；不运行工作台、DSH 宿主或真实崩溃注入。

一次调用返回、消息在当前内存里可见、宿主形成持久回执、工作台写入 sent，不能互相替代。本模型把 [M-06 的 DC04 条件路径](../mechanisms/durability-boundary/README.md)缩成一个可枚举系统，检查内存命中早退的后果与一种更强接纳条件。它不声称已证明完整产品存在可利用故障，也不是一次实际数据丢失事件。

## 对象、范围与假设

| 变量 / 条件 | 本模型含义 | 没有包括什么 |
| --- | --- | --- |
| live | 同一消息 ID 在目标当前进程的可接纳历史/队列中可见 | 不验证模型是否理解消息，不模拟消息消费、取消、删除 |
| durable | 对应目标记录已经跨过所声明的持久屏障 | 不证明文件系统、设备掉电或任意后端实现符合这个屏障 |
| sent | 工作台已保存“不再投递此 ID”的标记 | 不证明收件方业务完成或下游效果只有一次 |
| error | 本次投递/保存过程报告了错误 | 不等于目标没有收到，且保留标志也可能是历史错误 |
| phase | check、append、flush、returned 与 idle 之间的调用阶段 | 不表示真实函数的每个微步或所有并发交错 |
| calls / failures / crashes | 至多两次投递调用、一次失败、一次进程崩溃 | 不覆盖无界重试、多个消息、多个目标、恶意主体或网络故障全集 |

前提固定：出站意图已存在；消息内容和 ID 不变；接收方是可以用同 ID 重试的 worker→lead 汇报路径；目标有对应的活动写句柄；工作台的标记在本次进程重启模型下可恢复。崩溃丢弃未保存的 live 状态，保留 durable 及工作台标记。没有施加调度公平性或完成期限；检查的是安全性质，不证明活性。

真实 worker 的 phase 失败/恢复会采用其他分支，不能不加条件套用本例。真实存储失败也可能已经部分提交；`TargetWriteFailure` 明确选择目标未提交的分支，不能从一般异常直接推断该事实。`LaterDrain` 允许后续保存成功；反例只是展示崩溃前没有经过成功 drain 的可行抽象前缀，不主张系统永远无法补救。

## 与固定源码的关系

研究输入的工作台提交为 `7264be1`，DSH 为 `fcc0ad4`。这组版本用于条件对照，未核实用户当时实际加载的宿主版本和后端。

- `Native.deliver` 先读 `snapshotEvents`/live inbox，命中 ID 就返回；新消息走 `followup`，然后 await service-wide `flush`。
- DSH 的 `snapshotEvents` 读取内存 log；session commit 先加入内存事件。持久服务契约明确 append 可见性弱于 flush 的耐久屏障。
- JSONL drain 失败时把批次放回 buffer 并暂停定时 drain；后续显式 drain 可重试。全服务 flush 会尝试其他写句柄，聚合失败，故某个异常也可能来自其他会话。
- 工作台 await deliver 后再单独保存 sent；对于给 lead 的汇报，重试投递可以清 error 并再次处理同一 ID。

完整定位与后端限制见 [M-06 来源链](../mechanisms/durability-boundary/sources.json)。root 额外核读 persistence `index.ts:125–187`、JSONL `storage.ts:267–360,503–528` 和 session `index.ts:892–911`；这仍不是实现到本模型的形式精化证明。

## 三个配置的实际结果

| 配置 | 模型规则与性质 | TLC 实际结果 | 可以得出的结论 |
| --- | --- | --- | --- |
| relay-memory | 重复 ID 仅凭 live 返回；检查 `sent ⇒ live ∨ durable` | 81 generated / 51 distinct / queue 4，9 次转移得到反例 | 此组前提下，标记 sent 后仍可能在重启时丢失目标记录 |
| relay-durable | live 命中但没有 durable 时仍需 flush；检查上述性质及 `sent ⇒ durable` | 87 generated / 52 distinct / queue 0，完整有限检查通过 | 更强条件在这个有限模型中保住已标记消息；不证明最终一定能保存 |
| relay-error | 使用更强规则，检查错误推断 `error ⇒ ¬durable` | 13 generated / 12 distinct / queue 4，4 次转移得到反例 | 全局 flush 因其他 writer 失败时，目标记录可以已经保存；错误不能当未收到证明 |

反例配置在发现首个反例时停止，不能把 visited 计数叫作全部可达状态数。工具为官方 release v1.7.4 所带 TLC2 2.19、Java 17.0.6；jar SHA256 为 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`。

第一条最短反例的九次转移：Start → Check → Append → TargetWriteFailure → RetryDelivery → Start → Check（live 命中早退）→ MarkSent → Crash。最后 `sent=true`，而 `live=false,durable=false`。这只解释消息记录的恢复边界，下游业务是否执行不在模型中。

第三条反例：Start → Check → Append → OtherWriterFailure。目标 `durable=true` 而错误为 true。因本地 sent 标记保存失败而报告错误的分支也被建模，但不是该配置返回的最短反例。

## 复跑与运行器校验

在当前目录运行，jar 路径替换为经过独立核对的本地工具：

```sh
python3 run_relay.py --jar /path/to/tla2tools.jar --output relay-rerun
```

模型：[DurableRelay.tla](DurableRelay.tla)。原始结果：[receipt.json](relay-results/receipt.json)、[内存早退反例](relay-results/memory.log)、[完整通过](relay-results/durable.log)、[错误归因反例](relay-results/error.log)。

运行器同时检查退出码、不变量名称、错误行与状态计数；通过配置要求完整结束且队列为零。另在隔离副本把 memory 配置改成检查 Init，TLC 仍返回反例退出码12，但运行器退出1并拒绝把它当预期反例。[负对照回执](relay-runner-negative-control/receipt.json)。没有覆盖原模型或修改产品。

## 下一步的证据缺口

- [ ] 不同模型审阅模型、最短轨迹、源代码映射和运行器负对照。
- [ ] 在获准的隔离真实宿主上，固定后端与目标写句柄，实际构造对应故障并核查重启后的历史；当前未执行。
- [ ] 如实施更强确认规则，明确目标级 ACK、失败归因、调用取消与超时，不依赖整个服务任意其他会话都保存成功。
- [ ] 对 worker 目标、消息消费、多个 ID、跨进程写者与掉电故障分别设计模型/测试；不能直接沿用这里的通过标签。
