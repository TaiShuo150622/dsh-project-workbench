# 讨论稿图清单与扫描口径

扫描基线：`90343dba2e012a58dec759ae8496cf764dc4339c`。日期：2026-11-13。

现有 `docs/harness` Markdown 中找到 **95 个含图文件、433 处 Mermaid 图块**。按去除首尾空白后的图块正文逐字节去重，为 **193 组不同正文**；同文重复出现 240 次。包含历史版本与研究输入副本，不能视作同样数量的独立架构图。

语法分类：`flowchart` 423 处、`sequenceDiagram` 9 处、`stateDiagram-v2` 1 处。

**覆盖边界**：这是机械清单，不表示逐图完成语义核读或转换。本轮代表图的人工场景对应关系见 [SCENE_MAP.md](SCENE_MAP.md)。SVG、PNG、仅存在于 HTML 的图和全部历史用户原话不计入本数字。新增讨论稿自身也不反向计入基线。

[完整逐图 JSON](DIAGRAM_INVENTORY.json)保存路径、图题、章节、行号、源文件哈希及图块哈希；行号仅定位本次快照。

| 来源文件 | 图块数 | 语法 |
| --- | --- | --- |
| [01-vision/harness-deep-research-and-resources.md](<../01-vision/harness-deep-research-and-resources.md>) | 1 | flowchart×1 |
| [01-vision/harness-discussion-v0.1.md](<../01-vision/harness-discussion-v0.1.md>) | 1 | flowchart×1 |
| [01-vision/harness-discussion-v0.2.md](<../01-vision/harness-discussion-v0.2.md>) | 8 | flowchart×7, sequenceDiagram×1 |
| [01-vision/harness-discussion-v0.3.md](<../01-vision/harness-discussion-v0.3.md>) | 6 | flowchart×6 |
| [02-methods/2026-10-22-Agent与Workflow讨论稿-v0.1.0.md](<../02-methods/2026-10-22-Agent与Workflow讨论稿-v0.1.0.md>) | 5 | flowchart×5 |
| [02-methods/2026-10-22-Agent主动性与提问边界讨论稿-v0.1.1.md](<../02-methods/2026-10-22-Agent主动性与提问边界讨论稿-v0.1.1.md>) | 1 | flowchart×1 |
| [02-methods/2026-10-22-Agent工具面设计讨论稿-v0.1.0.md](<../02-methods/2026-10-22-Agent工具面设计讨论稿-v0.1.0.md>) | 6 | flowchart×6 |
| [03-runtime/Harness 底座架构重评讨论稿 v0.1.5.md](<../03-runtime/Harness 底座架构重评讨论稿 v0.1.5.md>) | 21 | flowchart×21 |
| [03-runtime/Harness 底座架构重评讨论稿 v0.1.6.md](<../03-runtime/Harness 底座架构重评讨论稿 v0.1.6.md>) | 27 | flowchart×27 |
| [04-memory/Record智能记忆与自主上下文组装-源v0.1.2-公开整理版.md](<../04-memory/Record智能记忆与自主上下文组装-源v0.1.2-公开整理版.md>) | 8 | flowchart×8 |
| [04-memory/Record智能记忆与自主上下文组装-源v0.2历史稿-公开整理版.md](<../04-memory/Record智能记忆与自主上下文组装-源v0.2历史稿-公开整理版.md>) | 1 | flowchart×1 |
| [05-panels/docs/design/history/overall-discussion-v0.1.0.md](<../05-panels/docs/design/history/overall-discussion-v0.1.0.md>) | 9 | flowchart×9 |
| [05-panels/docs/design/history/overall-discussion-v0.1.1.md](<../05-panels/docs/design/history/overall-discussion-v0.1.1.md>) | 9 | flowchart×9 |
| [05-panels/docs/design/overall-discussion.md](<../05-panels/docs/design/overall-discussion.md>) | 9 | flowchart×9 |
| [05-panels/docs/handoff/panels/COLLABORATION.md](<../05-panels/docs/handoff/panels/COLLABORATION.md>) | 4 | flowchart×4 |
| [06-dag/current/docs/design/dag-detailed/02-代码结构与实施路线.md](<../06-dag/current/docs/design/dag-detailed/02-代码结构与实施路线.md>) | 1 | flowchart×1 |
| [06-dag/current/docs/design/dag-detailed/06-布局引擎规格.md](<../06-dag/current/docs/design/dag-detailed/06-布局引擎规格.md>) | 1 | flowchart×1 |
| [06-dag/current/docs/design/dag-detailed/11-借鉴SuperAgent架构讨论稿-v0.1.0.md](<../06-dag/current/docs/design/dag-detailed/11-借鉴SuperAgent架构讨论稿-v0.1.0.md>) | 6 | flowchart×6 |
| [07-remote/DSH-远程工作区与双运行模式讨论稿-v0.1.0.md](<../07-remote/DSH-远程工作区与双运行模式讨论稿-v0.1.0.md>) | 5 | flowchart×5 |
| [07-remote/DSH-远程工作区与双运行模式讨论稿-v0.1.1.md](<../07-remote/DSH-远程工作区与双运行模式讨论稿-v0.1.1.md>) | 6 | flowchart×6 |
| [08-browser/security/2026-11-05-跨通道凭据与截图遮罩讨论稿-v0.1.5.md](<../08-browser/security/2026-11-05-跨通道凭据与截图遮罩讨论稿-v0.1.5.md>) | 5 | flowchart×5 |
| [09-extensions/activity/docs/discussion/工作区活跃度显示讨论稿-v0.1.2.md](<../09-extensions/activity/docs/discussion/工作区活跃度显示讨论稿-v0.1.2.md>) | 6 | flowchart×6 |
| [09-extensions/activity/docs/implementation/工作区活跃度插件-实施稿-2026-10-23.md](<../09-extensions/activity/docs/implementation/工作区活跃度插件-实施稿-2026-10-23.md>) | 4 | flowchart×4 |
| [10-unified-engineering/2026-11-08-v0.1.9/china/handoff-audit/inputs/main-v0.1.3.md](<../10-unified-engineering/2026-11-08-v0.1.9/china/handoff-audit/inputs/main-v0.1.3.md>) | 6 | flowchart×6 |
| [10-unified-engineering/2026-11-08-v0.1.9/china/handoff-audit/inputs/责任接管与负担连续性讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/china/handoff-audit/inputs/责任接管与负担连续性讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/china/progress-conditions/自主推进与终止条件讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/china/progress-conditions/自主推进与终止条件讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/china/record-refinement/inputs/specifications/ADAPTER_CONTRACT.md](<../10-unified-engineering/2026-11-08-v0.1.9/china/record-refinement/inputs/specifications/ADAPTER_CONTRACT.md>) | 3 | flowchart×2, sequenceDiagram×1 |
| [10-unified-engineering/2026-11-08-v0.1.9/china/中国Harness机制核查讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/china/中国Harness机制核查讨论稿-v0.1.0.md>) | 3 | flowchart×2, sequenceDiagram×1 |
| [10-unified-engineering/2026-11-08-v0.1.9/formal-review/retention-contract-audit/inputs/basis/mechanisms/coverage-contract/有限声明域覆盖契约讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/formal-review/retention-contract-audit/inputs/basis/mechanisms/coverage-contract/有限声明域覆盖契约讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/formal-review/retention-contract-audit/inputs/basis/west/authority-scope/主体权限与结果可见性讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/formal-review/retention-contract-audit/inputs/basis/west/authority-scope/主体权限与结果可见性讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/formal-review/retention-contract-audit/inputs/basis/west/evidence-disputes/Record证据争议与修正讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/formal-review/retention-contract-audit/inputs/basis/west/evidence-disputes/Record证据争议与修正讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/mechanisms/cordis-boundary/Cordis-组合与外部效果边界讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/mechanisms/cordis-boundary/Cordis-组合与外部效果边界讨论稿-v0.1.0.md>) | 3 | flowchart×2, sequenceDiagram×1 |
| [10-unified-engineering/2026-11-08-v0.1.9/mechanisms/coverage-contract/有限声明域覆盖契约讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/mechanisms/coverage-contract/有限声明域覆盖契约讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/mechanisms/durability-boundary/持久状态与发送效果边界讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/mechanisms/durability-boundary/持久状态与发送效果边界讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/mechanisms/interop-contracts/跨宿主协议与有损适配契约讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/mechanisms/interop-contracts/跨宿主协议与有损适配契约讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/mechanisms/lifecycle-migration/长期任务跨版本续接讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/mechanisms/lifecycle-migration/长期任务跨版本续接讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/mechanisms/work-improvement/自主推进与工作方式改进讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/mechanisms/work-improvement/自主推进与工作方式改进讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/mechanisms/机制对照与反例讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/mechanisms/机制对照与反例讨论稿-v0.1.0.md>) | 3 | flowchart×2, sequenceDiagram×1 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/adoption-glossary-audit/evidence-inputs/TASKBOOK.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/adoption-glossary-audit/evidence-inputs/TASKBOOK.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/adoption-glossary-audit/evidence-inputs/TRUSTED_MAP.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/adoption-glossary-audit/evidence-inputs/TRUSTED_MAP.md>) | 1 | flowchart×1 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/adoption-glossary-audit/inputs/root/统一Harness工程与形式化基础讨论稿-v0.1.7.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/adoption-glossary-audit/inputs/root/统一Harness工程与形式化基础讨论稿-v0.1.7.md>) | 6 | flowchart×6 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/coverage-example-audit/inputs/M10/有限声明域覆盖契约讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/coverage-example-audit/inputs/M10/有限声明域覆盖契约讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/coverage-example-audit/inputs/W14/EXAMPLE.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/coverage-example-audit/inputs/W14/EXAMPLE.md>) | 1 | flowchart×1 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/evidence-dispute-audit/inputs/Record证据争议与修正讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/evidence-dispute-audit/inputs/Record证据争议与修正讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/evidence-dispute-audit/run/Record证据争议与修正讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/evidence-dispute-audit/run/Record证据争议与修正讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/expiry-contract-audit/inputs/适配契约与贯穿场景讨论稿-v0.1.1.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/expiry-contract-audit/inputs/适配契约与贯穿场景讨论稿-v0.1.1.md>) | 3 | flowchart×2, sequenceDiagram×1 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/handoff-composition/inputs/C08.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/handoff-composition/inputs/C08.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/handoff-composition/责任接管与负担连续性讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/handoff-composition/责任接管与负担连续性讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/handoff-composition/责任接管与负担连续性讨论稿-v0.1.1.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/handoff-composition/责任接管与负担连续性讨论稿-v0.1.1.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/progress-audit/inputs/自主推进与终止条件讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/progress-audit/inputs/自主推进与终止条件讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/progress-audit/run/自主推进与终止条件讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/progress-audit/run/自主推进与终止条件讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/reader-claims-audit/inputs/west/evaluation-design-review/最小评估与可证伪价值讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/reader-claims-audit/inputs/west/evaluation-design-review/最小评估与可证伪价值讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/reader-claims-audit/inputs/west/evaluation-design-review/最小评估与可证伪价值讨论稿-v0.1.1.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/reader-claims-audit/inputs/west/evaluation-design-review/最小评估与可证伪价值讨论稿-v0.1.1.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/reader-claims-audit/inputs/west/implementation-taskbook/可信入口与Coding交付实施任务书讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/reader-claims-audit/inputs/west/implementation-taskbook/可信入口与Coding交付实施任务书讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/reader-claims-audit/inputs/统一Harness工程与形式化基础讨论稿-v0.1.3.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/reader-claims-audit/inputs/统一Harness工程与形式化基础讨论稿-v0.1.3.md>) | 6 | flowchart×6 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/reader-composition-audit/evidence-inputs/proof-review/handoff-composition/责任接管与负担连续性讨论稿-v0.1.1.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/reader-composition-audit/evidence-inputs/proof-review/handoff-composition/责任接管与负担连续性讨论稿-v0.1.1.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/reader-composition-audit/evidence-inputs/resource-lifecycle/资源归属与环境生命周期讨论稿-v0.1.1.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/reader-composition-audit/evidence-inputs/resource-lifecycle/资源归属与环境生命周期讨论稿-v0.1.1.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/reader-composition-audit/inputs/统一Harness工程与形式化基础讨论稿-v0.1.6.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/reader-composition-audit/inputs/统一Harness工程与形式化基础讨论稿-v0.1.6.md>) | 6 | flowchart×6 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/record-mapping-audit/inputs/inputs/specifications/ADAPTER_CONTRACT.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/record-mapping-audit/inputs/inputs/specifications/ADAPTER_CONTRACT.md>) | 3 | flowchart×2, sequenceDiagram×1 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/relay-durability-audit/inputs/mechanisms/durability-boundary/持久状态与发送效果边界讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/relay-durability-audit/inputs/mechanisms/durability-boundary/持久状态与发送效果边界讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/resource-audit/historical-inputs/Harness 底座架构重评讨论稿 v0.1.6.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/resource-audit/historical-inputs/Harness 底座架构重评讨论稿 v0.1.6.md>) | 27 | flowchart×27 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/resource-audit/inputs/资源归属与环境生命周期讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/resource-audit/inputs/资源归属与环境生命周期讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/work-policy-audit/inputs/mechanisms/work-improvement/自主推进与工作方式改进讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/work-policy-audit/inputs/mechanisms/work-improvement/自主推进与工作方式改进讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/work-policy-audit/inputs/west/evaluation-design-review/最小评估与可证伪价值讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/work-policy-audit/inputs/west/evaluation-design-review/最小评估与可证伪价值讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/proof-review/work-policy-audit/inputs/统一Harness工程与形式化基础讨论稿-v0.1.1.md](<../10-unified-engineering/2026-11-08-v0.1.9/proof-review/work-policy-audit/inputs/统一Harness工程与形式化基础讨论稿-v0.1.1.md>) | 6 | flowchart×6 |
| [10-unified-engineering/2026-11-08-v0.1.9/resource-lifecycle/资源归属与环境生命周期讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/resource-lifecycle/资源归属与环境生命周期讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/resource-lifecycle/资源归属与环境生命周期讨论稿-v0.1.1.md](<../10-unified-engineering/2026-11-08-v0.1.9/resource-lifecycle/资源归属与环境生命周期讨论稿-v0.1.1.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/west/authority-scope/主体权限与结果可见性讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/west/authority-scope/主体权限与结果可见性讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/west/context-evaluation/Record上下文与任务收益评价讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/west/context-evaluation/Record上下文与任务收益评价讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/west/design-continuity/旧设计决定与统一Harness衔接讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/west/design-continuity/旧设计决定与统一Harness衔接讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/west/evaluation-design-review/最小评估与可证伪价值讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/west/evaluation-design-review/最小评估与可证伪价值讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/west/evaluation-design-review/最小评估与可证伪价值讨论稿-v0.1.1.md](<../10-unified-engineering/2026-11-08-v0.1.9/west/evaluation-design-review/最小评估与可证伪价值讨论稿-v0.1.1.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/west/evidence-disputes/Record证据争议与修正讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/west/evidence-disputes/Record证据争议与修正讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/west/implementation-taskbook/可信入口与Coding交付实施任务书讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/west/implementation-taskbook/可信入口与Coding交付实施任务书讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/west/implementation-taskbook/可信入口与Coding交付实施任务书讨论稿-v0.1.1.md](<../10-unified-engineering/2026-11-08-v0.1.9/west/implementation-taskbook/可信入口与Coding交付实施任务书讨论稿-v0.1.1.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/west/practitioner-views/工程作者观点归属与设计取舍讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/west/practitioner-views/工程作者观点归属与设计取舍讨论稿-v0.1.0.md>) | 3 | flowchart×3 |
| [10-unified-engineering/2026-11-08-v0.1.9/west/trusted-entry-map/MAP.md](<../10-unified-engineering/2026-11-08-v0.1.9/west/trusted-entry-map/MAP.md>) | 1 | flowchart×1 |
| [10-unified-engineering/2026-11-08-v0.1.9/west/worked-example/EXAMPLE.md](<../10-unified-engineering/2026-11-08-v0.1.9/west/worked-example/EXAMPLE.md>) | 1 | flowchart×1 |
| [10-unified-engineering/2026-11-08-v0.1.9/west/西方Harness机制核查讨论稿-v0.1.1.md](<../10-unified-engineering/2026-11-08-v0.1.9/west/西方Harness机制核查讨论稿-v0.1.1.md>) | 3 | flowchart×2, stateDiagram-v2×1 |
| [10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.0.md>) | 5 | flowchart×5 |
| [10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.1.md](<../10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.1.md>) | 6 | flowchart×6 |
| [10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.2.md](<../10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.2.md>) | 6 | flowchart×6 |
| [10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.3.md](<../10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.3.md>) | 6 | flowchart×6 |
| [10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.4.md](<../10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.4.md>) | 6 | flowchart×6 |
| [10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.5.md](<../10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.5.md>) | 6 | flowchart×6 |
| [10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.6.md](<../10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.6.md>) | 6 | flowchart×6 |
| [10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.7.md](<../10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.7.md>) | 6 | flowchart×6 |
| [10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.8.md](<../10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.8.md>) | 6 | flowchart×6 |
| [10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.9.md](<../10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.9.md>) | 6 | flowchart×6 |
| [10-unified-engineering/2026-11-08-v0.1.9/适配契约与贯穿场景讨论稿-v0.1.0.md](<../10-unified-engineering/2026-11-08-v0.1.9/适配契约与贯穿场景讨论稿-v0.1.0.md>) | 3 | flowchart×2, sequenceDiagram×1 |
| [10-unified-engineering/2026-11-08-v0.1.9/适配契约与贯穿场景讨论稿-v0.1.1.md](<../10-unified-engineering/2026-11-08-v0.1.9/适配契约与贯穿场景讨论稿-v0.1.1.md>) | 3 | flowchart×2, sequenceDiagram×1 |
| [11-project-management/continuity-discussion-v0.1.1.md](<../11-project-management/continuity-discussion-v0.1.1.md>) | 6 | flowchart×6 |
| [11-project-management/coordination-discussion-v0.1.1.md](<../11-project-management/coordination-discussion-v0.1.1.md>) | 4 | flowchart×4 |
| [11-project-management/remote-recovery-discussion-v0.1.1.md](<../11-project-management/remote-recovery-discussion-v0.1.1.md>) | 5 | flowchart×5 |
| [12-delivery-dag/Harness-工作台与DAG整体实施讨论稿-v0.1.1.md](<../12-delivery-dag/Harness-工作台与DAG整体实施讨论稿-v0.1.1.md>) | 4 | flowchart×4 |
