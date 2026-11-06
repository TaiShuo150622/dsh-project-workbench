# DSH 统一组件库 · 后端任务包

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


给 Codex 用。目标：让设计稿里的工作台、会话地图、工作流甘特、实时面板、会话常驻有真数据可接。

- [设计稿导出](design/README.md)：保留本地设计源；原在线私有链接不公开。
- 基线：`dsh-project-workbench` 的 `codex/dsh-project-workbench` 分支，`1c093d9`，`npm test` 17 条全过
- DSH 源码参考：`${PROJECTS_ROOT}/deepseek-harness`，`687f282e`，只读
- 本包只管后端。前端、DSH 上游、dsh-tui 上游都不在范围内

## 为什么落在这个仓

这个插件已经有项目、总对话、持久工作线程、工作树、差异查看和右侧栏标签，设计稿要的线程面板正好长在它上面。插件能直接拿到 `sessionController`、`agents`、`workspaceRegistry`，不用改 DSH。

## 读的顺序

1. `PROMPT.md`：开工提示词和硬规则
2. `CONTRACT.md`：接口和数据形状，唯一口径
3. `BOARD.md`：线怎么切、谁来验、当前进度
4. `tasks/` 里当前要做的那张卡

## 设计稿到后端

| 设计稿画板 | 要的数据 | 现状 | 任务卡 |
|---|---|---|---|
| 工作台 · 线程页 | 分组列表、下一步、产出、计数 | `list` 只有平铺线程 | B01 B02 B03 |
| 工作台 · 资料库 | 连接的文件夹、线程工作区、改动标记 | 只有单线程 `diff` | B04 |
| 工作台 · 目标 | 项目级目标和完成标准 | 目标只属于单个会话 | B05 |
| 会话地图 | 节点、边、证据、版本号 | 有 `dependsOn`，没有图载荷 | B06 |
| 地图卡片、常驻卡片 | 最后几句话、当前一行、开分支 | 只有模型工具 `project_read_thread` | B07 |
| 工作流收成甘特图 | 成员起止时间 | 会话事件里有，没有汇总 | B08 |
| 实时弹出 | 不进对话的文档、输出、提醒 | 没有 | B09 |
| 分屏、会话常驻 | 哪些大、哪些缩小、顺序 | 没有 | B10 |
| 实时弹出 · TUI、TUI 工作台 | 上面的数据进 dsh-tui 侧栏 | dsh-tui 有 `tuiPanels` 服务，未接 | B11 |
| 全部 | 真桌面走一遍 | 有 `docs/acceptance.md` 的做法 | B12 |

## 不需要后端的

- **卡片里对话和审批**：直接嵌原生会话。`client/app.js` 已有 `EmbeddedConversation`，发消息、审批、回答都走 DSH 自己的组件。
- **动效、布局、状态符号**：都是前端的事。图的位置由前端布局引擎算，后端不给坐标。

## 历史开工与调度示例

本节保留原任务包的执行安排，用于理解交接方式。公开文集没有附带 `tools/run-card.sh` 或运行日志，下面的调度命令不能直接在本公开档案中执行；实施前应重新核对冻结版本、工具与任务卡。

```bash
cd ${PROJECTS_ROOT}/dsh-project-workbench
git worktree add -b codex/ui-backend ../dsh-project-workbench-ui-backend 1c093d9
cd ../dsh-project-workbench-ui-backend
npm ci
cp -R ../dsh-project-workbench/docs/handoff docs/
echo .handoff-logs >> "$(git rev-parse --git-common-dir)/info/exclude"
npm test
```

原任务包按顺序调度一张卡的示例：

```bash
docs/handoff/ui-backend/tools/run-card.sh docs/handoff/ui-backend/tasks/B-01-phase-history.md
```

原调度设计是让 Codex 执行任务卡，再单独运行卡上的 verify，最多两轮；通过后仍需人工查看改动才提交。这是历史流程说明，不代表该卡已执行或通过。

## 已知的坑

- `client.js` 和 `build.json` 是构建产物。`scripts/build.mjs` 只对列出的文件算哈希，新加 `server/*.js` 要补进列表，否则热更新认不出来。
- `scripts/mutation-check.mjs` 只跑写死的两个测试文件，新测试要加进去，新变异才杀得掉。
- `index.js` 的工具守卫禁止项目成员用 `workflow`、`subagent*`。所以项目线程里不会有工作流，B08 的工作流时间线服务普通会话，线程时间线走 B01 的历史。
- dsh-tui 的面板接口是 React 组件，`open` 有 5 秒限速，所以实时内容靠 `badge` 提示，不靠自动弹出。
- 线程会话和总对话之间没有 `parentSession`，这是有意的（`server/projects.js` 第 31 行）。地图上的这类边来自项目成员关系，不是会话血缘。
