depends: B-01-phase-history
verify: node --test tests/goal.test.mjs && npm test && node scripts/mutation-check.mjs && npm run build

# B-05-project-goal

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

实现项目级目标和完成标准，以及 `goal-get`、`goal-set`、`project_goal` 工具。

## 类别

写代码

## 只许改 / 新建的文件

- `server/goal.js`（新建）
- `server/projects.js`
- `index.js`
- `scripts/build.mjs`、`scripts/mutation-check.mjs`
- `tests/goal.test.mjs`（新建）

## 步骤

1. 项目加 `goal` 字段，形状照契约。
2. `goal-set` 给人用，能改一切。
3. `project_goal` 给总对话用，能改文字和标准，不能设 `done`。
4. 工作线程在 `project_report` 里可以带 `criteria_evidence`，只写证据，不改完成状态。
5. 目标文字进 `projects.context()` 的系统上下文。

## 默认值（没有人回答问题时按这个做）

- 一个项目一个目标，换目标时旧的进 `goalHistory`。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 工作线程和总对话都不能把目标标完成，有负向用例。
- 不读也不写 DSH 单会话的 `/goal`。

## 不要做

- 不提交（调度器提交）
- 不改上面清单之外的文件
