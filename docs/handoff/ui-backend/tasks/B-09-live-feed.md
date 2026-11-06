depends: B-01-phase-history
verify: node --test tests/live.test.mjs && npm test && node scripts/mutation-check.mjs && npm run build

# B-09-live-feed

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

实现实时内容：`live_publish` 工具，`live-list`、`live-read` 接口。

## 类别

写代码

## 只许改 / 新建的文件

- `server/live.js`（新建）
- `index.js`
- `config/hyperparams.yaml`
- `scripts/build.mjs`、`scripts/mutation-check.mjs`
- `tests/live.test.mjs`（新建）

## 步骤

1. 内容单独存 `$DSH_HOME/project-workbench/live/`，不进 `projects.json`。
2. `live_publish` 带 `body` 时存内联，带 `path` 时只记路径，读的时候按修改时间取最新内容。
3. 路径校验照 B04，只能是项目 root 或线程工作树内。
4. 环形淘汰，单项大小和总数登记超参。
5. `note` 只记录，不进 `live-list` 的面板项，放在单独的 `notes` 数组。

## 默认值（没有人回答问题时按这个做）

- 单项上限 512 KB，总数 64。
- 项目成员都能发。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 文件更新后 `revision` 增加。
- 指向项目外的路径被拒绝。
- 淘汰不删除 `source.file` 指向的文件。

## 不要做

- 不提交（调度器提交）
- 不改上面清单之外的文件
- 不向会话写任何消息
