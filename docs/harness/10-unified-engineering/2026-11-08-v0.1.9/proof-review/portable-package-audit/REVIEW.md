# R10 便携阅读包模型审查

结论：冻结的 `reader-preview-20261108T0858Z` 包在本轮已查范围内保留了模型、配置及源码的字节身份，原件到派生件的映射与实际转换相符；Record 与 M07 的复制执行通过，C07 的五份机器索引可逐字节重生。仍有两项应修：C07 旧校验器依赖原工作树，57 份新 HTML 构建元数据的输出 SHA 指向后处理前字节。二者不否定既有形式结果或探针轨迹，也不能靠包 manifest 正确而忽略。

本报告是不同执行上下文中的**模型审查与本地复制运行**，不是人类审核、一般证明或产品验收。父任务指定不同模型 gpt-6-astra；该身份来自任务调度说明，不是本报告独立认证的运行时证明。未修改来源包、原研究输入、产品或其他作者文件，未联网、上传或提交。

## 固定输入与身份

输入于 `2026-11-08T08:59:30.313498+00:00` 固定，完整路径及全部 740 个文件的 SHA/长度见 [INPUT_SNAPSHOT.json](INPUT_SNAPSHOT.json)。包 manifest 的 739 行不包含 manifest 自身。必要入口、DERIVATION 和 HTML 构建元数据另存于 `inputs/`；完整包保存于 `full-package-copy/`。完整副本中的 C07 `validation_receipt.json` 已由本轮校验执行生成，故它是执行区而非不可变原件；原回执身份在输入快照和未修改来源包中保留。

- `DERIVATION.json` SHA256：`040664a16f15f34e1118ce8acd6c2955adc9bbef6f80e5528c05dd457ad7e699`。
- 739 条 manifest 均与包实际 SHA/长度一致；623 条派生映射的两侧分别与当时本地原件和包字节相符。
- 独立按逐文件链接映射及声明的主目录/随机临时目录脱敏规则重建全部 623 行，全部字节一致；156 个变化文件没有额外未列出的字节变化。详见 [transformation_reconstruction.json](transformation_reconstruction.json) 与 [all_transform_diffs.json](all_transform_diffs.json)。这是转换忠实性检查，不是对每个外链语义或公开可读性的认证。
- 122 份可执行源码/配置逐字节未变：47 cfg、22 py、22 mjs、13 tla、8 lean、7 ts、3 js，包含冻结副本，不能解读为 122 项独立证明。见 [executable_identity_check.json](executable_identity_check.json)。没有重新运行已证的大 Python 模型、TLC 或 Lean。
- 收尾复查来源包全部 740 文件与固定输入一致，见 [verification_receipt.json](verification_receipt.json)。

## 应修项

### PP01：C07 校验器不能随包迁移

精确位置：`china/consolidated-sources/validate_index.py:11` 将 `INTEGRATION` 写成 `HERE.parents[5] / 'integration/docs/research/harness-20261107'`，第 150–156 行用这个目录校验主题导航。把**完整包**复制到本线后运行原 `python3 validate_index.py`，退出 1，记录 3149 个条件、16 个输入哈希、762 个 pointer，错误仅为 15 条主题导航缺失。实际主题文件存在于副本中；这排除了只复制 C07 导致邻页缺失的解释。

同时 `python3 build_index.py --frozen` 成功，source-index、reading-observations、identity-opinion-bindings、url-index、scope-and-inputs 五文件与包内原件 SHA 全同。故准确结论是“机器索引可重生，现有整体验证命令不便携”，不能说索引本身失真。

最小改法：研究根从当前包结构推导（本布局 `HERE.parents[1]`）或显式传入，校验条件保留；新便携执行写独立回执。证据见 [c07-full.stdout.txt](c07-full.stdout.txt)、[execution_receipt.json](execution_receipt.json)、[c07_regeneration_check.json](c07_regeneration_check.json)。

### PP02：HTML 元数据未区分渲染输出与包最终输出

57 份 `*.reading-build.json` 的 source SHA 全部匹配派生 Markdown，output SHA 全部不匹配最终 HTML；但 DERIVATION 的 generated_views SHA 与 PACKAGE_MANIFEST 均匹配最终 HTML。因此这是构建阶段身份表达错误，不是最终 manifest 失真。

最短复核例：`README-离线阅读版.reading-build.json:4` 记录输出 `db0df69b3a9c96f434493ebd6fd3ce7f3f9a9945a99ad24f8ffe01cace7c903b`，实际同名 HTML 是 `3108d26143936e0015d042998f13dcd6af2bc2a359432c0968f3950f31a40463`。本轮读取的 exporter 先生成元数据，随后加入 favicon 并转写阅读页链接，解释了差异；该构建器不是固定包输入，故结论依据仍是包内可复核的哈希冲突。

最小改法：明确保存“渲染器输出、包转换前”的 SHA，再在完成全部后处理后记最终 output SHA 及转换规则。不要覆盖或冒称历史原始执行回执。全量检查见 [html_metadata_check.json](html_metadata_check.json)。

## 执行与可读性边界

| 检查 | 本轮实际结果 | 支持范围 |
|---|---|---|
| Record 复制后 `node refinement-probes.mjs` | exit 0；8 cases、0 assertion failures、5 mapping differences、3 controls | 冻结内核/fixture 的既定映射差异，不是 5 个产品缺陷或认证测试 |
| M07 复制后 `node run-probes.mjs` | exit 0；5 probes、22 assertions | 固定源码方法配合受控 fake 的条件分支；无真实宿主、持久化、崩溃、网络或业务效果 |
| C07 冻结生成 | exit 0；五机器文件 SHA 全同 | 来源目录可从冻结输入重生；不消除 PP01 |
| 当前导航抽查 | 12 份入口/主题 Markdown，175 条本地文件链接，0 缺失 | 文件存在；未验锚点、远程 URL、浏览器渲染 |

本轮运行完整命令、cwd、日志 SHA 见 [execution_receipt.json](execution_receipt.json)；完整复制校验的保留日志另汇入 [verification_receipt.json](verification_receipt.json)。所有写入均在本线执行副本中。

PACKAGE_NOTES 已明确历史 SHA256SUMS、各 PASS_MANIFEST 及路径脱敏回执描述历史身份，DERIVATION 与 PACKAGE_MANIFEST 描述本包身份。这一边界表述合理。冻结输入中原相对链接的迁移失效也已明示；本轮没有把作者所报 160 条历史旧链接强行改成当前导航要求，也未独立重数这 160 条。没有在已查转换中发现公式、模型、配置或源码语义被脱敏改写。未对所有文档逐句作科学内容审稿，未检查全部 HTML 锚点/视觉效果、远程固定提交可访问性或工具链安装体验。

## 作者后续修改与本轮结论分离

父任务报告后来增加便携 C07 校验入口并修复新生成 HTML 的阶段 SHA；这些修改不属于本轮固定包，没有在本轮宣布修复通过。父任务另外提及 13 份 `*.render-receipt.json`：本轮固定的 740 文件及完整包副本中没有这种文件，不能把它们混入本快照结论；父任务随后确认旧 exporter 的 orphan 判定依赖 cwd，导致这 13 份在旧预览中被排除，并计划在新版保留及标注历史渲染阶段；这是作者诊断，本轮未追逐或验收新版。
