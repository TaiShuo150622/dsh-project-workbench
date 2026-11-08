# C12：冻结导出目录的研究模型复现

2026-11-08 · china 研究线 · 冻结导出 `reader-preview-20261108T101039Z`。

**指定研究模型均可在复制后的导出布局中运行，未发现复现说明中的模型命令错误。** 两份 Lean 输出一致；六份确定性 JSON 结果逐字一致；14 个 TLA 配置的命题、退出码、计数和状态/动作轨迹一致。本轮只增加新布局及派生字节的复现回执，不增加科学命题、主模型配置数或产品测试结果。

先读导出内的 REPRODUCE 与 EVIDENCE，再复制需要的八个研究子目录。源导出及原模型不写入。所有模型结果、状态目录、日志、回执均产生在本线 `execution-copy/`；该执行树留在本机，不整树导入最终包。可导入文件见 [IMPORT_SCOPE.md](IMPORT_SCOPE.md)。

## 输入身份与实际环境

输入清单见 [input-manifest.json](input-manifest.json)。148 个复制文件全部有 DERIVATION 对应，实测导出 SHA 与派生 SHA 一致；其中 40 个历史文档/日志/元数据经过路径脱敏或阅读链接转换。11 个本轮直接调用的 Python/Lean 源文件没有派生字节变化。49 个脚本、规格、配置及输入身份项在执行后仍与复制前一致；这些是相关文件数量，不是运行了 49 个测试。

原 Python bounded 程序自己检查的 FORMAL_MODEL/ARCHITECTURE 两份规格快照 SHA 也通过，未绕过其内部检查。旧 TLA 回执中的日志 SHA 指向原日志字节；本次明确检查它与 DERIVATION.original_sha256 的关系，再检查当前导出日志与 derived_sha256，不能直接把脱敏日志当作旧字节。

| 工具 | 实际观察 |
| --- | --- |
| Python | 3.9.0；进程报告 `x86_64` |
| Lean | 4.35.0，commit `eb6cafb7290e8bd5f2937522d8d804f58f02bafc`；版本行报告 arm64-apple-darwin24.6.0 构建 |
| Java | 17.0.6，Oracle Java HotSpot 64-Bit Server VM |
| TLC | 官方 v1.7.4 jar；实际横幅 TLC2 Version 2.19 of 08 August 2024 |
| TLC jar SHA-256 | `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`，实测吻合复现说明 |

完整环境与二进制指纹见 [tool-versions.json](tool-versions.json)。复用根代理已核验的 Lean 工具链，本次重新检查版本与可执行文件 SHA，没有重新下载或再次核验整个发行归档。不同进程报告的架构如实保留；这是同一台 macOS 的执行，不构成跨平台证明或性能基准。

## 执行与比对结果

实际模型运行从 **10:25:46 UTC 至 10:26:30 UTC**，13 条外层命令均退出 0，没有模型失败或重试。运行器内部的预期反例 TLC 退出 12，是明确检查的目标结果。完整 argv 使用工具占位符保存在 [execution-receipt.json](execution-receipt.json)，原始实际路径日志仅留执行副本。

| 对象 | 本次结果 | 与冻结导出比较 |
| --- | --- | --- |
| DAG Lean | 退出 0；一般定理与源码内具体检查通过 | stdout 一致；公理为 propext、Classical.choice、Quot.sound，未出现 sorryAx |
| Budget Lean | 退出 0 | stdout 一致；公理为 propext、Quot.sound，未出现 sorryAx |
| 原 Python bounded | 动作、支持、预算、验收四类固定域检查完成 | results.json 逐字一致，包含预设坏规则反例；未提高状态上限 |
| EffectContract | 运行器 6 配置＋fence/dedupe 两个正向分项，共 8 | 每配置模型/配置身份、退出码、计数、不变量与轨迹一致 |
| ExpiryContract | 3 配置 | 与修正后的 expiry-checked-results 对比；未拿初次解析失败或故意错误不变量当基线 |
| DurableRelay | 3 配置 | 每配置退出码、完整搜索/预期反例及轨迹一致 |
| C08 progress | 21 配置、162 状态、239 边；11 公平反例、6 错误前缀 | results.json 逐字一致 |
| W11 disputes | 14 定向检查、81 赋值、24 排列、240 异键对、18 政策检查、5 错误策略反例 | stdout JSON 逐字一致；权限仍为 NOT_COMPUTED |
| R12 handoff | 原 5 配置、5076 状态、14172 边；原第二检查器也通过 | results.json 与 verification_receipt.json 均逐字一致；仍共享转移生成器 |
| R14 resource | 7803 个满足准入的合成快照；正确引用模型 180 状态/304 边 | results.json 逐字一致，保留重复扣数变体；不是实际内存测量 |

TLA 合计仍为 **14 个主配置：5 个完整有限安全检查，9 个预期反例**。对完整检查，额外确认完整结束文本、队列为零、没有不变量错误；对反例，确认退出 12、预期不变量和非空轨迹。比较器保留所有 Error 行，不能只靠相同退出码判通过。

[comparison.json](comparison.json)记录 184 条比较条件及逐配置结果。TLC 的新旧原始日志字节不同，原因包括时间、PID、指纹种子及本次执行路径；没有修改日志来追求旧哈希。状态/动作轨迹单独提取后指纹一致，原日志、派生日志和本次日志各有自己的 SHA。

## 启动失败与文件写入边界

首次 sandbox 内 `screen -dmS` 返回 0，但无会话/模型入口；增加入口标记和日志后，记录到 `Cannot exec '/bin/sh': Operation not permitted`。随后经工具批准在沙箱外启动同一组本地模型，入口标记和实际进度确认运行。此前没有模型开始，未重跑已完成工作。此过程见 [launch-receipt.json](launch-receipt.json)，**不计作模型失败**。

模型预期可能超过一分钟，因此使用 detached screen，运行正常后未中断、替换或重启。原代码及配置不改。Python 临时状态目录被定向到执行副本；Java/TLC 仍把随 jar 附带的标准库模块解包到 Java 系统临时目录，这是工具缓存而非模型结果。故本次不声称全文件系统隔离或所有工具临时写入均位于副本。

## 没有由本轮复现覆盖的内容

- 未运行 Record 产品测试、固定 Record 探针、Native/Projects mock 探针、真实 DSH、远端任务、模型 API 或外部效果。
- C08 的独立 SCC/随机图审查、W11 的独立事件集审查、C10 的额外历史账本扩展没有再次运行。R12 原第二检查器在本次指定范围内运行；它不因此变成独立转移实现。
- 未重新运行历史解析失败、运行器错误接受负对照或原独立 Lean 实例；保留其旧回执而不增加本次配置数。
- R12 仍取 R=0，仅终态观察授权入模；跨预算重归属和持续占位是前提。R14 仍使用合成真实使用/上界，不证明物理内存收益。
- 本轮只核模型的导出布局及派生身份。该冻结导出的导航缺陷由根代理另处理，本次不声明全阅读包验收通过。

首次模型失败为 `null`。原导出再次核对未改变。全部复现与比较已结束，不需要为了本报告重跑模型。
