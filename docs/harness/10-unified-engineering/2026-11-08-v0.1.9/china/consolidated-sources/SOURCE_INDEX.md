# 来源索引：先选择问题，再核对证据

这份入口对应 2026-11-08 08:35:43 UTC 捕获的来源元数据。下面的主题稿用于理解研究结论，冻结的 `inputs/` 用于还原本轮具体引用。主题稿本身不是第三方原始来源，也不因此增加来源数量。

## 1. 公司、产品与宿主机制

先读 [中国 Harness 机制核查讨论稿](../中国Harness机制核查讨论稿-v0.1.0.md) 和 [西方 Harness 机制核查讨论稿](../../west/西方Harness机制核查讨论稿-v0.1.1.md)。前者覆盖 DeepSeek Harness、腾讯相关 agent/coding 方案、Qwen-Agent 与 Qwen Code；后者覆盖 Codex、Claude 及相关 agent 框架。查原始证据时分别进入 [中国目录快照](inputs/china/sources.json) 与 [西方目录快照](inputs/west/sources.json)。

阅读范围是官方契约、选定固定提交的源码路径、公开署名文章或访谈中与问题相关的段落。每一类都有各自限制：文档承诺不能直接扩大到所有适配器；源码存在不能证明当前部署启用；员工观点不能替代产品规范。报告中的“本轮未找到”也不等于“产品不支持”。

## 2. 状态、恢复、权限与外部效果

| 要回答的问题 | 先读讨论稿 | 再查原始目录与范围 |
|---|---|---|
| 恢复、取消、unknown、幂等、调度有什么现成机制与反例？ | [机制对照与反例](../../mechanisms/机制对照与反例讨论稿-v0.1.0.md) | [机制目录](inputs/mechanisms/sources.json)：固定源码路径与官方文档；未运行这些上游实现 |
| 结果可见性、主体权限、委托和批准如何绑定？ | [主体权限与结果可见性](../../west/authority-scope/主体权限与结果可见性讨论稿-v0.1.0.md) | [权限目录](inputs/west/authority-scope/sources.json)：5 个来源家族展开为多个主文档；规范与我们的设计提案分开 |
| 长期任务跨版本续接能保证到哪一层？ | [长期任务跨版本续接](../../mechanisms/lifecycle-migration/长期任务跨版本续接讨论稿-v0.1.0.md) | [M-05 目录](inputs/mechanisms/lifecycle-migration/sources.json)：6 组，保留 docs 版本、固定源码及 Python/TypeScript 配对文件 |
| 组合和生命周期约束能否直接保证外部效果？ | [Cordis 组合与外部效果边界](../../mechanisms/cordis-boundary/Cordis-组合与外部效果边界讨论稿-v0.1.0.md) | [目录](inputs/mechanisms/cordis-boundary/sources.json)及[读取范围说明](../../mechanisms/cordis-boundary/READING_COVERAGE.md)：选定定理、证明与固定源码，未执行实现 |
| 落盘、确认、发送与 outbox 的先后如何区分？ | [持久状态与发送效果边界](../../mechanisms/durability-boundary/持久状态与发送效果边界讨论稿-v0.1.0.md) | [M-06 目录](inputs/mechanisms/durability-boundary/sources.json)：4 组，其中 B0 是 14 个代码文件，另有 Node.js、Linux 手册和 AWS outbox 文档 |

M-06 的 B0 逐文件记录 `workbench` 与 `dsh`，有固定 commit、blob、路径、行范围和静态取回说明。工作台链接由仓库、commit 和 path 构造；本轮索引没有确认该 commit 已在远端可读。Linux 手册的日期不是本机 macOS 的持久性证明。AWS outbox 是公开设计说明，不是本工作台已具备该实现的证明。

## 3. 论文、上下文选择与工作方式

[Record 上下文与任务收益评价](../../west/context-evaluation/Record上下文与任务收益评价讨论稿-v0.1.0.md) 对应 [18 条目录记录](inputs/west/context-evaluation/sources.json)；[自主推进与工作方式改进](../../mechanisms/work-improvement/自主推进与工作方式改进讨论稿-v0.1.0.md) 对应 [10 条目录记录](inputs/mechanisms/work-improvement/sources.json)。这些入口用于区分上下文是否被使用、任务收益是否改善，以及工作选择和经验改进需要什么评价。

论文的摘要、方法、结果、预算和限制，以及源码中的相关函数，各自保留读取范围。读过相关章节不等于全文逐页审计；文中报告的实验不是本轮复现。本轮没有为这些研究调用模型 API、下载数据集或执行第三方模型实验。arXiv 的 abs、HTML、PDF 可能属于同一篇同版本作品，但这里不会据此合并阅读范围或断言正文完全等价。

## 4. 作者观点：先确认谁在什么时候说了什么

中国三组观点见[中国讨论稿中的员工公开观点部分](../中国Harness机制核查讨论稿-v0.1.0.md)，西方与补充观点见[工程作者观点归属与设计取舍](../../west/practitioner-views/工程作者观点归属与设计取舍讨论稿-v0.1.0.md)。机器关系见 [identity-opinion-bindings.json](identity-opinion-bindings.json)，原始字段分别在[中国目录](inputs/china/sources.json)与[观点目录](inputs/west/practitioner-views/sources.json)。

| 人或作者组 | 原目录入口 | 归属方式与限制 |
|---|---|---|
| Tianyi Cui / tianyicui | 中国 `CN-PE-DS-01`，身份 `CN-PE-DS-02/03` | 2026-08-30 个人公开迁移 skill 提议；不证明该 skill 已发布 |
| wenshao | 中国 `CN-PE-QW-01`，身份 `CN-PE-QW-02` | 2026-03-02 个人使用报告；同一 issue 的 yiliang114 后续维护者回应是另一个发言主体，不由 collaborator 标签推断其雇佣关系 |
| 汪晟杰 | 中国 `CN-PE-TX-01`，身份 `CN-PE-TX-02` | 2025-09-10 原访谈；Tina 是采访/编辑角色，不能把所有发言混为联合作者结论 |
| Michael Bolin | 观点 `V1` / `P01–P02` | 个人访谈与同期官方署名身份分开；不推定 11 月现职 |
| Ryan Lopopolo | `V2` / `P03` | 官方署名工程经验；不自动成为所有产品场景的契约 |
| Justin Young | `V3` / `P04–P05` | 官方文章作者与职位时间证据分别保留，职位的精确时间有限制 |
| Prithvi Rajasekaran | `V4` / `P06` | 官方署名工程实验；报告实验与本轮复现分开 |
| Yifan Shi、Wei Zhang、Tianyi Cui | `V5` / `P07–P08` | **联合研究**；保留论文列出的各人单位，不拆成三条个人独立表态 |
| Junyang Lin | `V6` / `P09–P12` | 个人文章；既往 Qwen 归属不证明文章发表时的公司身份，未计为已确认的同期 Qwen 员工观点 |

上述是 **9 个观点或署名分组**，不是 9 名当前员工或 9 个独立背书。21 条身份关联是出处关系，也不是 21 名员工。短 ID 必须连同目录使用：不同目录都可能出现 `P01`。

[根代理书目补充](inputs/ROOT_BIBLIOGRAPHY_SUPPLEMENT.json)另补 4 个既有观察的书目信息：Malcolm Featonby 的 AWS 官方署名文章、Bin Wu 的 Anthropic 官方署名文章、Adam Jones 与 Conor Kelly 的联合官方文章，以及没有个人署名的 Claude SDK 文档。联合作者与致谢贡献者不能拆成独立个人观点；机构文档不能虚构个人作者。此补充没有新增阅读观察或独立来源。

## 5. 形式基础与本项目的证明

先读[统一形式模型](../../FORMAL_MODEL.md)，再通过 [foundations 来源目录](inputs/foundations/sources.json)追溯其 12 个基础条目。每个条目只支撑目录写出的主张与范围，不能把引用一份经典论文理解为已经验证我们的实现。

本项目的 [预算一般证明](../budget-proof/README.md)、[有限模型与反例](../bounded-models/README.md)属于我们的推导与验证产物，不是新增第三方文献。Lean/TLA/Python 的结果、真实 Record 实现和外部系统行为需要分别取证；来源索引不代替这些执行回执。

## 6. 目录清单与计数口径

| 原始目录 | 组记录数 | schema / 阅读边界 |
|---|---:|---|
| [china/sources.json](inputs/china/sources.json) | 57 | 公司事实、代码、身份与观点；含 1 个正文不可取回候选 |
| [west/sources.json](inputs/west/sources.json) | 39 | 主要原文、固定源码与署名观点；没有产品运行实验 |
| [mechanisms/sources.json](inputs/mechanisms/sources.json) | 41 | 静态源码和官方文档；仓库固定提交不等于稳定 release |
| [foundations/sources.json](inputs/foundations/sources.json) | 12 | 基础文献与代表来源；失败地址另记 |
| [Cordis 边界](inputs/mechanisms/cordis-boundary/sources.json) | 15 | 指定证明和源码范围 |
| [工作改进](inputs/mechanisms/work-improvement/sources.json) | 10 | 相关方法、结果和限制；没有复现 |
| [上下文评价](inputs/west/context-evaluation/sources.json) | 18 | 论文、代码及指标边界；没有模型实验 |
| [作者观点](inputs/west/practitioner-views/sources.json) | 12 | 6 个显式观点分组；个人、联合研究与身份来源分开 |
| [权限范围](inputs/west/authority-scope/sources.json) | 5 | 来源家族包含 `primary_documents[]`；不是 5 篇文章 |
| [跨版本续接 M-05](inputs/mechanisms/lifecycle-migration/sources.json) | 6 | 配对文件与文档版本保留；提交日期不是特性发布日期 |
| [持久性边界 M-06](inputs/mechanisms/durability-boundary/sources.json) | 4 | `groups[] / workbench / dsh / files[] / urls[]`；B0 单组有 14 个文件 |

11 份目录共 219 组，展开为 240 个文档出现记录。226 条文档 URL 是原文写出的，14 条固定文件链接由明确字段构造。原文文档 URL 精确去重为 209 个；连同构造链接为 223 个。加上 root 复核使用的地址表示后，地址索引为 243 个键，其中 4 个 root-only URL 对应此次书目补充。

精确去重保留 fragment、版本和 URL 字符串原样，不跟随重定向，也不把 `main` 改写成推测的 commit。同 URL 的不同行范围、声明、作者阅读和 root 复核仍是独立记录；不同 URL 即使被标为同作品相关表示，也不强行合并。书目缺少发表日期时保持未知，访问日期、代码提交日期、手册页面日期和渲染日期不冒充发表日期。

## 7. 未读、未采用与未知状态

当前索引有 118 组明确的条目级读取字段，1 组 M-06 B0 的嵌套文件取回与范围声明，99 组只有目录级或未细化到条目的读取信息，以及 1 组明确正文不可用、未采用的候选。这是**元数据的细化程度**，不是阅读量排行榜。99 组不能自动标成“未读”，也不能补写“全文已读”；应回到原目录和具体报告的局部范围。

可定位的未采用候选共有 4 条：

- 中国 `CN-MISS` 微信页面正文取回失败；未从镜像借用作者或性能主张。它仍占原目录的 1 个组记录。
- foundations 的 Penn 地址是明确的 `search-discovered`，正文 403；用 F-04 替代，不能称 Penn 全文已读。
- foundations 的 Princeton PDF 403；F-07 使用 Cornell 托管的原论文，保留两个地址的不同访问状态。
- practitioner 的 Reddit 原帖正文可见，但机制观点和同期身份依据不足，未采用；这条属于“读到但未采用”，不能归为“未读”。

M-06 L1 的限制另外记载 OpenGroup POSIX 页面在发现阶段返回 403，但没有给出具体地址。本索引保留这段限制，不制造一个可定位的新 URL 记录。未采用候选不参与主张证成；目录组数量中包含候选时已经明示。

## 8. 从结论追到原文件、SHA 与 JSON pointer

例如核对 M-06 中工作台 Store 的范围：

1. 打开 [source-index.json](source-index.json)，找到组 ID `mechanisms/durability-boundary/sources.json#/groups/0`，确认其声明和限制。
2. 找到文档 ID `mechanisms/durability-boundary/sources.json#/groups/0/workbench/files/0`。它保存文件路径、blob、范围以及静态取回说明；`url_origin` 明确标记链接的构造方式。
3. 打开 [M-06 冻结原目录](inputs/mechanisms/durability-boundary/sources.json)，按 JSON pointer `/groups/0/workbench/files/0` 定位原字段。原文件 SHA-256 为 `b5785899ca9f79368f917905b06e589b015fa2f822b0b5f71d6839d78d7e0520`。
4. 如需查 root 是否另读过相关材料，再查 [reading-observations.json](reading-observations.json)。没有关联就保持未记录，不能由原作者阅读推出 root 已复核。书目 enrichment 也不是另一次阅读。

每条机器记录的 `origin` 都保留原文件名、完整 SHA-256 和 JSON pointer。`inputs/` 只是这些 JSON 元数据的冻结副本，不在来源数量里再次计数。捕获时普查的 182 个 JSON 中，纳入 16 份（11 目录、4 复核、1 补书目），排除 48 个 `inputs/` 副本和 118 个其他产物。manifest、验证回执、模型输出、审查报告与重复输入均不冒充第三方来源。

后续 `ROOT_SOURCE_REVIEW_5` 与 R-08 代码复核不在本快照范围；阅读它们不会自动改写这里的 38 条 root 观察。所有计数及完整纳入/排除清单以 [scope-and-inputs.json](scope-and-inputs.json)和[执行回执](execution_receipt.json)为准。
