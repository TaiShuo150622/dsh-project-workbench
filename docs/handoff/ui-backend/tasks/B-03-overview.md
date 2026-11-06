depends: B-02-display-status
verify: node --test tests/overview.test.mjs && npm test && node scripts/mutation-check.mjs && npm run build

# B-03-overview

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

实现 `overview` 接口，给线程面板的分组、计数、下一步和产出。

## 类别

写代码

## 只许改 / 新建的文件

- `server/overview.js`（新建）
- `index.js`
- `config/hyperparams.yaml`
- `scripts/build.mjs`、`scripts/mutation-check.mjs`
- `tests/overview.test.mjs`（新建）

## 步骤

1. 写纯函数 `buildOverview(project, opts)`。
2. 产出从两处来：线程 `outputs`，以及线程会话里 `tool-present` 声明的文件。先查 `packages/deliverables/tool-present/src`。
3. 实现 `sinceRevision`，没变时只回 `{notModified:true, revision}`。
4. 在 `index.js` 注册端点。

## 默认值（没有人回答问题时按这个做）

- `resolvedLimit` 默认 3，登记超参。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 四组的线程数相加等于项目线程总数。
- 别的项目的 ID 被拒绝。

## 不要做

- 不提交（调度器提交）
- 不改上面清单之外的文件
- 不改现有 `list` 接口，前端还在用
