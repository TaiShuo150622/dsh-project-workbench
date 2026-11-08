# 复跑说明与工具边界

本页给出研究核查的最短复跑路径。建议先读 [EVIDENCE.md](EVIDENCE.md)，再选一项核查；不必为了阅读重跑全部枚举。所有命令在解包后的研究根目录执行，新的输出放在单独目录，不覆盖本轮原始回执。

## 环境与版本

| 工具 | 本轮实际版本 | 用途与获取依据 |
| --- | --- | --- |
| Python | 3.9.0，标准库 | 有限模型、运行器和研究回执；脚本不需要模型 API |
| Lean | 4.35.0，commit `eb6cafb7290e8bd5f2937522d8d804f58f02bafc` | [官方发行](https://github.com/leanprover/lean4/releases/tag/v4.35.0)；本轮用 macOS arm64，其他平台选同版对应包 |
| Java | 17.0.6 | 运行 TLC；保留实际 java -version 输出 |
| TLC | tla2tools 官方 release v1.7.4；启动横幅为 TLC2 Version 2.19 | [官方 jar](https://github.com/tlaplus/tlaplus/releases/tag/v1.7.4)；release 标签与引擎横幅不是同一编号 |
| Node | v24.6.0 | 运行固定 Record 输入与派生探针，不启动服务器 |

TLC jar SHA-256：`936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`。本轮 Lean macOS arm64 归档 SHA-256：`c0c6f34f35ba1dcc5c4a5fd106fefab9eb5e8469712624dd2c868d51b63177c2`。不同平台的 Lean 归档有不同哈希，应核对其对应官方资产；不要把 macOS 哈希当成所有平台值。包内不携带工具二进制。

下面假定 `LEAN_BIN` 和 `TLC_JAR` 已由使用者指向实际工具文件；它们没有内置本机私有路径。`research-rerun` 是新的输出目录。先确认该目录不会覆盖已有成果。

## 两项一般证明

```sh
"$LEAN_BIN" dag-proof/IncrementalDag.lean
"$LEAN_BIN" china/budget-proof/BudgetSafety.lean
```

预期退出码均为 0，打印的公理依赖中没有 `sorryAx`。DAG 使用 `propext`、`Classical.choice`、`Quot.sound`；预算使用 `propext`、`Quot.sound`。阅读自然语言假设和形式陈述仍不可省略；编译不证明真实系统满足前提。

原回执见 [DAG](dag-proof/compile_receipt.json)、[预算](china/budget-proof/execution_receipt.json)，独立实例见 [审查说明](proof-review/general-proof-audit/REVIEW.md)。文件末尾的具体例子是辅助说明，一般结论来自定理本身。

## Python 有限模型

```sh
python3 china/bounded-models/model_check.py --output-dir research-rerun/python-models
```

程序先核对两份规格快照的哈希，再枚举有限图。预期退出码为 0；`checks_passed=true` 表示正确规则在固定域内通过，且预先设定的坏规则出现反例。原始结果和轨迹位于 [bounded-models](china/bounded-models/README.md)。达到程序状态上限属于失败，不能删去限制后把未结束运行当作通过。

## TLA+ 模型

```sh
python3 formal-spec/run_tlc.py --jar "$TLC_JAR" --output-dir research-rerun/effects
python3 formal-spec/run_expiry.py --jar "$TLC_JAR" --output research-rerun/expiry
python3 formal-spec/run_relay.py --jar "$TLC_JAR" --output research-rerun/relay
```

这三条运行器命令覆盖 6 + 3 + 3 个配置，均应退出 0；底层 TLC 在预期反例配置会退出 12。运行器必须同时确认目标不变量，不能只比较退出码。另两个分项正向配置在独立的新 metadir 运行：

```sh
java -Xmx512m -cp "$TLC_JAR" tlc2.TLC -workers 1 -config formal-spec/fence-property.cfg -metadir research-rerun/fence-state formal-spec/EffectContract.tla
java -Xmx512m -cp "$TLC_JAR" tlc2.TLC -workers 1 -config formal-spec/dedupe-property.cfg -metadir research-rerun/dedupe-state formal-spec/EffectContract.tla
```

这两个应退出 0，显示完整检查结束及队列为零。加起来才是主稿所说的 14 个主配置。若不同版本 TLC 的日志格式改变，应先解释差异，不能悄悄放宽运行器使其“通过”。配置、完整日志和 SHA 比较比状态数单独相同更有信息。

原始入口为 [效果和期限模型](formal-spec/README.md)、[接纳模型](formal-spec/RELAY_README.md)。首次解析失败、修复后的重跑与错误不变量负对照均保留，不能拿失败前的空结果替代完成核查。

## 固定 Record 探针

```sh
node china/record-refinement/refinement-probes.mjs
```

探针只导入 `inputs/` 中固定的个人项目源码，先验证输入 SHA，结果输出到 stdout。预期 8 个 case、0 个 harness assertion failure；五个映射差异和三个控制各有具体含义。RF03 的原始探针字节保留，但解释以 [REPORT-v0.1.1.md](china/record-refinement/REPORT-v0.1.1.md) 为准。若需要复跑那 20 条既有测试，准确的 Node argv 和文件清单在 [execution_receipt.json](china/record-refinement/execution_receipt.json)；不要把整个其他版本测试集的结果混进这 20 条。

## 条件代码探针

[relay-code-probes](mechanisms/relay-code-probes/README.md) 的脚本会写同目录 `results.json`，请先复制整个目录到新的复跑位置再执行 `node run-probes.mjs`，保留原回执。它验证固定 Native/Projects 的方法控制流，预期 5 个探针、22 个断言通过；持久层及宿主接口是明确的 fake。即使 PASS，也没有在真实 DSH 后端复现数据丢失。

## 推进与终止的有限图

将整个 `china/progress-conditions/` 复制到一个新的复跑目录，再执行其中的 `python3 check_progress.py`；程序会写同目录结果与回执，不能直接覆盖保管的原件。预期为 21 个配置、162 个状态、239 条显式边，11 个公平闭环反例和 6 个错误前缀，所有预设判据满足。这不是原 14 项 TLC 的新增配置，也不是实际调度器测试。

如需核对独立搜索算法，另复制 `proof-review/progress-audit/` 并运行其中 `python3 oracle_check.py`。它使用冻结输入图，以 SCC 方法核对存在性、直接枚举核对最短见证，并检查 1,200 个固定种子随机小图及针对性变异。输入图和事件含义仍与原模型共享；不能据两个算法一致声称产品模型完整。[独立方法与边界](proof-review/progress-audit/REVIEW.md)

## 如何比较新旧回执

### 争议证据、接管与资源条件

下面三组使用 Python 标准库，分别属于独立的小模型，不加入原 14 项 TLC 配置或两项 Lean 证明计数：

| 核查 | 新目录中执行的入口 | 应比较的结果 |
| --- | --- | --- |
| 四态证据 | `west/evidence-disputes/bounded_check.py` | stdout 中 14 个定向检查、81 赋值、24 排列、240 异键对、18 政策检查与 5 错误策略反例；行动权限仍 NOT_COMPUTED |
| 责任与费用接管 | 先复制 `proof-review/handoff-composition/`，再运行 `check_handoff.py` 和 `verify_handoff.py` | 5 配置、5076 状态、14172 边及指定反例；R=0，只覆盖终态观察授权，其他主体/Grant 未表示 |
| 资源条件 | 先复制 `proof-review/resource-audit/`，再运行 `check_conditions.py` | 7803 个满足准入的合成快照；正确引用模型 180 状态/304 边；重复扣数反例不属于真实内存测量 |

接管及资源脚本写同目录的结果/回执，必须先复制，保管原件不运行原地覆盖。争议证据脚本只向 stdout 打印，可重定向到新复跑目录；不能把名字与输出字段中的 independent 误读成真实权限或世界真值 oracle。

进一步核查可分别复制 [争议证据独立审查](proof-review/evidence-dispute-audit/REVIEW.md)或[接管审查](china/handoff-audit/README.md)所在整目录，使用其中列明的程序与输入。前者独立构造事件集投影，后者保留原转移并另写账目/边与反向路径检查；各自共享的部分在审查中说明。M08 的协议六见证、M09 的三条跨层构造轨迹和资源六类真实场景仍未运行，不能用这些小模型代替。

### 回执比较纪律

先比较源码与配置 SHA，再比较命题、固定输入、状态/转移计数、实际反例及退出原因，最后比较输出字节。时间、临时路径和工具横幅可能使完整日志哈希变化；不要为了哈希相同改写原始输出。若分享副本替换了个人路径，使用派生映射核对其身份，原回执字段记录的是历史输入，未自动更新成新执行证据。

不要从这些命令得到以下结论：真实 DSH 后端崩溃已复现、任意目标效果仅一次、权限服务线性一致、全部实际成本可硬封顶，或长期任务必定完成。要取得这些证据，需要按 [实施任务书](west/implementation-taskbook/可信入口与Coding交付实施任务书讨论稿-v0.1.1.md)接入实际观察与目标系统。
