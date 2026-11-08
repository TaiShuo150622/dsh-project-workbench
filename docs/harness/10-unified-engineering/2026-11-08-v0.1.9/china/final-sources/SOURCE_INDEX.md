# 按工程问题找来源

公司、模型宿主、开源机制、作者观点与形式基础的原主体入口在 [C07 SOURCE_INDEX](../consolidated-sources/SOURCE_INDEX.md)。本页补后续材料，不将“作者读过”“root 又核过”“此处建了索引”累加成三份独立证据。

| 想解决的问题 | 先读什么 | 来源身份与读取边界 |
| --- | --- | --- |
| 可信入口如何绑定调用者、历史与命令 | [W10 入口映射](../../west/trusted-entry-map/MAP.md)，[来源表](../../west/trusted-entry-map/sources.json) | 工作台固定提交 15 份文件、DSH 固定提交 8 份文件，加 1 份本地任务书输入。保留 FULL、SELECTED、STRUCTURAL_COMPARISON_ONLY 等逐项范围；静态检查不是宿主运行验收。root 第六批是同提交两个范围的复核。 |
| 长任务为什么可能一直运行却不完成 | [C08 推进与终止条件](../progress-conditions/自主推进与终止条件讨论稿-v0.1.0.md)，[形式来源范围](../progress-conditions/sources.json) | Lamport 原著的公平性、实时条件与时间前进部分选读；不是全书核读。root 第七批是另一份选读观察。L1–L4 是本轮条件推导，不能归给原著或计作新一般机器证明。 |
| 支持与反对证据怎样并存，来源怎样撤回 | [W11 证据争议讨论](../../west/evidence-disputes/Record证据争议与修正讨论稿-v0.1.0.md)，[来源表](../../west/evidence-disputes/sources.json) | 2018 四值逻辑文章、2007 Provenance Semirings 的指定页段；两项均为联合作者论文。1977 Belnap 原章未读。逻辑值、派生路径与操作权限/统计独立性不能互相代替。root 第八批只核声明范围。 |
| MCP、A2A 与本地适配器的状态和取消能否直接对应 | [M08 跨宿主协议](../../mechanisms/interop-contracts/跨宿主协议与有损适配契约讨论稿-v0.1.0.md)，[版本化来源](../../mechanisms/interop-contracts/sources.json) | 10 项声明分别保留官方版本页面、固定提交文件和选读行。MCP 2025 与 2026 的任务语义、A2A v0.3.0 与 v1.0.1 不合并。固定源码不是已部署 SDK 行为。 |
| A2A 同版本文档与 proto 的绑定差异 | [root 第八批复核](../../ROOT_SOURCE_REVIEW_8.json)，[M08 来源](../../mechanisms/interop-contracts/sources.json) | v1.0.1 固定提交下 specification.md 与 a2a.proto 是两个文件；已记录订阅绑定 POST/GET 差异。它们不是两篇独立论文，也不能当作同一份完全一致内容去重。正文声明与 root 重读范围各自保存。 |
| 环境冻结、资源限额、子进程和共享缓存是什么关系 | [资源生命周期讨论](../../resource-lifecycle/资源归属与环境生命周期讨论稿-v0.1.0.md)，[来源表](../../resource-lifecycle/sources.json) | Linux cgroup v2、Node v24.6.0 child_process、Docker classic overlay2 的选段。Node 持续更新的官方文档入口读取失败，采用固定发行版 GitHub 文档。root 第九批是这三条已用来源的同轮记录镜像，不新增三次独立读取。 |
| 消息接纳与持久化边界有哪些代码依据 | [接纳独立审查](../../proof-review/relay-durability-audit/REVIEW.md)，[源指纹](../../proof-review/relay-durability-audit/SOURCE_MANIFEST.json)，[root 第五批](../../ROOT_SOURCE_REVIEW_5.json) | 三份工作台、七份 DSH 固定文件，与 M06/W10/root 有重叠。该 SOURCE_MANIFEST 只给身份，不给逐文件阅读范围；不得用别处范围替它声称十份全文重读。 |
| 旧设计决定如何进入本轮统一工程 | [W12 设计沿革](../../west/design-continuity/README.md)，[沿革阅读清单](../../west/design-continuity/reading-list.json)，[W09 旧覆盖表](../../west/historical-coverage/COVERAGE.md) | W09 为 20 条阅读/导航记录；W12 为 43 份文件记录（38 份旧档案、5 份本轮研究）。记录可能重叠，不能相加为唯一文件数。历史方案、任务卡元数据与当前实现分开。它们不进入外部文章数。 |

这些主题之外，员工身份与观点的旧核查仍从 [C07 归属关系](../consolidated-sources/identity-opinion-bindings.json)查：身份出处与个人观点是两种绑定，联合作者报告不能拆成数个独立个人主张。本增补没有声称新的员工身份或当前在职关系。

精确追溯的方法：在 [supplement-index.json](supplement-index.json) 找 topic 或 original_id，读取 `origin.file`、`file_sha256` 和 `json_pointer`，回到研究根下对应原 JSON；`reading_declaration` 是原声明，`catalogue_dates` 是记录日期，`version_binding` 保存提交/发行版及内容指纹。再用 [reading-relations.json](reading-relations.json)看谁复核了哪个范围，用 [union-url-index.json](union-url-index.json)查同地址的各次出现。这里的索引不代替原文判断。

未采用与未知范围保持可见：旧 C07 的 4 个候选记录保留；增补明确保留 1 个失败 Node 页面地址及其镜像。未列出 URL 的搜索线索不补造条目数量。W10 结构比较、R08 无范围的指纹记录、W12 卡片元数据都不能升级成完整正文阅读。
