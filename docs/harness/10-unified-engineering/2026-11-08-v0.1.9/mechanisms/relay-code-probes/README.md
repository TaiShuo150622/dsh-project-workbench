# M07：真实方法与模拟持久层的条件代码探针

2026-11-08 · mechanisms 研究线

已运行 5 个探针，5 个断言组通过。这里执行的是固定源码副本中的真实方法，以及明确可控的 fakehost / fakepersistence / fakestore；没有运行真实 DSH、真实持久层、业务任务、网络发送或进程故障。通过表示声明的条件行为得到观察，不表示产品修复、宿主验收或真实丢消息复现。

## 输入与最小切面

工作台基线固定为 `7264be10387963f4d575d8688ed8573f4c16c8c4`。通过 git show 复制两份完整文件，仅把文件扩展名改为 .mjs 以独立选择 ESM，内容逐字节不变：

| 原路径 | 研究副本 | SHA256 |
|---|---|---|
| server/native.js | [inputs/native.mjs](inputs/native.mjs) | 0b5ba4a2cad4e301273f499e0a91a27661d740781118d8e4897cb08a2b6b4400 |
| server/projects.js | [inputs/projects.mjs](inputs/projects.mjs) | 565ab91d3c9cba7e1d171844d719ee04d4a6f4288673e073143f1454c7839713 |

详细 git blob、大小与复制方式见 [input-manifest.json](input-manifest.json)。运行前脚本校验上述硬编码 SHA 与清单。它没有导入工作区产品入口，也没有调用真实 Store。

实际方法切面为 Native.deliver / accepted，以及 Projects.prototype.flush 和 action 的 retry_delivery 分支。Projects 方法以最小 receiver 调用；kick 只写入模拟轨迹，不启动调度器。未调用 Projects.create/start/drive、Native.create/user/stop，也未创建任何实际会话或工作树。

## 模拟接口及其承诺

模拟语义就是探针的输入条件，不能反过来当作宿主实现证据。M06 已核的实际 DSH 边界另见 [原研究稿](../durability-boundary/持久状态与发送效果边界讨论稿-v0.1.0.md)；本轮保持 M06 原件不变。

| 接口 | 明确定义 | 没有模拟的内容 |
|---|---|---|
| FakeHost.resolveAgent / snapshotEvents / inbox / followup | 单个合成目标；followup 同步记录 live inbox splice。 | 真实 agent 驱动、模型调用、后台任务、所有 inbox 竞争。 |
| FakePersistence.flush | success：把 liveEvents 复制到 retainedEvents；target_no_commit：不复制而拒绝；other_writer_failure：先复制目标，再因另一个模拟 writer 拒绝。 | DSH 文件格式、文件同步、目录同步、回滚、操作系统与设备。 |
| FakeStore.change | 顺序地 clone→执行真实回调→发布内存状态；可在首次 sent 标记发布前失败，后续错误状态写入正常。 | 真实 Store 队列、文件写入、跨进程锁、rename、掉电行为。 |
| retainedEvents / retainedState | 仅是同一 Node 进程里的模拟保留副本，用来区分逻辑层。 | 真实磁盘或跨进程耐久性。 |
| forgetVolatileOnly | 清空模拟 live 数组，保留模拟 retained 数组。 | 没有 kill、重启或断电，不是实际崩溃试验。 |
| retry_delivery.kick | 记录“不调度”；之后由探针显式调用真实 flush。 | 没有搭建大假调度器。 |

## 探针与结果

[results.json](results.json) 保存每项前提、断言、观察快照、方法回执及调用轨迹；`actual_execution=true` 仅指该模拟探针执行，真实宿主和持久层执行字段均为 false。

| ID | 区分的问题 | 观察与断言结果 |
|---|---|---|
| RP01 正对照 | 新 ID 正常保存，再次投递已保留 ID。 | followup=1、flush=1；目标模拟保留=true、outbox.sent=true；重复请求没有新增投递。 |
| RP02 | 已有 live ID，但没有模拟保留记录。 | Native.deliver 正常返回且 flush=0；并未因此获得目标模拟保留记录。 |
| RP03 | lead 汇报 relay 的目标首次保存失败，同 ID retry_delivery。 | 初次记录错误；真实 retry_delivery 清错；第二次因 live ID 早退而不再 flush，但真实 Projects.flush 标 sent。逻辑内存清除后，模拟保留副本为 sent=true / 目标无消息。 |
| RP04 对照 | 目标模拟保存成功，但其他 writer 导致全局 flush 拒绝。 | 初次同样记录错误；同 ID 重试后 sent=true，而且目标已有模拟保留。说明整体 flush 异常不能证明目标没收到。 |
| RP05 | 目标模拟保存成功，但首次 sent 标记写入失败。 | 真实 catch 再写错误；worker 从 running 变为 failed，文字使用“消息尚未投递”；目标模拟保留仍为 true。 |

RP03 选 worker→lead 汇报，避免给 worker 的失败路径 phase 门禁改变同 ID 可达性。它还明确假定目标写未提交、没有后续成功 drain、模拟 Store 的标记独立保留。实际系统是否同时满足这些条件，需要真实宿主与存储 profile 的独立证据。

所有 Projects.flush 调用在内部错误已被 catch 并记录时仍 fulfilled；这份“方法回执”与消息成功、业务成功是不同概念。结果中没有真实外部业务效果。

## 复核与范围

可审阅 [run-probes.mjs](run-probes.mjs)。如需重跑，仅在该研究目录对应环境执行此文件；它只写同目录 results.json，会覆盖该研究结果文件：

```text
node docs/research/harness-20261107/mechanisms/relay-code-probes/run-probes.mjs
```

本轮只执行一次探针，结果记录实际 Node 版本与 UTC 时间；之后仅做 stdlib 清单核对。源 SHA 不符时会在导入前拒绝。源副本的身份验证不是第三方代码安全审计。

[validation.json](validation.json) 记录输入副本与 git 对象一致、结果 schema/ID/断言及本地链接检查，以及 M06 既有清单摘要未变。没有修改产品代码，没有提交或推送。

