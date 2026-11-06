depends: B-01-phase-history
verify: node --test tests/status.test.mjs && npm test && node scripts/mutation-check.mjs && npm run build

# B-02-display-status

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

算出 `CONTRACT.md` 状态表里的 `display`、`statusText`、`group`，在跑的线程卡在审批或提问时能显示出来。

## 类别

写代码

## 只许改 / 新建的文件

- `server/status.js`（新建）
- `server/native.js`
- `server/projects.js`
- `scripts/build.mjs`、`scripts/mutation-check.mjs`
- `tests/status.test.mjs`（新建）
- `docs/handoff/ui-backend/CONTRACT.md`（只在 `plan` 查不到时改）

## 步骤

1. 查 `${PROJECTS_ROOT}/deepseek-harness/packages/interaction/user-approval/src`、`packages/core/session/src/known-event-types.ts`、`packages/client/ui-workspace/src/client/rows/Rows.tsx`，确认未决审批、未答提问、计划待审分别从哪来。
2. 写纯函数 `pendingFromEvents(events)`，返回 `approval`、`question`、`plan` 三个布尔值。
3. 写纯函数 `displayOf(thread, pending, running)`，实现状态表，优先级照契约。
4. 给 `Native` 加读取方法，按 `seq` 缓存，避免每次轮询全量读事件。
5. `publicProject` 的线程加上这三个字段。

## 默认值（没有人回答问题时按这个做）

- `plan` 的来源查不到就从状态表去掉，并在收尾说明里写。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- `approval/asked` 后跟了对应的 `approval/decided`，不再算等待。
- 状态表每一行都有用例。

## 不要做

- 不提交（调度器提交）
- 不改上面清单之外的文件
- 不从前端文案反推状态
