depends: B-01-phase-history
verify: node --test tests/timeline.test.mjs && npm test && node scripts/mutation-check.mjs && npm run build

# B-08-timeline

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

实现 `timeline`，把工作流事件和线程历史变成甘特图要的数据。

## 类别

写代码

## 只许改 / 新建的文件

- `server/timeline.js`（新建）
- `index.js`
- `scripts/build.mjs`、`scripts/mutation-check.mjs`
- `tests/timeline.test.mjs`（新建）

## 步骤

1. 查 `packages/client/ui-workflow-run/src/client/workflow-definition.ts` 和 `packages/workflow/workflow/src/types.ts`，确认 `tool-workflow/run-start`、`agent-start`、`agent-end`、`run-end` 的数据形状。时间用事件信封的 `time`。
2. 写纯函数 `workflowTimeline(events)`，按运行、阶段、成员分层。
3. 写纯函数 `threadTimeline(project)`，用线程 `history`。
4. 崩溃后缺结束事件的成员 `end` 为 null，运行状态为 `interrupted`。

## 默认值（没有人回答问题时按这个做）

- 同一会话多次运行都返回，按开始时间排。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 用例里事件形状和 DSH 源码一致，注明出处。
- 并行成员的起止互不影响。

## 不要做

- 不提交（调度器提交）
- 不改上面清单之外的文件
- 不放开 `index.js` 工具守卫里对 `workflow` 的限制
