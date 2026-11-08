# Harness 研究来源入口

先读 [SOURCE_INDEX.md](SOURCE_INDEX.md)。它按公司与宿主、机制、论文、作者观点、形式基础提供阅读入口，并说明每类证据能支持什么。需要逐条追溯时，再查机器索引。

这是 C-07 的本地书目整理，输入截止 **2026-11-08 08:35:43 UTC**。16 份纳入文件与 08:32:19 的首次捕获内容相同；本目录以最后捕获的 SHA 和时间为准。没有联网重开来源，没有运行产品，也没有把索引整理计为新增研究证据。C-05 的旧快照保留原样。

| 层次 | 本快照数量 | 解释 |
|---|---:|---|
| 原始来源目录 | 11 份 | 10 份 `sources[]`，1 份 M-06 `groups[]` |
| 目录组记录 | 219 组 | 215 个旧 schema 条目加 M-06 的 4 组；含 1 个明确未采用候选 |
| 文档出现记录 | 240 条 | 包括主条目、组内页面、配对文件和 M-06 的逐文件记录；同一文档可以出现多次 |
| 原文写出的文档 URL | 226 次 / 209 个精确地址 | 不把身份链接、仓库首页、失败候选等所有 URL 字段都混成文章 |
| 构造的固定提交文件链接 | 14 个 | M-06 工作台 7 个、DSH 7 个；未在本轮验证远端可访问性 |
| 文档精确 URL（含构造链接） | 223 个 | 地址相同才共享键；仍保留每次声明及读取范围 |
| 根代理复核 | 4 份文件 / 38 条观察 | 与原作者阅读声明分开；不是新增 38 个独立来源 |
| 根代理书目补充 | 4 条 | 只补既有观察的标题、作者、日期等；新增阅读数为 0 |
| 合并地址索引 | 243 个精确 URL 键 | 含不同 fragment、页面表示和 root 使用的其他链接；不是已读文章数 |

不要把这些数量换算为“全部读完的文章”或“独立证据来源”。一组可能是 14 个代码文件，一个 URL 可能承载几种不同主张；静态源码阅读也不是运行复现。

机器文件的职责如下：

- [source-index.json](source-index.json)：目录组、子文档、版本、读取范围、原文件 SHA 和 JSON pointer。
- [reading-observations.json](reading-observations.json)：38 条 root 复核观察、关联方式，以及 4 条书目补充。
- [identity-opinion-bindings.json](identity-opinion-bindings.json)：身份依据与观点出处的关系；保留个人、联合研究、官方署名文章的区别。
- [url-index.json](url-index.json)：按精确地址查引用出现记录；不合并主张或版本。
- [scope-and-inputs.json](scope-and-inputs.json)：完整输入普查、纳入与排除角色、原目录里的字面 URL 定位。
- `inputs/`：16 份来源元数据快照，用于校验 SHA 和 pointer；不含网页正文、PDF 或第三方整份代码。
- [execution_receipt.json](execution_receipt.json)、[validation_receipt.json](validation_receipt.json)、[SHA256SUMS](SHA256SUMS)：生成、校验及文件指纹。
- [reproducibility_receipt.json](reproducibility_receipt.json)：冻结输入再生成后，5 份机器索引 SHA 完全一致；C-05 原 manifest 的 24 个文件均未变化。

本快照没有纳入后续的 `ROOT_SOURCE_REVIEW_5.json`，也没有把 R-08 `source-inputs` 的代码复核材料计为新公司文献。后续增补应另列捕获时间和输入 SHA，不能静默改变本快照的计数。

只复跑本快照可在本目录运行：

```sh
python3 build_index.py --frozen
python3 validate_index_portable.py
```

`--frozen` 只读取本目录的输入副本，并保留捕获时的普查范围。生成脚本另支持显式传入研究目录以创建新捕获；那会更新本目录的快照与回执，不能当作原快照的复跑。最终包只复制本目录时，主题稿链接需要一起保留研究目录的相对结构；16 份元数据快照和逐条机器索引可以独立校验。

复跑会更新本地执行与校验回执的时间，因此原 `SHA256SUMS` 只证明交接时的文件版本。校验没有重开网页正文或验证远端链接，也不是产品测试或来源真实性审计。

便携校验补充：原 `validate_index.py` 依赖初始 worktree 布局，在完整导出副本中会误报主题链接缺失。当前入口改用 `validate_index_portable.py`，仅调整研究根定位和输出回执名，原脚本及历史回执保留；[派生说明](portable-validator-derivation.json)记录两个脚本的 SHA。机器索引内容和原读取范围未因此改变。
