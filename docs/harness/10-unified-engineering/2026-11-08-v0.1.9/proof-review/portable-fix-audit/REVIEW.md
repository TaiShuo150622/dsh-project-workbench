# R15 R10 便携性与渲染身份修复复核

**R10 两项问题在冻结的 0926 中间包内均已修复。** 完整迁移副本的 C07 便携校验通过，并能在本地目标文件缺失时正确失败；70 份新生成阅读视图的输出 SHA 绑定最终 HTML。18 份历史渲染阶段回执都有明确映射，连接导出前身份与包内最终身份。未发现本次修复范围内的新缺陷。

这是不同执行上下文的模型审查及本地文件/校验器执行，不是人类审核、产品测试、研究模型全量复跑或最终整包完整验收。0926 是中间导出，不能因缺少稍后 W11/R12 等内容而判它不完整，也不能以本轮通过代替最终交付检查。

## 固定输入

包 `reader-preview-20261108T0926Z` 的 965 个文件已记录 SHA/长度，见 [INPUT_SNAPSHOT.json](INPUT_SNAPSHOT.json)。manifest 包含 964 行，不含自身；全部与原包字节相符。原包未写入，收尾 965 文件身份未变。

工具脚本另行固定，见 [TOOL_SNAPSHOT.json](TOOL_SNAPSHOT.json)：

- build_reader_package.py：`c3b79a98e26ad9081f56bc0cacacb2722b9c041f82117213ccf6250682d2905a`。
- validate_index_portable.py：`b660c054ef59c8cd5aa7365bafc18b4ea621495e52acc5373c6bb254d11dab74`；与包内便携脚本逐字节一致。

完整迁移执行副本在 `relocated/isolated-reader/`，负对照在 `negative/isolated-reader/`。二者仅是本线执行区，不冒充原包不变副本；执行分别更新了自己的 portable-validation-receipt.json。

## PP01：便携校验实际使用复制后的根目录

新脚本用 `HERE.parents[1]` 定位包研究根，保留元数据/关联检查，并写独立 `portable-validation-receipt.json`。本轮从本线审查目录运行复制包内脚本，exit 0、PASS：3150 条件、16 输入 SHA、762 pointer、56 导航链接，errors 为空。五份原机器索引 SHA 前后相同，旧 validation_receipt.json 也未改变；没有重新生成索引。

[run_isolated.py](run_isolated.py) 还为 Python 的文件 open 增加审计与拒绝规则：凡访问 Codex 工作区且不在该迁移副本内的路径均拒绝。实际记录 87 次工作区 open，全部在副本内。该约束不覆盖全部系统调用；结合脚本静态根目录解析及下面的负对照，足以核本次“借原 checkout 补缺失文件”的问题。

**负对照**：仅在另一个执行副本中把 FORMAL_MODEL.md 改名，原 integration 文件仍存在。便携校验退出 1，唯一错误为 `SOURCE_INDEX.md -> ../../FORMAL_MODEL.md` 缺失。这证明当前导航没有自动退回旧 checkout。保留 [正向输出](positive.stdout.json)、[负向输出](negative.stdout.json)、[执行回执](execution_receipt.json) 及两个 open 审计。

## PP02：70 个当前构建回执与 18 个历史视图映射

| 检查 | 本轮结果 | 身份含义 |
|---|---|---|
| DERIVATION.generated_views 的 70 个新视图 | metadata.output_sha256、DERIVATION SHA 与最终 HTML 三者全同；source SHA 与派生 Markdown 全同 | 当前包最终字节 |
| 新回执的阶段标签 | 全部有 renderer_output_sha256_before_package_transform、post_render_transforms，output_sha256_role 明示 final packaged HTML bytes | 渲染阶段与包后处理阶段分开 |
| PACKAGE_VIEW_IDENTITIES 的 18 项 | 最终 SHA 与实际包 HTML 全同；pre-export SHA 与对应 render receipt 及 DERIVATION 原 HTML SHA 全同 | 历史渲染阶段 → 当前包视图 |
| 原 HTML 可核对性 | 18 个本地原 HTML 当时仍匹配 DERIVATION 原 SHA，已复制到 historical-render-inputs 固定 | 不仅比两个声明字段，也核了原字节 |
| 历史视图导出改变 | 18 项中 12 项最终 SHA 改变、6 项未变，映射均准确 | 改变不伪称原始渲染输出未变 |

包内总计 **133** 个 reading-build 文件；其中 70 个是本次新生成回执，另 63 个为历史材料/中间构建回执，不能将整个目录 glob 的数量当作这 70 个当前视图。PACKAGE_NOTES 使用“新生成”作限定，并将历史阶段身份与最终 manifest 分开。历史冻结回执不应为了让旧 outputSHA 等于新包字节而重写。

详见 [identity_checks.json](identity_checks.json)。本轮没有重跑渲染器逐一重建那 70 个中间输出；对其 pre-transform SHA 核了字段存在与阶段标识，对最终 output/source SHA 作了实际字节核对。18 个历史 render 阶段则已核对应原 HTML 实字节。

## 旧回执恢复与导航范围

旧 0858 包的 DERIVATION.excluded **实际列有 14 个** orphan render receipts，之前作者口头数字为 13。独立对照发现这 14 个在 0926 包全部恢复，当前总计 18 个 render receipts，均覆盖于 PACKAGE_VIEW_IDENTITIES。新 DERIVATION 不再以 orphan 理由排除这些回执。旧包审查原件保持原样；本轮记录精确计数更正，见 [receipt_restoration_check.json](receipt_restoration_check.json)。

固定 builder 的 orphan 判断已经改成 `(ROOT/rel)` 解析，再检查相邻 HTML，不再依赖进程 cwd。此为源码核对与包结果复核，本轮没有重新执行全量导出。

本轮对 14 份当前入口/主题页独立检查 205 条本地文件链接，0 缺失；其中包括 C07、C08、W05/W07 和 v0.1.4 主稿。另扫描包中 69 份标记 frozen 的 Markdown，找到 229 条失效本地链接出现次数。它们属于历史目录/输入关系，PACKAGE_NOTES 已明示不承担迁移后的当前导航；这些数字不可与旧包的 160 次直接当作回归差值。该扫描只验文件存在，不验锚点或远程目标。

## 作者检查与审查结论分开

完成上述独立字节和执行核对后，才读取 root 的 portable-0926-check.json 与 render-identities-0926.json 并保存于 author-checks/。其 3150/16/762/56 与 70/18 结果同本轮一致；没有使用它们生成预期哈希或 oracle。

本轮解决的是 R10 的便携路径和构建阶段身份问题。未重新运行 Record/M07、Python 大模型、TLC、Lean，未全面重审研究内容、最终包清单、远程访问或 HTML 视觉效果。原包与工具固定输入见回执；没有改源包、产品或发布任何内容。
