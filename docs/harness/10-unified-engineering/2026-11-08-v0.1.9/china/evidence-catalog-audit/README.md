# C-05 · 来源目录结构盘点与去重方案

快照截止：**2026-11-08T08:11:42.547893+00:00**。本轮只读 integration 的 JSON 元数据，网络请求为 0；没有重新核查这些来源的正文或当前身份。输入文件内容已保存并记录 SHA-256；后续新增文件不包含在这份快照中。

## 盘点口径与数量

扫描 `integration/docs/research/harness-20261107` 的 110 个 JSON：纳入 **10 份原始 sources.json**、**4 份 ROOT_SOURCE_REVIEW（含 _4）**；另外 96 个为结果、清单、模型/测试输入、工具链或仓库基线元数据。所有 `inputs/` 下的冻结副本排除出新来源计数。完整纳入/排除列表及文件散列见 [catalog-inventory.json](catalog-inventory.json)。

| 原始来源目录 | sources 条目 |
| --- | ---: |
| `china/sources.json` | 57 |
| `foundations/sources.json` | 12 |
| `mechanisms/cordis-boundary/sources.json` | 15 |
| `mechanisms/lifecycle-migration/sources.json` | 6 |
| `mechanisms/sources.json` | 41 |
| `mechanisms/work-improvement/sources.json` | 10 |
| `west/authority-scope/sources.json` | 5 |
| `west/context-evaluation/sources.json` | 18 |
| `west/practitioner-views/sources.json` | 12 |
| `west/sources.json` | 39 |

| 计数口径 | 数量 | 可据此声称什么 |
| --- | ---: | --- |
| 原始 sources 数组条目 | 215 | 包含 1 条明确未采用的不可访问候选；不是“全部正文已读”数量 |
| 这些条目的精确主 URL | 200 | 去掉 15 次重复 URL 引用；每个原条目的主张/读取范围仍保留 |
| 展开 primary_documents / paired_file 后的文档引用 | 222 | 215 + 6 + 1；同一正文可以在父条目和子条目重复出现 |
| 展开后的不同精确 URL | 205 | 12 组重复，重复引用余量 17；不是独立研究或已验证产品数 |
| 目录内所有 URL 字符串 | 247 次 / 222 个不同值 | 另含 PDF、固定源码 permalink、身份依据、失败/排除候选；不混入主文档计数 |
| 根代理复核 | 38 条 / 37 个不同精确 URL | 是额外读取记录，不是相同数量的新来源或独立佐证 |
| 原主文档加根复核的不同精确 URL | 225 | 仍含同一作品的 HTML/abs 和不同 fragment；不能称为独立作品数 |

“精确”按原字符串比较，保留 fragment、query、大小写与版本；没有访问跳转、猜测 URL 等价或默认把无版本地址等同最新版本。

## 可直接用于合并索引的输出

- [source-inventory.json](source-inventory.json)：每条来源的原文件、JSON pointer、原 ID、URL、归属字段、日期语义、证据性质、读取声明、定位、版本、支持主张与限制；保留原条目，另列嵌套正文和所有 URL 出现位置。
- [dedup-plan.json](dedup-plan.json)：精确 URL 重复组、只能关联不能直接合并的表示/行范围组，以及短 ID 碰撞。
- [root-cross-review-index.json](root-cross-review-index.json)：根复核与作者条目的 URL/fragment/permalink 匹配；相同 arXiv work+version 的不同表示只记 related。
- [identity-opinion-bindings.json](identity-opinion-bindings.json)：21 条身份依据关系、6 个明确的人物观点组，保留时间归属和联合作者等限制。
- [field-issues.json](field-issues.json)：缺字段、格式歧义、明确未读正文项，以及没有作者目录对应项的根代理来源。
- [execution_receipt.json](execution_receipt.json)：快照时间、脚本散列、输入在捕获期间是否变化、零网络调用。

原短 ID 不是全局键：`P01` 同时出现在 west 主目录和 practitioner-views；即使恰好引用同一采访，也不能据此把其他本地 ID 引用跨目录解析。建议稳定条目键使用 **原文件相对路径 + 文件 SHA + JSON pointer**，原 ID 只作为显示名与原目录内关联键。

## 去重只合并地址索引，不合并证据判断

可以建立 SourceDocument 的地址索引，但每个 SourceAssertion 继续保留原主张、定位、版本与限制；ReadingObservation 分别保存作者声明与根代理复核。相同 URL 的两次记录不是两个独立信息源，合并 URL 也不应删除第二次读取记录。

具体不能直接合并的情形：

1. **Cordis 同一论文、不同阅读范围。** 同一个 arXiv v1 地址被中国线、从业者观点、机制证明阅读和生命周期稿引用。身份元数据、选定证明、§7.3 续接边界不是同一种证据；不能累加成“全部 92 页已审”。PDF 总页数也不是已读页数。
2. **相同源码、不同 locator。** AFlow 作者目录主 URL 指向 optimizer 的外层轮次，root _4 指向内层生成循环，并另记 110–190 的读取范围。Cordis Fiber 的广域阅读与 681–746 生命周期范围也须分别保留。fragment 与显式 location 不必完全同宽，不应相互覆盖。
3. **论文的 abs / HTML / PDF 表示。** root _4 的 Reflexion v4、ExpeL v3、AFlow v4 与作者目录为同作品同版本的不同表示；可以关联书目身份，但本轮没有做正文等价校验，不能合并读取范围或把 root 的局部重读写成作者逐页审查。
4. **动态文档入口与固定 permalink。** M-05 Temporal/DBOS 用产品文档 URL 作主地址，并另给固定提交正文。合并索引必须保留提交/文件/读取范围；动态 URL 相同不代表不同时间读取了相同内容。
5. **不同或未固定版本。** 当前盘点没有从相同地址推导版本等价。以后若同一仓库路径出现不同 commit、同一 arXiv ID 出现不同 v 或无版本 URL，应建立不同版本记录，只有显式对应关系才能关联。

根 _3 的 AWS 幂等文章，以及根 _4 的 Anthropic advanced-tool-use、code-execution-with-mcp、Claude SDK tool-search，共 **4 个来源只有根阅读记录**。它们保留为 root-only source observations，不能补造原作者已读记录。现有回执没有完整 title/作者/发布日期字段，末次合并时应由根代理补全或如实标未提供。另有 3 个无精确 URL 匹配的 arXiv HTML 地址已关联同作品同版本，不计入这 4 个 root-only 来源。

## 未读正文、身份归属和字段歧义

明确没有读到正文的记录共 3 条：

- foundations 的 Penn provenance 下载候选：明确写 `search-discovered`、正文 403；F-04 是替代来源，不使原地址变成已读。
- foundations 的 Princeton 1987 论文候选：正文 403；另用 Cornell 托管原论文，不冒充原地址已读。
- china `CN-MISS-01` 的 SuperAgent 微信原文：不可访问，未采用作者/性能主张。它仍在 sources 数组中，所以 215 不能写成 215 条已读并采用的来源。

practitioner-views 的 Reddit 候选属于**原帖正文可见但观点/身份依据不足而排除**，不应放进“未读正文”桶。

99 条条目没有单独的读取状态字段，主要依赖目录级方法声明；115 条有条目级读取声明，另 1 条明确不可访问。缺少条目状态不等于未读，也不能因此默认为全文审查。正文已读、局部源码阅读、测试定义阅读和实际运行必须保持不同标签。

员工归属与观点分别关联：Tianyi Cui、wenshao、汪晟杰的观点条目用本目录 affiliation_sources 指向身份依据；西方观点目录另有 identity_sources 与 dated views。自引用的官方作者栏可以同时提供身份与正文，但两种证据角色仍分开。林骏旸的个人文章保留“文章日期公司归属未确认”；旧 Qwen 归属不会自动把它变成该公司员工的同期观点。论文联合作者也不能转换成每个人分别发表了同一句观点。

字段差异已经保留原值后归一化：作者/机构有多种键，日期有 publication/published/accessed 和带 kind 的 date，证据类别有 category/kind/type/view_category。**140 条没有出版/网页日期类值**，很多另有固定提交日期；52 条没有单独 locator；M-05 的 6 条没有单独证据类别字段但明确给出静态阅读范围；C-COMMIT 缺作者/机构字段而已有 repository 归属。详单见 field-issues。这些是元数据缺口，不一概判为证据无效。

日期必须看语义：例如 last_updated、活动日期、提交日期、arXiv submission 和实际访问时间分别保留，不能都展示为“发布日期”。访问日期也没有替补缺失的出版日期。

## 复跑与边界

在原 china 工作树的本目录执行：

```sh
shasum -a 256 -c SHA256SUMS
python3 audit_sources.py
```

先核验原快照，再在审查副本中复跑；脚本会更新自身目录中的清单和时间回执，原 SHA256SUMS 不适用于更新后的输出。也可显式传入 integration 的研究目录。脚本只读取该目录，写入自身目录，不修改原 JSON。重新盘点一个持续变化的 integration 会得到新截止时间与文件数量；本快照应以 inputs、catalog-inventory 的散列和 execution_receipt 为准，不把不同截止时间的计数混在一起。

这份结果是来源索引的结构审计，不是第二次事实核验，也没有把 root cross-review 提升为独立实验、当前员工身份或产品运行证明。
