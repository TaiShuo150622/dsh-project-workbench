depends: B-01-phase-history
verify: node --test tests/layout.test.mjs && npm test && node scripts/mutation-check.mjs && npm run build

# B-10-layout-state

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

实现 `layout-get`、`layout-set`，记住分屏和右栏常驻的会话。

## 类别

写代码

## 只许改 / 新建的文件

- `server/layout.js`（新建）
- `index.js`
- `config/hyperparams.yaml`
- `scripts/build.mjs`、`scripts/mutation-check.mjs`
- `tests/layout.test.mjs`（新建）

## 步骤

1. 项目加 `layout` 字段，形状照契约。
2. 校验：`panes` 不超过上限，ID 属于项目，`panes` 和 `docked` 不重复。
3. `revision` 不匹配时返回 `{conflict:true, layout}`。
4. 线程被删除或不存在时，读取时过滤掉。

## 默认值（没有人回答问题时按这个做）

- `panes` 上限 3，登记超参。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 两个客户端同时写，后到的拿到冲突，不会悄悄覆盖。

## 不要做

- 不提交（调度器提交）
- 不改上面清单之外的文件
- 不存窗口像素，只存逻辑布局
