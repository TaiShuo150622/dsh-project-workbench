# EA01 修复的定向复核

**结论：EA01 在本次修订的运行器中已解决。** 复核采用源码阅读及 root 正常运行/隔离负对照的原始证据校验，没有重新执行 TLC；原模型、cfg 与本线独立复跑结论仍然有效。

修订后 `run_expiry.py` SHA256：

`7c4b0ade1401f863c9a47a4052f1dd3dd93565e4a86bb50c479b3fa55582ea0c`

完整修复输入固定于 `repair-inputs/`，清单见 [REPAIR_INPUT_MANIFEST.json](REPAIR_INPUT_MANIFEST.json)，复核结果见 [repair_verification_receipt.json](repair_verification_receipt.json)。旧版本仍在 `inputs/formal-spec/`，本报告不覆盖旧版反例。

修订代码新增 observed_violations、state_counts、outcome_matches；none/admission 要求退出12且唯一违例是 NoDuplicate，错误行也必须匹配预期的违例与轨迹提示；commit 要求退出0、没有错误或违例、有完整检查结束标志、存在计数且队列为0。最终按各项 outcome_matches 判断整套是否成功，不再只比较退出码。

本线核对了以下具体证据：

| 运行 | none | admission | commit | 整套结果 |
| --- | --- | --- | --- | --- |
| 原配置正常运行 | NoDuplicate，outcome_matches=true，109/59/3 | NoDuplicate，true，131/81/8 | 无违例，true，115/66/0 | 三项均匹配 |
| none改为检查Init的隔离负对照 | Init，outcome_matches=false，2/2/0 | NoDuplicate，true，原计数 | 无违例，true，原计数 | 退出1，正确拒绝 |

表中三个计数依次为 generated/distinct/queue remaining。正常运行模型和cfg散列与原冻结输入一致；负对照 fixture 中 runner 与修订源码逐字节相同，none cfg 正好是将 `INVARIANTS TypeOK NoDuplicate` 替换成 `INVARIANTS Init`。所有已读取日志散列与相应收据一致，原日志中的违例名与收据字段一致。

这次修复阻止已展示的“错误不变量同样退出12却被当成预期反例”的情况。它不替代模型/cfg 的语义审查，也不证明未来所有解析器格式、运行器故障或源文件并发修改都被覆盖；这些不属于EA01的已发现问题或本次定向结论。

本复核是模型审查，非人类审核。本线未改 root 修复源码、模型或配置，未额外重跑相同 TLC 检查。
