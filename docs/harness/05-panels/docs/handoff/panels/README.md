# DSH 面板平台 · 任务包

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


给 Codex 用。目标：用户和模型写一份 `panel.json` 就能得到一个面板，桌面和终端都能看。平台按通用类型实现，领域任务通过示例及扩展表达。

当前讨论入口为[整体讨论与设计稿](<../../design/overall-discussion.md>)。本目录已接收`6369a62`的终端框图更新；ACC、资源、权限和依赖的其他修订集中在主稿，实施前完成契约和任务卡同步。前三份专题草稿已合并，原文件入口仅作导航。

主稿v0.1.2核对新包`dsh-panels-handoff-6369a62.zip`的54个文件与`6369a62`完全一致，保留v0.1.0对旧包49文件的历史核对。终端框图基本要求、三项参数及P-12地板24已同步，实际视口、隐藏节点等细化仍需冻结。另见[读取与TUI适配](<../../design/overall-discussion.md#contract-details>)：`open`五秒限制是主动打开限速，不是周期打开／刷新。

双方协作见[COLLABORATION.md](<COLLABORATION.md>)：当前会话管理设计，新实施主会话按单写者逐卡执行，Claude独立审查；通过明确提交、变更交接单和验证回执接续。阶段A尚未完成，本轮没有启动实施线。

[首批示范](<../../design/overall-discussion.md#scenarios>)已确定为量化、研究、证明、优化、基础coding；主稿同时细化了操作路径、数据口径与场景验收。五类示例与P-14原有四个上限样例分别承担业务可用性与性能验证，实施前需同步P-14/P-15的允许文件及验收入口。

- [设计稿导出](design/README.md)：保留本地设计源；原在线私有链接不公开。
- 基线：本仓 `main`，新项目，目前只有任务包和探针，没有业务代码
- DSH 源码参考：`${PROJECTS_ROOT}/deepseek-harness`，`687f282e`，只读。本机桌面版 0.2.1-rc.3
- 终端：dsh-tui 0.16.1
- 与 `dsh-project-workbench` 保持运行时职责独立；当前实施顺序为先完整实现面板平台，再接工作台

## 为什么是独立插件

工作台插件没有运行时依赖，也不该背面板类型。面板平台要能单独安装，也要能给工作台和别的插件用。

## 读的顺序

设计与范围讨论先读[统一主稿](<../../design/overall-discussion.md>)和[协作文档](<COLLABORATION.md>)，确认阶段A及当卡所需修订已经同步、拿到完整冻结提交，再按下面的执行材料阅读：

1. `PROMPT.md`：开工提示词和硬规则
2. `CONTRACT.md`：接口和数据形状，唯一口径
3. `PROBE.md`：写契约前在真宿主里量到的东西
4. `BOARD.md`：顺序、谁来验、当前进度
5. `tasks/` 里当前要做的那张卡

## 设计稿到任务卡

| 设计稿画板 | 要做的 | 任务卡 |
|---|---|---|
| 自定义面板 · 第一级 | 配置、校验、错误提示 | P-02 |
| 面板类型 · 七件事 | 外壳、五种状态、三档尺寸 | P-04 |
| 面板类型 · 表格、时序 | 两种内置类型 | P-05 P-06 |
| 面板类型 · 关系、空间 | 两种内置类型 | P-07 P-08 |
| 自定义面板 · 第二级 | 沙箱、`dsh-panel.js`、批准 | P-09 P-10 |
| 七件事 · 选中回到对话、AI 能指 | 模型工具、引用 | P-11 |
| 面板类型 TUI | 一个入口、字符退路 | P-12 |
| 运行图 · TUI | 只取中间那一列：`graph` 的终端框图 | P-12 |
| 自定义面板 · 第三级 | 类型注册、组合 | P-13 |
| 系统上限 | 四个样例、真宿主上限 | P-14 |
| 全部 | 真桌面走一遍 | P-15 |

## 不在这一包

- 改 DSH、dsh-tui 上游。
- 插件市场。第三方类型能注册就够了。
- 在线地图瓦片服务、IFC、DWG 解析。第二级能接，平台不内置。
- 运行条的甘特图。数据在工作台任务包的 B08，界面接线另算。
- 运行图整屏（`design/RunGraphTui.dc.html` 的流动点、检查点栏、详情栏、事件日志）。归后续工作台，到时直接复用这一包 `graph` 的框图画法。
- 写回数据。面板只读，写回走对话和审批。
- 图表、文档、媒体、实时四族的专用内置类型。第一版靠 `custom`，要不要内置看用起来的情况。

## 历史开工与调度示例

本节保留原任务包的执行安排，用于理解交接方式。公开文集没有附带 `tools/run-card.sh` 或运行日志，下面的调度命令不能直接在本公开档案中执行；实施前应重新核对冻结版本、工具与任务卡。

先完成协作文档的阶段A冻结单，核对现有工作树；只有没有适用工作树时才新建。下列`<冻结提交完整SHA>`必须替换为冻结单记录的真实提交，不能直接用随时变化的main代替。本节是后续操作说明，当前尚未执行。

```bash
cd ${PROJECTS_ROOT}/dsh-panels
git fetch origin main
git worktree list
git worktree add -b codex/panels ../dsh-panels-work <冻结提交完整SHA>
cd ../dsh-panels-work
echo .handoff-logs >> "$(git rev-parse --git-common-dir)/info/exclude"
```

原任务包按看板顺序调度一张卡的示例：

```bash
docs/handoff/panels/tools/run-card.sh docs/handoff/panels/tasks/P-01-skeleton.md
```

原调度设计是让 Codex 执行任务卡，再单独运行卡上的 verify，最多两轮；通过后仍需人工查看改动才提交。这是历史流程说明，不代表该卡已执行或通过。

## 已知的坑

- `dsh plugin --profile x add` 自己建的 profile 没有网页组件，插件会一直 pending。要先 `dsh --profile x --from-default-profile web --dump-config`，再 `plugin add`。反过来，已有 profile 再带 `--from-default-profile` 启动会把装好的插件清掉。
- 这个 CLI 里 `web` 是 `--from-default-profile` 的值，不是子命令。启动写 `dsh x --no-open --port N`。
- 顶层 `inject` 列了没有的服务，插件静默 pending。可选服务用 `ctx.inject` 或 `ctx.get`。
- `ctx.connection.rpc.handle` 在 DSH 0.2.x 失效，端点用 `ctx.connection.fetch.register`。
- `remote.workspaceFiles` 要单独写进 inject，只写 `remote` 取不到。
- `fetch` 大响应是 16 KiB 一段，别一段发一条消息。
- 响应不写 `cache-control: no-transform` 会被压缩，慢好几倍，但功能全对。
- `sandbox` 属性不断网，CSP 才断。CSP 拦不住 WebRTC 和页面自身跳转。
- 隐藏的浏览器窗格会被节流，帧率和延迟都量不准。量性能用独立的无头 Chrome，并和空页面同时比。
- Node ESM 热加载会复用旧模块，发布版要带内容哈希的目录，见工作台的 `scripts/release.mjs`。
- 设计稿 `design/*.dc.html` 只供查看，不能单独运行，缺设计画布自带的 `support.js`。
