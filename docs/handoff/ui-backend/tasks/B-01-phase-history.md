depends: none
verify: node --test tests/history.test.mjs && npm test && node scripts/mutation-check.mjs && npm run build

# B-01-phase-history

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

线程记下每次阶段变化的时间，汇报能带下一步和 PR，旧数据照常读。

## 类别

写代码

## 只许改 / 新建的文件

- `server/threads.js`（新建）
- `server/projects.js`
- `server/store.js`
- `index.js`
- `config/hyperparams.yaml`
- `scripts/build.mjs`、`scripts/mutation-check.mjs`
- `tests/history.test.mjs`（新建）

## 步骤

1. 在 `server/threads.js` 写 `setPhase(thread, phase)`，改 `phase` 并往 `history` 追加 `{phase, at}`。
2. `server/projects.js` 里所有直接赋值 `phase` 的地方都改走它。
3. 打开 `projects.json` 时补默认值：`history`、`nextStep`、`prs`、`outputs`。旧线程的 `history` 用当前 `phase` 和 `updated` 起一条。
4. `project_report` 加可选参数 `next_step`、`prs`。没给 `next_step` 时取 `summary` 第一句。
5. 项目状态加 `revision`，`store.change` 之后加一。

## 默认值（没有人回答问题时按这个做）

- `summary` 第一句按中英文句号切，超过 120 字截断，长度登记超参。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 用一份没有新字段的 `projects.json` 打开，数据不丢。
- 同一 `phase` 重复设置不追加。

## 不要做

- 不提交（调度器提交）
- 不改上面清单之外的文件
- 不改现有接口的返回形状，只加字段
