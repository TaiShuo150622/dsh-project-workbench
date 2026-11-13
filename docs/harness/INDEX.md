# Harness 讨论稿完整索引

返回 [阅读指南](README.md) · [文件清单与 SHA-256](MANIFEST.json)

首批收录 **192 个源文档及设计附件**：144 份 Markdown，42 份 HTML，1 份 PNG，5 份设计 JSON。2026-11-08 另归档统一工程研究 **1,422 个文件**，含当前与历史稿、HTML、来源/身份清单、证明、模型及隔离验证记录；两种数量口径不同，不能相加当作独立文章篇数。导航文件另列，两套交接包共用的画板和主题按目录依赖各自保留。

“源版本”沿用原稿标记；“历史”不表示错误，只表示有后续稿件或当时的讨论语境。公开整理可能删除内部案例、个人原话和私有附件；具体边界见各稿开头。所有实施卡均为计划材料，不以文件存在证明任务已经完成。

## 新增 · 交付管理与项目 DAG

2026-11-13 实现与验证见 [交付管理入口](12-delivery-dag/README.md)。[整体方案 v0.1.1](12-delivery-dag/Harness-工作台与DAG整体实施讨论稿-v0.1.1.md)、[数据与接口契约](12-delivery-dag/CONTRACT.md)、[验证记录](12-delivery-dag/VALIDATION.md)及[文件目录](12-delivery-dag/CONTENTS.md)分别说明方案、已实现行为和实际证据。前序三线实现见 [11-project-management](11-project-management/README.md)。

## 新增 · 统一 Harness 工程研究

推荐先读 [本轮阅读指南](10-unified-engineering/README.md)，当前主稿为 [v0.1.9](10-unified-engineering/2026-11-08-v0.1.9/统一Harness工程与形式化基础讨论稿-v0.1.9.md)。[专题目录](10-unified-engineering/CONTENTS.md)按问题导航，[完整文件索引](10-unified-engineering/FILE_INDEX.md)逐项列出全部研究快照文件。对应 [PACKAGE_MANIFEST.json](10-unified-engineering/2026-11-08-v0.1.9/PACKAGE_MANIFEST.json)与 [公开整理记录](10-unified-engineering/PUBLICATION.json)保留文件身份、公开范围及历史时点说明。

以下 00–09 节继续保留首批文档的逐项索引和版本沿革。

## 00 · 项目工作台与后端任务包

| 文件 | 源版本 | 文档性质 |
| --- | --- | --- |
| [DSH 项目工作台：后端建议与实施时间计划（评审稿）](<../handoff/ui-backend/BACKEND-PLAN-DRAFT.md>) | 第四版 / 2026-11-01 | 公开整理版 |
| [看板](<../handoff/ui-backend/BOARD.md>) | 未编号 | 公开整理版 |
| [接口契约](<../handoff/ui-backend/CONTRACT.md>) | 未编号 | 公开整理版 |
| [DSH 工作台：开源项目调研与选型讨论稿](<../handoff/ui-backend/OPEN-SOURCE-RESEARCH-DRAFT.md>) | 未编号 | 公开整理版 |
| [给 Codex 的开工提示词](<../handoff/ui-backend/PROMPT.md>) | 未编号 | 公开整理版 |
| [DSH 统一组件库 · 后端任务包](<../handoff/ui-backend/README.md>) | 未编号 | 公开整理版 |
| [Agent 组件 · Agent.dc.html](<../handoff/ui-backend/design/Agent.dc.html>) | 未编号 | 设计附件 |
| [构建动效 · Build.dc.html](<../handoff/ui-backend/design/Build.dc.html>) | 未编号 | 设计附件 |
| [图表 · Charts.dc.html](<../handoff/ui-backend/design/Charts.dc.html>) | 未编号 | 设计附件 |
| [更多图表 · ChartsMore.dc.html](<../handoff/ui-backend/design/ChartsMore.dc.html>) | 未编号 | 设计附件 |
| [Markdown 与富文本 · Content.dc.html](<../handoff/ui-backend/design/Content.dc.html>) | 未编号 | 设计附件 |
| [DAG 面板 · 桌面端 · DagDesktop.dc.html](<../handoff/ui-backend/design/DagDesktop.dc.html>) | 未编号 | 设计附件 |
| [DAG 组件 · DagParts.dc.html](<../handoff/ui-backend/design/DagParts.dc.html>) | 未编号 | 设计附件 |
| [DAG 面板 · TUI · DagTui.dc.html](<../handoff/ui-backend/design/DagTui.dc.html>) | 未编号 | 设计附件 |
| [桌面端成屏 · DesktopScreen.dc.html](<../handoff/ui-backend/design/DesktopScreen.dc.html>) | 未编号 | 设计附件 |
| [基础映射 · Foundations.dc.html](<../handoff/ui-backend/design/Foundations.dc.html>) | 未编号 | 设计附件 |
| [DSH 组件库总览 · Main.dc.html](<../handoff/ui-backend/design/Main.dc.html>) | 未编号 | 设计附件 |
| [动作语法 · Motion.dc.html](<../handoff/ui-backend/design/Motion.dc.html>) | 未编号 | 设计附件 |
| [界面动效 · MotionUi.dc.html](<../handoff/ui-backend/design/MotionUi.dc.html>) | 未编号 | 设计附件 |
| [实时弹出 · TUI · PeekTui.dc.html](<../handoff/ui-backend/design/PeekTui.dc.html>) | 未编号 | 设计附件 |
| [基础组件 · Primitives.dc.html](<../handoff/ui-backend/design/Primitives.dc.html>) | 未编号 | 设计附件 |
| [设计稿导出](<../handoff/ui-backend/design/README.md>) | 未编号 | 公开整理版 |
| [大会话缩进右栏 · SessionDock.dc.html](<../handoff/ui-backend/design/SessionDock.dc.html>) | 未编号 | 设计附件 |
| [大会话缩进右栏 · TUI · SessionDockTui.dc.html](<../handoff/ui-backend/design/SessionDockTui.dc.html>) | 未编号 | 设计附件 |
| [会话地图 · 桌面端 · SessionMap.dc.html](<../handoff/ui-backend/design/SessionMap.dc.html>) | 未编号 | 设计附件 |
| [怎么做出来 · SessionMapHow.dc.html](<../handoff/ui-backend/design/SessionMapHow.dc.html>) | 未编号 | 设计附件 |
| [会话地图 · TUI · SessionMapTui.dc.html](<../handoff/ui-backend/design/SessionMapTui.dc.html>) | 未编号 | 设计附件 |
| [会话分屏 · 桌面端 · SplitDesktop.dc.html](<../handoff/ui-backend/design/SplitDesktop.dc.html>) | 未编号 | 设计附件 |
| [会话分屏 · TUI · SplitTui.dc.html](<../handoff/ui-backend/design/SplitTui.dc.html>) | 未编号 | 设计附件 |
| [TUI 成屏 · TuiScreen.dc.html](<../handoff/ui-backend/design/TuiScreen.dc.html>) | 未编号 | 设计附件 |
| [冷灰主题 · TuiTheme.dc.html](<../handoff/ui-backend/design/TuiTheme.dc.html>) | 未编号 | 设计附件 |
| [工作台 · 桌面端 · Workbench.dc.html](<../handoff/ui-backend/design/Workbench.dc.html>) | 未编号 | 设计附件 |
| [工作台 · TUI · WorkbenchTui.dc.html](<../handoff/ui-backend/design/WorkbenchTui.dc.html>) | 未编号 | 设计附件 |
| [工作流收成甘特图 · WorkflowGantt.dc.html](<../handoff/ui-backend/design/WorkflowGantt.dc.html>) | 未编号 | 设计附件 |
| [canvas.json · canvas.json](<../handoff/ui-backend/design/canvas.json>) | 未编号 | 设计附件 |
| [dsh-cool-dark.json · dsh-cool-dark.json](<../handoff/ui-backend/design/themes/dsh-cool-dark.json>) | 未编号 | 设计附件 |
| [dsh-cool-light.json · dsh-cool-light.json](<../handoff/ui-backend/design/themes/dsh-cool-light.json>) | 未编号 | 设计附件 |
| [B-01-phase-history](<../handoff/ui-backend/tasks/B-01-phase-history.md>) | 未编号 | 实施任务卡（计划） |
| [B-02-display-status](<../handoff/ui-backend/tasks/B-02-display-status.md>) | 未编号 | 实施任务卡（计划） |
| [B-03-overview](<../handoff/ui-backend/tasks/B-03-overview.md>) | 未编号 | 实施任务卡（计划） |
| [B-04-library](<../handoff/ui-backend/tasks/B-04-library.md>) | 未编号 | 实施任务卡（计划） |
| [B-05-project-goal](<../handoff/ui-backend/tasks/B-05-project-goal.md>) | 未编号 | 实施任务卡（计划） |
| [B-06-session-map](<../handoff/ui-backend/tasks/B-06-session-map.md>) | 未编号 | 实施任务卡（计划） |
| [B-07-thread-card](<../handoff/ui-backend/tasks/B-07-thread-card.md>) | 未编号 | 实施任务卡（计划） |
| [B-08-timeline](<../handoff/ui-backend/tasks/B-08-timeline.md>) | 未编号 | 实施任务卡（计划） |
| [B-09-live-feed](<../handoff/ui-backend/tasks/B-09-live-feed.md>) | 未编号 | 实施任务卡（计划） |
| [B-10-layout-state](<../handoff/ui-backend/tasks/B-10-layout-state.md>) | 未编号 | 实施任务卡（计划） |
| [B-11-tui-panels](<../handoff/ui-backend/tasks/B-11-tui-panels.md>) | 未编号 | 实施任务卡（计划） |
| [B-12-integration](<../handoff/ui-backend/tasks/B-12-integration.md>) | 未编号 | 实施任务卡（计划） |

## 01 · 总体目标与信息到动作

| 文件 | 源版本 | 文档性质 |
| --- | --- | --- |
| [Harness 开源深研与本机资源研究](<01-vision/harness-deep-research-and-resources.md>) | 2026-10-27 | 公开整理版 |
| [信息驱动的决策与工作流演化 Harness](<01-vision/harness-discussion-v0.1.md>) | 0.1 | 历史公开整理版 |
| [信息驱动的决策与工作流演化 Harness](<01-vision/harness-discussion-v0.2.md>) | 0.2 | 历史公开整理版 |
| [信息驱动的决策与工作流演化 Harness · 调研与讨论稿 v0.3](<01-vision/harness-discussion-v0.3.md>) | 0.3 | 公开整理版 |
| [十个 Agent 仓库核查与 Harness 借鉴分析](<01-vision/ten-agent-repositories-harness-review.md>) | 0.1 | 公开整理版 |

## 02 · Agent 方法、工具面与工作流

| 文件 | 源版本 | 文档性质 |
| --- | --- | --- |
| [Agent 框架 H0 轮任务书](<02-methods/2026-10-19-Agent框架下一轮任务书.md>) | 未编号 | 历史实施计划（未据此确认完成） |
| [Agent 框架下一轮开发设计稿](<02-methods/2026-10-19-Agent框架下一轮开发设计稿.md>) | v1 | 历史实施计划（未据此确认完成） |
| [大型软件架构怎么设计（讨论记录）](<02-methods/2026-10-19-大型软件架构讨论与待续.md>) | 未编号 | 公开整理版 |
| [Agent 与 Workflow 讨论稿 v0.1.0](<02-methods/2026-10-22-Agent与Workflow讨论稿-v0.1.0.md>) | 0.1.0 | 公开整理版 |
| [从修正模式到前置提问：Agent 主动性与提问边界讨论稿 v0.1.1](<02-methods/2026-10-22-Agent主动性与提问边界讨论稿-v0.1.1.md>) | 0.1.1 | 公开整理版 |
| [Agent 工具面设计讨论稿 v0.1.0](<02-methods/2026-10-22-Agent工具面设计讨论稿-v0.1.0.md>) | 0.1.0 | 公开整理版 |

## 03 · 运行底座、长期任务与资源治理

| 文件 | 源版本 | 文档性质 |
| --- | --- | --- |
| [Harness 底座架构重评讨论稿 v0.1.5](<03-runtime/Harness 底座架构重评讨论稿 v0.1.5.md>) | 0.1.5 | 历史公开摘编 |
| [Harness 底座架构重评讨论稿 v0.1.6](<03-runtime/Harness 底座架构重评讨论稿 v0.1.6.md>) | 0.1.6 | 公开摘编 |
| [AI 编码 Harness 主干设计 · 调研与讨论稿 v0.1](<03-runtime/history/AI编码Harness主干设计-源v0.1-公开整理版.md>) | 0.1 | 历史公开整理版 |
| [AI 编码 Harness 主干设计 · 调研与讨论稿 v0.1.1](<03-runtime/history/AI编码Harness主干设计-源文件v0.1.2-公开整理版.md>) | 正文0.1.1；源文件0.1.2 | 历史公开整理版 |
| [DeepSeek Harness 插件开发复盘与 AI Coding 流程](<03-runtime/history/DSH插件开发复盘与AICoding流程-公开整理版.md>) | 未标版本；2026-10-19文件快照 | 历史公开整理版 |

## 04 · Record、记忆与上下文组装

| 文件 | 源版本 | 文档性质 |
| --- | --- | --- |
| [Record 智能记忆与自主上下文组装讨论稿 v0.1.2](<04-memory/Record智能记忆与自主上下文组装-源v0.1.2-公开整理版.md>) | 0.1.2 | 公开整理版 |
| [Super agent 原文与记录机制核查](<04-memory/DeepSeek-SuperAgent原文与记录机制核查-2026-10-31-公开整理版.md>) | 研究笔记；2026-10-31 | 公开整理版 |
| [DeepSeek 上下文组织与首轮执行输入核查](<04-memory/DeepSeek上下文组织与首轮输入核查-2026-10-31-公开整理版.md>) | 研究笔记；2026-10-31 | 公开整理版 |
| [任务条件化上下文组装：论文与运行时核查](<04-memory/任务条件化上下文组装-论文与运行时-2026-10-31-公开整理版.md>) | 研究笔记；2026-10-31 | 公开整理版 |
| [独立上下文组装器：认知科学依据、prefill 成本与验收设计](<04-memory/独立上下文组装器-认知依据与成本验收-2026-10-31-公开整理版.md>) | 研究笔记；2026-10-31 | 公开整理版 |
| [自动本体与会话记忆相关研究](<04-memory/自动本体与会话记忆相关研究-2026-10-31-公开整理版.md>) | 研究笔记；2026-10-31 | 公开整理版 |
| [Record 智能记忆与自主上下文组装讨论稿](<04-memory/Record智能记忆与自主上下文组装-源v0.2历史稿-公开整理版.md>) | 0.2；后续统一编号为0.1.1 | 历史公开整理版 |
| [会话记录常驻 agent · 设计稿 v0.1](<04-memory/会话记录常驻Agent设计-源v0.1-公开整理版.md>) | 0.1 | 早期设计／历史公开整理版 |

## 05 · 通用面板平台

| 文件 | 源版本 | 文档性质 |
| --- | --- | --- |
| [DSH 面板平台](<05-panels/README.md>) | 未编号 | 公开整理版 |
| [DSH 通用面板平台整体设计讨论稿 v0.1.0](<05-panels/docs/design/history/overall-discussion-v0.1.0.md>) | 0.1.0 | 历史公开整理版 |
| [DSH 通用面板平台整体设计讨论稿 v0.1.1](<05-panels/docs/design/history/overall-discussion-v0.1.1.md>) | 0.1.1 | 历史公开整理版 |
| [DSH 通用面板平台整体设计讨论稿 v0.1.2](<05-panels/docs/design/overall-discussion.md>) | 0.1.2 | 公开整理版 |
| [ACC设计讨论入口](<05-panels/docs/handoff/panels/ACC-DESIGN-DRAFT.md>) | 未编号 | 公开整理版 |
| [看板](<05-panels/docs/handoff/panels/BOARD.md>) | 未编号 | 公开整理版 |
| [DSH面板平台设计与实施协作讨论稿 v0.1.0](<05-panels/docs/handoff/panels/COLLABORATION.md>) | 0.1.0 | 公开整理版 |
| [接口契约](<05-panels/docs/handoff/panels/CONTRACT.md>) | 未编号 | 公开整理版 |
| [实现方案讨论入口](<05-panels/docs/handoff/panels/IMPLEMENTATION-DISCUSSION-DRAFT.md>) | 未编号 | 公开整理版 |
| [开源演进讨论入口](<05-panels/docs/handoff/panels/OPEN-SOURCE-EVOLUTION-DRAFT.md>) | 未编号 | 公开整理版 |
| [真宿主探针](<05-panels/docs/handoff/panels/PROBE.md>) | 未编号 | 历史记录（未复测） |
| [给 Codex 的开工提示词](<05-panels/docs/handoff/panels/PROMPT.md>) | 未编号 | 公开整理版 |
| [DSH 面板平台 · 任务包](<05-panels/docs/handoff/panels/README.md>) | 未编号 | 公开整理版 |
| [基础映射 · Foundations.dc.html](<05-panels/docs/handoff/panels/design/Foundations.dc.html>) | 未编号 | 设计附件 |
| [上限样例 · 设计图 · LimitBim.dc.html](<05-panels/docs/handoff/panels/design/LimitBim.dc.html>) | 未编号 | 设计附件 |
| [上限样例 · 知识图谱 · LimitGraph.dc.html](<05-panels/docs/handoff/panels/design/LimitGraph.dc.html>) | 未编号 | 设计附件 |
| [上限样例 · 地图 · LimitMap.dc.html](<05-panels/docs/handoff/panels/design/LimitMap.dc.html>) | 未编号 | 设计附件 |
| [上限样例 · 天体 · LimitSky.dc.html](<05-panels/docs/handoff/panels/design/LimitSky.dc.html>) | 未编号 | 设计附件 |
| [系统上限 · LimitSummary.dc.html](<05-panels/docs/handoff/panels/design/LimitSummary.dc.html>) | 未编号 | 设计附件 |
| [自定义面板 · PanelDefine.dc.html](<05-panels/docs/handoff/panels/design/PanelDefine.dc.html>) | 未编号 | 设计附件 |
| [面板实样 · 桌面端 · PanelGallery.dc.html](<05-panels/docs/handoff/panels/design/PanelGallery.dc.html>) | 未编号 | 设计附件 |
| [面板实样 · TUI · PanelGalleryTui.dc.html](<05-panels/docs/handoff/panels/design/PanelGalleryTui.dc.html>) | 未编号 | 设计附件 |
| [面板平台怎么做 · PanelHow.dc.html](<05-panels/docs/handoff/panels/design/PanelHow.dc.html>) | 未编号 | 设计附件 |
| [面板类型 · PanelTypes.dc.html](<05-panels/docs/handoff/panels/design/PanelTypes.dc.html>) | 未编号 | 设计附件 |
| [基础组件 · Primitives.dc.html](<05-panels/docs/handoff/panels/design/Primitives.dc.html>) | 未编号 | 设计附件 |
| [设计稿导出](<05-panels/docs/handoff/panels/design/README.md>) | 未编号 | 公开整理版 |
| [运行图 · TUI · RunGraphTui.dc.html](<05-panels/docs/handoff/panels/design/RunGraphTui.dc.html>) | 未编号 | 设计附件 |
| [冷灰主题 · TuiTheme.dc.html](<05-panels/docs/handoff/panels/design/TuiTheme.dc.html>) | 未编号 | 设计附件 |
| [dsh-cool-dark.json · dsh-cool-dark.json](<05-panels/docs/handoff/panels/design/themes/dsh-cool-dark.json>) | 未编号 | 设计附件 |
| [dsh-cool-light.json · dsh-cool-light.json](<05-panels/docs/handoff/panels/design/themes/dsh-cool-light.json>) | 未编号 | 设计附件 |
| [P-01-skeleton](<05-panels/docs/handoff/panels/tasks/P-01-skeleton.md>) | 未编号 | 实施任务卡（计划） |
| [P-02-spec](<05-panels/docs/handoff/panels/tasks/P-02-spec.md>) | 未编号 | 实施任务卡（计划） |
| [P-03-data](<05-panels/docs/handoff/panels/tasks/P-03-data.md>) | 未编号 | 实施任务卡（计划） |
| [P-04-shell](<05-panels/docs/handoff/panels/tasks/P-04-shell.md>) | 未编号 | 实施任务卡（计划） |
| [P-05-table](<05-panels/docs/handoff/panels/tasks/P-05-table.md>) | 未编号 | 实施任务卡（计划） |
| [P-06-timeline](<05-panels/docs/handoff/panels/tasks/P-06-timeline.md>) | 未编号 | 实施任务卡（计划） |
| [P-07-graph](<05-panels/docs/handoff/panels/tasks/P-07-graph.md>) | 未编号 | 实施任务卡（计划） |
| [P-08-space](<05-panels/docs/handoff/panels/tasks/P-08-space.md>) | 未编号 | 实施任务卡（计划） |
| [P-09-sandbox](<05-panels/docs/handoff/panels/tasks/P-09-sandbox.md>) | 未编号 | 实施任务卡（计划） |
| [P-10-trust](<05-panels/docs/handoff/panels/tasks/P-10-trust.md>) | 未编号 | 实施任务卡（计划） |
| [P-11-model](<05-panels/docs/handoff/panels/tasks/P-11-model.md>) | 未编号 | 实施任务卡（计划） |
| [P-12-tui](<05-panels/docs/handoff/panels/tasks/P-12-tui.md>) | 未编号 | 实施任务卡（计划） |
| [P-13-types](<05-panels/docs/handoff/panels/tasks/P-13-types.md>) | 未编号 | 实施任务卡（计划） |
| [P-14-ceiling](<05-panels/docs/handoff/panels/tasks/P-14-ceiling.md>) | 未编号 | 实施任务卡（计划） |
| [P-15-integration](<05-panels/docs/handoff/panels/tasks/P-15-integration.md>) | 未编号 | 实施任务卡（计划） |

## 06 · DAG 与协同可视化

| 文件 | 源版本 | 文档性质 |
| --- | --- | --- |
| [00 总则（DAG 详细设计 v1 快速成稿）（公开摘编）](<06-dag/current/docs/design/dag-detailed/00-总则.md>) | 未编号 | 公开摘编 |
| [01 统一口径表（DAG 详细设计 v1 快速成稿）（公开摘编）](<06-dag/current/docs/design/dag-detailed/01-统一口径表.md>) | 未编号 | 公开摘编 |
| [02 代码结构与实施路线（DAG 详细设计 v1 快速成稿）（公开摘编）](<06-dag/current/docs/design/dag-detailed/02-代码结构与实施路线.md>) | 未编号 | 公开摘编 |
| [上传清单与分轮评审（Claude Design · DAG 第一期）](<06-dag/current/docs/design/dag-detailed/03-上传清单与分轮提示.md>) | 未编号 | 公开摘编 |
| [DAG 第一期 · 前端结构需求（交给 Claude Design）（公开摘编）](<06-dag/current/docs/design/dag-detailed/03-前端结构需求.md>) | 未编号 | 公开摘编 |
| [视觉参考收集模板（给「好看」这件事用）](<06-dag/current/docs/design/dag-detailed/03-视觉参考收集模板.md>) | 未编号 | 公开整理版 |
| [04 · 组件库规格（第一版）](<06-dag/current/docs/design/dag-detailed/04-组件库规格.md>) | 未编号 | 公开整理版 |
| [05 · 构建动效讨论稿（点阵 → 成型 → 流动）](<06-dag/current/docs/design/dag-detailed/05-构建动效讨论稿.md>) | 未编号 | 公开整理版（编辑改写） |
| [06 · 布局引擎规格（第二版：够「改之前看影响」这一屏）（公开摘编）](<06-dag/current/docs/design/dag-detailed/06-布局引擎规格.md>) | 未编号 | 公开摘编 |
| [07 · 第一屏收口计划（A：场景①「改之前看影响」）](<06-dag/current/docs/design/dag-detailed/07-第一屏收口计划-2026-10-17.md>) | 未编号 | 公开摘编 |
| [08 · 面板协议 v2 第一版（场景① 先用）](<06-dag/current/docs/design/dag-detailed/08-面板协议v2第一版.md>) | 未编号 | 公开整理版 |
| [09 · 面板头重做（R1 一行头，2026-10-21）](<06-dag/current/docs/design/dag-detailed/09-面板头重做.md>) | 未编号 | 公开整理版 |
| [DAG借鉴Super-agent架构讨论稿 v0.1.0](<06-dag/current/docs/design/dag-detailed/11-借鉴SuperAgent架构讨论稿-v0.1.0.md>) | 0.1.0 | 公开整理版 |
| [项目图（DAG）详细设计 · 公开阅读入口](<06-dag/current/docs/design/dag-detailed/README.md>) | 未编号 | 公开摘编 |
| [布局内核选型试验 · 历史方法摘编](<06-dag/current/docs/design/dag-detailed/layout_spike.md>) | 未编号 | 公开摘编 |
| [09 · 面板头重做（R1 一行头，2026-10-21）](<06-dag/history/dsh-complete/docs/design/dag-detailed/09-面板头重做.md>) | 未编号 | 历史公开整理版 |

## 07 · 远程工作区与双运行模式

| 文件 | 源版本 | 文档性质 |
| --- | --- | --- |
| [DSH rc.5 插件兼容测试记录](<07-remote/DSH-rc.5-插件兼容测试记录-2026-11-04.md>) | 未编号 | 历史记录（未复测） |
| [DSH-前端草图预览-v0.1.0.png · DSH-前端草图预览-v0.1.0.png](<07-remote/DSH-前端草图预览-v0.1.0.png>) | 0.1.0 | 设计附件 |
| [DSH 远程会话 · 前端评审原型 · DSH-远程会话前端原型-v0.1.0.html](<07-remote/DSH-远程会话前端原型-v0.1.0.html>) | 0.1.0 | 设计附件 |
| [DSH 远程工作区与双运行模式讨论稿 v0.1.0](<07-remote/DSH-远程工作区与双运行模式讨论稿-v0.1.0.md>) | 0.1.0 | 公开整理版 |
| [DSH 远程工作区与双运行模式讨论稿 v0.1.1](<07-remote/DSH-远程工作区与双运行模式讨论稿-v0.1.1.md>) | 0.1.1 | 公开整理版 |

## 08 · 浏览器插件与凭据边界

| 文件 | 源版本 | 文档性质 |
| --- | --- | --- |
| [审批（approval）说明](<08-browser/dsh-chrome/docs/APPROVAL.md>) | 未编号 | 公开整理版 |
| [平台扩展架构（Windows / Linux / Edge / Brave / Firefox / 云）](<08-browser/dsh-chrome/docs/ARCHITECTURE-PLATFORM.md>) | 未编号 | 公开整理版 |
| [自动更新（扩展与 provider）](<08-browser/dsh-chrome/docs/AUTO-UPDATE.md>) | 未编号 | 公开整理版 |
| [浏览器支持与部署路线（Chrome / Edge / Safari）](<08-browser/dsh-chrome/docs/BROWSER-ROADMAP.md>) | 未编号 | 公开整理版 |
| [Backend 能力契约（capabilities）](<08-browser/dsh-chrome/docs/CAPABILITIES.md>) | 未编号 | 公开整理版 |
| [结构自审（2026-10-19，0.2.2）](<08-browser/dsh-chrome/docs/CODE-REVIEW-SELF.md>) | 0.2.2 | 公开整理版 |
| [Codex 任务书：代码结构审查](<08-browser/dsh-chrome/docs/CODEX-TASK-STRUCTURE-REVIEW.md>) | 未编号 | 公开整理版 |
| [Computer Use：单独插件的长期规划](<08-browser/dsh-chrome/docs/COMPUTER-USE-PLUGIN.md>) | 未编号 | 公开整理版 |
| [配置（provider config）](<08-browser/dsh-chrome/docs/CONFIG.md>) | 未编号 | 公开整理版 |
| [隔离浏览器上下文（I1）](<08-browser/dsh-chrome/docs/CONTEXTS.md>) | 未编号 | 公开整理版 |
| [公共契约（A-01）](<08-browser/dsh-chrome/docs/CONTRACTS.md>) | 未编号 | 公开整理版 |
| [dsh-chrome 设计文档](<08-browser/dsh-chrome/docs/DESIGN.md>) | 未编号 | 公开整理版 |
| [DSH 右侧边栏原生浏览器面板（Native Sidebar Browser）](<08-browser/dsh-chrome/docs/DSH-SIDEBAR-NATIVE.md>) | 未编号 | 公开整理版 |
| [DSH 右侧边栏浏览器（方案 A viewer 原型）](<08-browser/dsh-chrome/docs/DSH-SIDEBAR.md>) | 未编号 | 公开整理版 |
| [Microsoft Edge 支持（Chromium）](<08-browser/dsh-chrome/docs/EDGE.md>) | 未编号 | 公开整理版 |
| [加固计划（Codex 审查 + 四角度评审后）](<08-browser/dsh-chrome/docs/HARDENING-PLAN.md>) | 未编号 | 公开整理版 |
| [加固队列 1（H1–H3）](<08-browser/dsh-chrome/docs/HARDENING-QUEUE-1.md>) | 未编号 | 公开整理版 |
| [加固队列 2（H4–H8：安全收尾 + close/crash）](<08-browser/dsh-chrome/docs/HARDENING-QUEUE-2.md>) | 未编号 | 公开整理版 |
| [后台浏览器（headless Chromium）H0/H1](<08-browser/dsh-chrome/docs/HEADLESS.md>) | 未编号 | 公开整理版 |
| [Tab lease（I3 基础）](<08-browser/dsh-chrome/docs/LEASES.md>) | 未编号 | 公开整理版 |
| [生命周期与资源表（A-02）](<08-browser/dsh-chrome/docs/LIFECYCLE.md>) | 未编号 | 公开整理版 |
| [内存监控队列（Codex 监控提议）](<08-browser/dsh-chrome/docs/MEMORY-MONITOR-QUEUE.md>) | 未编号 | 公开整理版 |
| [内存/生命周期加固队列（来自 memory-reduction + Codex 新提议）](<08-browser/dsh-chrome/docs/MEMORY-QUEUE.md>) | 未编号 | 公开整理版 |
| [多浏览器 / 多沙盒实例：现状、设计与分阶段计划](<08-browser/dsh-chrome/docs/MULTI-BROWSER-SANDBOX.md>) | 未编号 | 公开整理版 |
| [开源浏览器 Agent 方案调研（2026-10-17）](<08-browser/dsh-chrome/docs/OPEN-SOURCE-NOTES.md>) | 未编号 | 公开整理版 |
| [操作记录（operations.jsonl）](<08-browser/dsh-chrome/docs/OPERATION-LOG.md>) | 未编号 | 公开整理版 |
| [页面 overlay：虚拟鼠标 + 标注](<08-browser/dsh-chrome/docs/OVERLAY.md>) | 未编号 | 公开整理版 |
| [密码与凭据管理（PASSWORD-MANAGEMENT）](<08-browser/dsh-chrome/docs/PASSWORD-MANAGEMENT.md>) | 未编号 | 公开整理版 |
| [平台 bridge / host / 可执行文件审计（E-01）](<08-browser/dsh-chrome/docs/PLATFORM-AUDIT.md>) | 未编号 | 历史记录（未复测） |
| [插件设置设计（PLUGIN-SETTINGS）](<08-browser/dsh-chrome/docs/PLUGIN-SETTINGS.md>) | 未编号 | 公开整理版 |
| [结构重构队列 2（Codex 审查后）](<08-browser/dsh-chrome/docs/REFACTOR-QUEUE-2.md>) | 未编号 | 公开整理版 |
| [结构重构队列 3（工具域 + runtime + headless 动作）](<08-browser/dsh-chrome/docs/REFACTOR-QUEUE-3.md>) | 未编号 | 公开整理版 |
| [结构重构队列 4（剩余工具域 + runtime + headless login）](<08-browser/dsh-chrome/docs/REFACTOR-QUEUE-4.md>) | 未编号 | 公开整理版 |
| [结构重构队列 5（剩余 tools + headless dispatch）](<08-browser/dsh-chrome/docs/REFACTOR-QUEUE-5.md>) | 未编号 | 公开整理版 |
| [结构重构队列 6（headless/viewer/update/tools 组装）](<08-browser/dsh-chrome/docs/REFACTOR-QUEUE-6.md>) | 未编号 | 公开整理版 |
| [安全 / 多沙盒硬化队列 7](<08-browser/dsh-chrome/docs/REFACTOR-QUEUE-7.md>) | 未编号 | 公开整理版 |
| [结构重构队列（给循环子智能体）](<08-browser/dsh-chrome/docs/REFACTOR-QUEUE.md>) | 未编号 | 公开整理版 |
| [分阶段实施计划：从个人用到官方](<08-browser/dsh-chrome/docs/ROADMAP.md>) | 未编号 | 公开整理版 |
| [Safari 可行性 Spike（结论：不属于近期）](<08-browser/dsh-chrome/docs/SAFARI-SPIKE.md>) | 未编号 | 公开整理版 |
| [F1 Spike：实时画面（screencast）可行性](<08-browser/dsh-chrome/docs/SCREENCAST-SPIKE.md>) | 未编号 | 公开整理版 |
| [跨通道机器型 token（sec）](<08-browser/dsh-chrome/docs/SECRETS.md>) | 未编号 | 公开整理版 |
| [安全模型（P2 + 批次 C 后）](<08-browser/dsh-chrome/docs/SECURITY.md>) | 未编号 | 公开整理版 |
| [浏览器侧边栏（side panel）](<08-browser/dsh-chrome/docs/SIDEPANEL.md>) | 未编号 | 公开整理版 |
| [Windows 真机反馈修复队列 1（P1–P3 + P6，目标 0.2.25）](<08-browser/dsh-chrome/docs/WINDOWS-FIX-QUEUE-1.md>) | 0.2.25 | 公开整理版 |
| [Windows 真机反馈修复队列 2（P4/P5/P7，目标 0.2.26）](<08-browser/dsh-chrome/docs/WINDOWS-FIX-QUEUE-2.md>) | 0.2.26 | 公开整理版 |
| [Windows native host：单文件 `dsh-chrome-host.exe`（Node SEA）](<08-browser/dsh-chrome/docs/WINDOWS-HOST.md>) | 未编号 | 公开整理版 |
| [dsh-chrome 插件侧内存占用与优化建议](<08-browser/history/dsh-chrome-memory-reduction.md>) | 未编号 | 历史公开整理版 |
| [DeepSeek Harness 下一步执行路线与智能体团队分工](<08-browser/history/dsh-next-steps-agent-team-plan.md>) | 未编号 | 历史公开整理版 |
| [跨通道凭据与截图遮罩讨论稿 v0.1.5](<08-browser/security/2026-11-05-跨通道凭据与截图遮罩讨论稿-v0.1.5.md>) | 0.1.5 | 历史公开整理版 |

## 09 · 延伸场景与历史补充

| 文件 | 源版本 | 文档性质 |
| --- | --- | --- |
| [工作区活跃度显示讨论稿 v0.1.2](<09-extensions/activity/docs/discussion/工作区活跃度显示讨论稿-v0.1.2.md>) | 0.1.2 | 公开整理版 |
| [工作区活跃度插件 · v0.1 实施稿：官方面板入口 + 活动视图，先读后写](<09-extensions/activity/docs/implementation/工作区活跃度插件-实施稿-2026-10-23.md>) | 未编号 | 公开整理版 |
| [Claude Code 发展史：从 research preview 到现在](<09-extensions/cli/docs/research/claude-code-history.md>) | 未编号 | 公开整理版 |
| [实时讨论工作台的开源参考与公共核心](<09-extensions/discussion/实时讨论工作台开源方案调研-2026-10-28-公开整理版.md>) | 未标版本；2026-10-28 | 公开整理版 |

## 11 · 多模块目标、接续与远程恢复

[入口与分支](11-project-management/README.md) · [试验场景](11-project-management/SCENES.md) · [验证记录](11-project-management/VALIDATION.md)。三个方向讨论稿 v0.1.1，独立分支包含自身实现。
