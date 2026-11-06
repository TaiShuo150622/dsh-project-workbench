# DSH 工作台：开源项目调研与选型讨论稿

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


日期：2026-11-01（America/Los_Angeles）
状态：首轮调研，待讨论。调研执行模型为用户指定的 **GPT-6.1 Terra**；主会话负责汇总、与本地约束对照及重点来源抽查。没有安装依赖、实施产品代码或运行性能基准。

**当前范围更新：设计范围已确定先完整实现 dsh-panels 通用面板平台，再接工作台。** 以下 34 项保留为候选索引；当前优先研究宿主／TUI、虚拟列表和布局机制，工作台业务架构类候选后移。具体优先级及零运行时依赖边界见[平台实施讨论稿](<../../harness/05-panels/docs/handoff/panels/IMPLEMENTATION-DISCUSSION-DRAFT.md>)。

**首轮覆盖 34 个代表项目，为工作台阶段选出 8 个重点研究对象。** 范围覆盖 B01–B12，以及设计稿外围的调度、全文搜索和资源测量；“覆盖”指需求方向有候选，不代表穷尽所有开源项目。保留的基础判断是继续使用现有 DSH／Cordis／dsh-TUI，从其他项目研究分层、状态订阅、工作树关系和渲染方法。

## 1. 先统一选择口径

- **基础**：当前宿主及其扩展能力，优先核对安装版本后复用。
- **优先读**：最可能帮助当前设计决策，列入下一轮源码阅读。
- **对照读**：有学习价值，等具体问题出现再深入。
- **暂缓**：有候选，但当前需求或测量尚未证明需要引入。

“读源码”不表示复制代码或安装依赖。现有交接包要求保持无新增运行时 npm 依赖；桌面前端由构建脚本包装后使用宿主 React，没有现成第三方组件打包流程。若讨论后决定接入库，需要先调整任务卡、依赖与构建边界，再测总开销。[现有约束](<PROMPT.md>)、[构建实现](../../../scripts/build.mjs)

取舍看六项：是否解决当前问题、是否适配宿主、维护来源是否可靠、许可证覆盖哪些包、引入和升级成本、资源开销能否测量。star 数和项目自述不能证明内存或 CPU 达标；其他语言的高效实现也不等于迁移后会更省资源。

## 2. 整体架构与已有基础

| 编号 | 项目／许可证 | 建议 | 值得研究的内容与主要边界 |
|---|---|---|---|
| 01 | [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · MIT | 基础、优先读 | B01–B12 的会话、审批、权限和事件事实来源；按本机宿主版本核对，避免项目层重复持有正文与执行状态。 |
| 02 | [Cordis](https://github.com/cordiverse/cordis) · MIT | 基础、优先读 | 服务注入、订阅所有者与插件卸载释放；研究如何让一份状态投影服务多个视图。 |
| 03 | [dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI) · MIT | 基础、优先读 | B11 面板、共享时钟、渲染与缓存边界；以安装版 `0.16.1` 为核对起点，主干适配文档仅作参考。 |
| 04 | [Pi](https://github.com/earendil-works/pi) · MIT | 优先读 | 代理核心、coding agent、TUI 与扩展的分层；研究核心数据如何独立于界面，整套运行时与 DSH 存在职责重叠。 |
| 05 | [Vibe Kanban](https://github.com/BloopAI/vibe-kanban) · Apache-2.0 | 优先读 | B03/B04/B06/B07 的项目、任务、workspace 与 worktree 关系；适合读架构，作为本项目底座的迁移成本高，维护已转向社区。 |
| 06 | [OpenCode](https://github.com/anomalyco/opencode) · MIT | 对照读 | 会话、事件、客户端与服务边界；其完整应用拓扑不直接套用到同进程 DSH 插件。 |
| 07 | [Zed](https://github.com/zed-industries/zed) · 主要 GPL-3.0-or-later，部分 Apache-2.0 | 对照读 | B04/B10 的工作区、视图与资源生命周期；Rust 实现及逐目录许可需要单独考虑，移植成本高。 |
| 08 | [Zellij](https://github.com/zellij-org/zellij) · MIT | 对照读 | B10/B11 的终端 pane、焦点和插件生命周期；完整终端复用器不适合作为当前面板的直接依赖。 |

**维护信息有一处必须准确区分。** Vibe Kanban 的 2026-04-10 公告称 bloop 公司关闭，远程服务将在 30 天后移除，本地 workspace 继续工作，开源项目由社区继续维护。因此不能把 README 的 “sunsetting” 简化为“开源项目停止维护”；本稿保留其架构研究价值，后续维护持续性仍需观察。[官方公告](https://www.vibekanban.com/blog/shutdown)

仓库名称也已核对：原 `badlogic/pi-mono` 现重定向至 `earendil-works/pi`；原 `sst/opencode` 现指向 `anomalyco/opencode`。后续阅读使用现仓库，并记录实际阅读的 commit，避免追着默认分支变化作判断。[Pi README](https://github.com/earendil-works/pi/blob/main/README.md)、[OpenCode 仓库](https://github.com/anomalyco/opencode)

## 3. 各小方向的候选

### TUI、状态与持久化

| 编号 | 项目／许可证 | 建议 | 对应问题与主要边界 |
|---|---|---|---|
| 09 | [Ink](https://github.com/vadimdemedes/ink) · MIT | 对照读 | B11：React 终端渲染和更新范围；先核对 dsh-TUI 内置实现，不重复引入渲染器。 |
| 10 | [Bubble Tea](https://github.com/charmbracelet/bubbletea) · MIT | 暂缓 | B11：消息驱动更新模型；Go 运行时意味着较大的替换或桥接成本。 |
| 11 | [Ratatui](https://github.com/ratatui/ratatui) · MIT | 暂缓 | B11：视口与终端布局；Rust 组件不能直接放进现有 Node 插件，性能优劣需同负载比较。 |
| 12 | [XState](https://github.com/statelyai/xstate) · MIT | 对照读 | B01/B02：状态迁移和事件建模；先把宿主事实归约清楚，再判断是否需要状态机运行时。 |
| 13 | [Zustand](https://github.com/pmndrs/zustand) · MIT | 对照读 | B02/B03：选择性订阅；宿主 React、引用稳定性和实际构建方式需适配。 |
| 14 | [Nano Stores](https://github.com/nanostores/nanostores) · MIT | 对照读 | B02/B03：小状态与订阅生命周期；体积宣传不能替代本项目内存测量。 |
| 15 | [node-lru-cache](https://github.com/isaacs/node-lru-cache) · BlueOak-1.0.0 | 对照读 | B03/B07/B09：容量、淘汰与缓存生命周期；除条目数外还要约束字节数和总预算。 |
| 16 | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) · MIT | 暂缓 | B01/B05/B09：索引与事务候选；现有 JSON 写放大或查询成本实测超标后再比较，原生模块增加分发和兼容工作。 |

### 资料库、Git 与长列表

| 编号 | 项目／许可证 | 建议 | 对应问题与主要边界 |
|---|---|---|---|
| 17 | [Chokidar](https://github.com/paulmillr/chokidar) · MIT | 对照读 | B04/B09：跨平台文件通知与清理；先复用宿主通知，限制 watcher 范围，合并重复事件。 |
| 18 | [simple-git](https://github.com/steveukx/git-js) · MIT | 对照读 | B04：Git 调用封装；本项目已有子进程适配，优先补并发、NUL 分隔解析及失败处理。 |
| 19 | [ripgrep](https://github.com/BurntSushi/ripgrep) · Unlicense／MIT | 暂缓 | B04 与后续搜索：忽略规则和有界搜索；外部二进制可用性、分发与进程开销需要纳入设计。 |
| 20 | [diff2html](https://github.com/rtfpessoa/diff2html) · MIT | 对照读 | B04：Web 差异呈现与截断；不能直接用于 TUI，也不能靠截断显示掩盖后台全量解析成本。 |
| 21 | [TanStack Virtual](https://github.com/TanStack/virtual) · MIT | 优先读 | B03/B04/B07：动态行高、可见窗口和滚动锚点；Web 适配器与 TUI 的测量和滚动机制不同。 |

### 地图、时间线与布局

| 编号 | 项目／许可证 | 建议 | 对应问题与主要边界 |
|---|---|---|---|
| 22 | [React Flow／xyflow](https://github.com/xyflow/xyflow) · MIT 开源核心 | 对照读 | B06：节点交互、视口与选择；属于 Web 组件，商业 Pro 资源另计，接入前要讨论构建与依赖。 |
| 23 | [Dagre](https://github.com/dagrejs/dagre) · MIT | 优先读 | B06：有向图布局；用实际图比较环、稳定位置和重算范围，不能预设每次状态更新都重新布局。 |
| 24 | [elkjs](https://github.com/kieler/elkjs) · EPL-2.0 | 暂缓 | B06：复杂图布局的备选；先确认复杂度需求，再评估许可、打包和布局成本。 |
| 25 | [Dockview](https://github.com/dockview/dockview) · 核心 MIT | 对照读 | B10：docking、布局序列化和焦点；Web 组件不能直接用于 TUI，Enterprise 包为商业许可。 |
| 26 | [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) · MIT | 对照读 | B10：分屏尺寸约束和键盘操作；先判断宿主布局是否已经足够，避免重复布局状态。 |
| 27 | [Frappe Gantt](https://github.com/frappe/gantt) · MIT | 对照读 | B08：时间轴、缩放与任务条；是否适合短时工作流、持续更新和 TUI 需要另验。 |

Dockview 根许可证说明分别列出 `dockview-core`、`dockview`、`dockview-react` 等 MIT 包，以及专有的 `dockview-enterprise`。选型时必须落实到具体包和版本，不能用仓库级标签覆盖商业包。[Dockview 许可证说明](https://github.com/dockview/dockview/blob/master/LICENCE.md)

### 流式内容、图表与外围能力

| 编号 | 项目／许可证 | 建议 | 对应问题与主要边界 |
|---|---|---|---|
| 28 | [Streamdown](https://github.com/vercel/streamdown) · 根许可证 Apache-2.0 | 优先读 | B09：不完整 Markdown 与流式显示；重点研究更新边界，具体包、插件及长文本成本尚需核对。 |
| 29 | [markdown-it](https://github.com/markdown-it/markdown-it) · MIT | 对照读 | B09：解析规则与插件接口；是否重新解析整个文档取决于接入方式，不能直接假定增量处理。 |
| 30 | [uPlot](https://github.com/leeoniya/uPlot) · MIT | 暂缓 | B09 图表：时间序列绘制候选；需确定图表需求、按需加载及浏览器资源预算。 |
| 31 | [Apache ECharts](https://github.com/apache/echarts) · Apache-2.0 | 暂缓 | B08/B09 图表：复杂图表候选；功能范围较广，应先明确真正需要的图形和加载方式。 |
| 32 | [Croner](https://github.com/Hexagon/croner) · MIT | 暂缓 | 设计外围：cron 与时区；不替代任务持久化、重启补偿、取消和错过执行的处理。 |
| 33 | [MiniSearch](https://github.com/lucaong/minisearch) · MIT | 暂缓 | 设计外围：本地全文索引与增量更新；需测索引内存，全文搜索不等于项目记忆，来源、权限和时间仍由项目设计。 |
| 34 | [MemLab](https://github.com/facebook/memlab) · MIT | 对照读，开发期工具 | B12：堆快照与泄漏排查；浏览器自动化能力不等于支持本项目 TUI 验收，先用 Node 内置指标建立基线。 |

图表渲染、定时任务和项目记忆尚未被 B01–B12 完整定义。将其纳入候选覆盖，不等于已经计入原 18＋4 天排期。GitHub CI 查询优先研究现有宿主集成和 GitHub 官方 API；上下文占用率优先读取宿主／模型提供的口径，本轮不为这些指标另选一个庞大平台。

## 4. 下一轮优先读什么

下面 8 项是原工作台阶段的源码研究短名单。排序按需求适配性和少改宿主的原则，不按 star 排名；Pi 与 Vibe Kanban 提供不同的架构参照，OpenCode 保留为后续交叉对照。当前面板平台的执行顺序以本稿顶部链接的实施讨论稿为准。

| 优先项目 | 已核对入口与本轮深度 | 下一轮要回答的问题／应交付的结论 |
|---|---|---|
| DSH | [仓库](https://github.com/deepseek-ai/deepseek-harness)、本地计划审批实现（原文引用，未随公开文档附带）；结合前轮本地核对 | 每种状态来自哪个事件或服务？停止、审批结束和重连时如何失效？形成事实来源表，并与安装版对照。 |
| dsh-TUI | 已读 [ADAPTER.md](https://github.com/ccch1mneyyy/dsh-TUI/blob/main/ADAPTER.md)；前轮已核对安装版面板声明（原文引用，未随公开文档附带） | 面板如何注册、隐藏、卸载，哪些时钟和组件可复用？形成最小扩展与资源释放检查表。 |
| Cordis | 已核对 [packages 目录](https://github.com/cordiverse/cordis/tree/main/packages)，具体实现待读 | 投影、订阅、watcher 由谁持有和清理？形成一个项目一份投影、多个视图共享的生命周期图。 |
| Pi | 已读 [README](https://github.com/earendil-works/pi/blob/main/README.md)，核对 agent／coding-agent／TUI 分包，具体实现待读 | 哪些状态应由核心持有，界面只保留哪些显示状态？形成可借鉴的分层规则，避免迁移整个运行时。 |
| Vibe Kanban | 已核对 [workspace-manager/src](https://github.com/BloopAI/vibe-kanban/tree/main/crates/workspace-manager/src)、[worktree-manager](https://github.com/BloopAI/vibe-kanban/tree/main/crates/worktree-manager)、[db](https://github.com/BloopAI/vibe-kanban/tree/main/crates/db) 目录，调用链待读 | 项目、任务、会话和工作树如何区分身份、创建、恢复和清理？对照 B07 重试幂等与生命周期约定。 |
| TanStack Virtual | 已读 [README](https://github.com/TanStack/virtual/blob/main/README.md)，算法实现待读 | 长历史动态高度变化时如何保持滚动锚点？分别列 Web 与 TUI 可借鉴的机制，不能直接套用 DOM 假设。 |
| Dagre | 已核对 [lib 目录](https://github.com/dagrejs/dagre/tree/master/lib)，布局与环处理实现待读 | 图结构不变时能否不重算？出现环、展开节点和截断时位置是否稳定？先明确夹具与比较指标。 |
| Streamdown | 已核对 [packages 目录](https://github.com/vercel/streamdown/tree/main/packages) 和根许可，流式实现待读 | 不完整代码块和持续 token 流怎样处理？区分输入归约与显示刷新，明确是否存在全量重解析。 |

建议为上述源码阅读留 **2–3 个有效推进日**：先读 DSH／dsh-TUI／Cordis，再读 Pi／Vibe Kanban 的状态与关系分层，最后围绕长列表、地图和流式内容查具体问题。每条只输出“借鉴什么、为什么适合、还需验证什么”，没有具体问题的项目暂不深挖。

这项研究与原 D1–D2 的接口和性能准备有重叠，应合并安排；若源码核对挤占最小扩展和基线测量时间，就重排里程碑。原 **18＋4 天仍为待选型的粗估**，本轮没有据此承诺缩短工期。

## 5. 这轮对架构讨论的影响

| 层次 | 本期建议 | 开源研究提供的帮助 |
|---|---|---|
| 宿主与执行 | DSH／Cordis 继续持有会话、权限、任务执行与生命周期 | 从已有事实来源接数据，避免再建立一套会话运行时 |
| 项目服务 | 一个项目一份轻量投影，增量失效，摘要与历史分层 | 对照 Pi 的分层、状态库的选择性订阅；实现仍可保持现有纯函数与宿主服务 |
| 项目与工作树 | 保留现有服务，补稳定身份、幂等、恢复及清理约定 | 研究 Vibe Kanban 的关系模型，不迁入其完整应用拓扑 |
| Web／TUI 呈现 | 共享业务语义，各自采用适合的展示方式 | Web 长列表、图和布局库可供参考；TUI 优先复用 dsh-TUI 的视口、组件与时钟 |
| 内容与持久化 | 正文按需读、缓存有界、隐藏停止重处理；低频小状态先沿用 JSON 队列 | 从缓存与流式库核对边界；出现查询或写放大证据后才比较 SQLite |
| 资源验收 | 先用 Node 指标、Inspector 和宿主观测，再按定位需要加入开发工具 | MemLab 是诊断候选，不能代替原版／插件关闭／正常使用三组对比 |

资源测量仍沿用原稿：既看应用总内存和 CPU，也看工作台新增开销；记录按键反馈、重绘、缓存、队列和订阅数量。内存与延迟阈值必须由固定版本、固定负载的结果确定。[Node 内存与 CPU 指标](https://nodejs.org/docs/latest-v24.x/api/process.html#processmemoryusage)、[Node 事件循环指标](https://nodejs.org/docs/latest-v24.x/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions)、[原稿资源验收](<BACKEND-PLAN-DRAFT.md>)

## 6. 本轮完成边界

已完成：按功能方向检索并核对候选仓库；读取仓库元数据和重点官方文档／许可证；核实 Pi、OpenCode 的仓库迁移、Vibe Kanban 的公司与远程服务变化、Dockview 的开源／商业包边界；与本地交接及构建约束对照。

尚未完成：逐项实现审读、所有子包许可证审查、固定 commit 的依赖与兼容验证、安装运行、相同负载下的性能比较。表中的“优先读”是下一轮研究顺序，不能表述为已验证可接入或已验证低占用。GitHub 未归档只是状态信息，不能证明维护质量。

本轮不宣称已决定新增依赖。工作台恢复实施时，再讨论上述 8 项的阅读顺序和依赖取舍；当前面板平台优先级与完整排期已集中到顶部链接的实施讨论稿，选型继续以兼容和资源证据为依据。
