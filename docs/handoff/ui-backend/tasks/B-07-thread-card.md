depends: B-02-display-status
verify: node --test tests/thread-card.test.mjs && npm test && node scripts/mutation-check.mjs && npm run build

# B-07-thread-card

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

实现 `thread-tail` 和 `thread-fork`，给地图卡片和常驻卡片用。

## 类别

写代码

## 只许改 / 新建的文件

- `server/thread-card.js`（新建）
- `server/native.js`
- `server/projects.js`
- `index.js`
- `config/hyperparams.yaml`
- `scripts/build.mjs`、`scripts/mutation-check.mjs`
- `tests/thread-card.test.mjs`（新建）

## 步骤

1. `thread-tail` 复用 `Projects.read` 的取消息逻辑，不经过模型工具的身份检查，但要校验线程属于项目。
2. 写纯函数 `currentLine(events)`，取最后一个工具调用或助手句子。
3. `thread-fork` 调 `sessionController.fork`，请求形状看 `packages/api/session-controller/src/types.ts`。新线程 `mode` 为 `attached`，记 `forkedFrom`，`phase` 为 `review`，不启动。

## 默认值（没有人回答问题时按这个做）

- `limit` 默认 3，上限 20，登记超参。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 分支不向原线程发消息，不改原线程状态。
- 线程没有 `sessionId` 时返回空，不报错。

## 不要做

- 不提交（调度器提交）
- 不改上面清单之外的文件
- 不做发消息和审批接口，卡片里嵌原生会话
