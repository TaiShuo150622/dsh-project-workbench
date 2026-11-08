# R-08 DurableRelay 与 M06 定向模型审查

**在冻结输入与声明范围内，未发现需修复的模型、运行器或源码映射错误。** 独立 TLC 复跑与原计数、反例一致；错误不变量负对照确实被运行器拒绝。这个结论仅涉及条件抽象和有限安全检查，不能写成真实宿主已复现丢消息、通用耐久性证明、幂等证明或活性保证。

本轮为不同模型审查线（调度声明 gpt-6-astra，未作运行时模型身份认证）加独立 TLC 执行，非人类审核。未运行产品、宿主、掉电或进程故障注入；未修改作者源，未提交/推送。

## 固定输入与独立执行

28 个模型、配置、回执和 M06 文件已冻结于 `inputs/`，SHA 见 `INPUT_MANIFEST.json`。另从工作台固定 git 对象提取 3 个源码文件，并从 DSH 固定 commit 原始 URL 读取 7 个文件，完整字节与 SHA 见 `SOURCE_MANIFEST.json`、`source-inputs/`。不是用当前分支代替固定版本。

| 关键输入 | SHA-256 |
| --- | --- |
| DurableRelay.tla | `833ef47b06e0626e8c0421ec240319956e8ff2d1f39e231f25fcb8068016d2f4` |
| run_relay.py | `5b734d061decb6d6bb7c0fcf57f7e1cdc3f17cdc99ddee4b6f72c3f6f752adc3` |
| RELAY_README.md | `c60c1603bac897c4435d28d8d43a777eec812285e887313b066236bad4e2274f` |
| TLC jar | `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` |

复制模型/运行器到本线 `run/`，原冻结输入未参与写入。独立结果：

| 配置 | TLC 退出码 | generated / distinct / queue | 结果 |
| --- | ---: | --- | --- |
| memory | 12 | 81 / 51 / 4 | `NoLostSent` 反例，9 次转移 |
| durable | 0 | 87 / 52 / 0 | 完整有限检查，无不变量错误 |
| error | 12 | 13 / 12 / 4 | `ErrorProvesAbsence` 反例，4 次转移 |

`rerun/receipt.json` 和原始日志为本线运行证据；`inputs/formal-spec/relay-results/` 是作者证据，两者分开。两个反例计数是首反例停止前访问量，只有 durable 的队列零与完整结束支持这份有限图的穷尽检查。TLC 输出的状态深度 10/5 含初态，对应转移数 9/4，不应误写为 10/5 次动作。

## 类型、阶段与安全性质

逐个检查 Init 及 11 个 Next 分支：每个状态变量都有赋值或 UNCHANGED，无开放的 primed 变量；mode 限于两个字符串。live/durable/sent/error 为布尔，phase 五值，calls≤2、failures≤1、crashes≤1，域有限。`durable ⇒ live` 在这些转移下保持，包括 Crash 的 `live'=durable`。三个配置均检查 TypeOK。

- Start/Check/Append/flush/returned/MarkSent 把调用阶段与本地标记提交拆开；Crash 可发生于任意阶段，丢弃进行中的调用阶段并恢复 durable 对应 live。它不是把崩溃中的 Promise 当成稍后还能返回。
- durable、sent 在 Crash 中保留；error 保留是模型选择，README 已说明可为历史错误。calls/failures/crashes 是有限探索计数，跨 Crash 保留不表示真实产品持久存有这些字段。
- `NoLostSent` 是消息接纳记录的恢复性质，不检查业务效果。由于 TypeOK 已含 durable⇒live，它在可达状态上等价于 sent⇒live；额外 `SentImpliesDurable` 更早要求标记依赖耐久接纳。
- durable 模式不是靠从不设置 sent 过关：Start→Check→Append→FlushSuccess→MarkSent 是满足所有守卫的 5 步成功路径。安全性来自所有到 returned 的路径都要求 durable 已真，或经过设置 durable 的成功屏障；不是把待证不变量直接写成 Init。
- Spec 为 Init 与 Next 的 stuttering 闭包，没有 fairness，且关闭 deadlock 检查。有限调用上限耗尽、一直等待或无限 stutter 都不被这些安全检查否定；不能据此说消息最终一定保存。

## 两条反例及最短性范围

memory 轨迹：Start→Check→Append→TargetWriteFailure→RetryDelivery→Start→Check→MarkSent→Crash。第一次失败留下 live=true、durable=false；同 ID 重试在 Check 直接 returned；保存 sent 后 Crash 得到 sent=true、live=false、durable=false。没有经过 LaterDrain。

在这个微步定义中，丢失必须发生于一次 sent 后的 Crash；产生非 durable 的 returned 需要 memory 重试命中，而初次调用必须先 Append、失败并清 error 后才能再 Start。这些必要动作合计 9 步，与 TLC 广度优先反例相符。9 不是产品 API 调用数或真实时间下界。

error 轨迹：Start→Check→Append→OtherWriterFailure，目标 durable=true、error=true。在第 4 步前不能到达 flush 分支，也没有其他设置 error 的路径，因此 4 是该模型的最短反例。这个反例甚至不依赖“历史错误后来成功 drain”的解释，直接表示目标保存成功、其他 writer 导致全局失败。

## 源码切点与抽象边界

工作台 commit `7264be10387963f4d575d8688ed8573f4c16c8c4` 的三份 git blob 均与 M06 来源清单一致：

| 抽象 | 本线实际核读的固定源码 | 结论边界 |
| --- | --- | --- |
| worker→lead 同 ID 重试 | projects.js:114–125 将报告 relay 目标设为 lead；152–155 清原 outbox error；267–286 仍用原 m，只有目标匹配 worker thread 才受 running 门禁/失败改 phase | lead 路径可达；不能直接套到失败 worker 目标或把用户 retry_delivery 说成无条件自动重试 |
| live 命中早退 | native.js:5–14、40–47 读 snapshotEvents/inbox；命中即 return，新消息 followup 后才 await flush | live 去重不提供独立存储屏障；固定 ID/内容、未取消/删除等条件必须保留 |
| sent 与错误来源 | projects.js:278–286，deliver 之后另一次 Store.change 标记 sent，catch 也覆盖该标记失败 | MarkerWriteFailure 与目标失败不同；不能将任何异常等同未接收 |
| 进程恢复标记 | store.js:15–26 临时写入、替换、内存发布 | 模型假设该已保存 sent 在进程重启后可恢复；不从此推出 OS/设备掉电耐久性 |

DSH commit `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` 的来源链核对：followup→send→inbox.splice→session.append，session commit 先写内存 log，snapshotEvents 复制该 log。它支持 live 与 durable 分层，不是对磁盘的独立读回。[agent.ts](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/core/agent-loop/src/agent.ts#L170-L180)、[session/index.ts](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/core/session/src/index.ts#L892-L911)。

JSONL drain 失败恢复 buffered batch 并暂停定时 drain；显式后续 drain 仍可重试。flushAll 尝试每个 writer 并聚合错误，因而目标成功与其他会话失败可以共存。模型 LaterDrain 保留了补救分支；反例选择有限前缀内未发生补救，不要求永远禁止 drain。[storage.ts](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/session/session-persistence-jsonl/src/storage.ts#L267-L360)。

JSONL 还包含写入同步、发布目录同步及追加失败回滚；因此 `TargetWriteFailure` 只能映射为具体的未提交或成功回滚分支，不能由通用异常推出。实际采用哪个后端、目标是否有正确路由的活动 writer、回滚是否成功、崩溃前有无另一次 drain，本轮都未在真实宿主观察。[JSONL index.ts](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/session/session-persistence-jsonl/src/index.ts#L1396-L1449)。

这些切点使 M06 DC04/DC05 的条件分析有源码依据，但尚未建立实现到模型的完整 simulation/refinement 关系。单 ID、不消费、不取消、不删记录、活动 writer、可靠恢复标记，以及一次进程崩溃，是必须保留的抽象前提；更强模式还需要真实适配层提供目标级耐久确认，布尔 durable 不是现有 snapshotEvents 能直接读取的字段。

## 运行器与负对照

运行器检查退出码、精确不变量名称、预期错误行；durable 还要求完整结束、无错误且队列零。它会提取状态计数，但**没有将 81/51、87/52、13/12 或轨迹长度硬编码为验收断言**；本轮另从独立日志比对了这些值。这是范围说明，不是运行器 bug。

本线在 `negative-run/` 仅把 memory 的 `INVARIANTS TypeOK NoLostSent` 改为 `INVARIANTS Init`，其他模型/运行器/配置相同。独立运行后 memory 观察到 Init，TLC 退出12，但 outcome_matches=false；另两配置匹配，整个运行器退出1。见 `negative_receipt.json`、`negative-rerun/`。这实际验证了错误不变量不会因相同 TLC 退出码被误接纳。

该负对照不证明运行器能识别所有损坏日志、工具故障或未来 TLC 格式；当前冻结格式及这项错误替换已经覆盖。无需为本轮再扩大模型或修改产品。

## 交接结论

保持原模型与主要结论即可。最准确的可引用说法是：**固定代码存在 live 去重与持久屏障分离的切点；在明确的 worker→lead、目标未提交、崩溃前未补救且 sent 可恢复的有限模型中，得到丢失接纳记录的反例；更强确认规则在该有限范围通过安全检查。真实宿主的故障路径与后端前提仍未验证。**

M06 的 NOT_RUN 标签属于那条静态研究线，不因本线运行 TLC 就变成产品故障已运行。执行与核查回执、原始日志、输入清单均留在本轮目录，既有 R01–R07 未修改。
