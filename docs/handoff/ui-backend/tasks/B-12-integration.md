depends: B-03-overview, B-04-library, B-05-project-goal, B-06-session-map, B-07-thread-card, B-08-timeline, B-09-live-feed, B-10-layout-state, B-11-tui-panels
verify: node --test tests/contract.test.mjs && npm test && node scripts/mutation-check.mjs && npm run build

# B-12-integration

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

用一条测试把全部接口串起来，并写好给人走的真桌面验收单。

## 类别

写代码。真桌面验收由人做。

## 只许改 / 新建的文件

- `tests/contract.test.mjs`（新建）
- `docs/acceptance.md`
- `docs/handoff/ui-backend/BOARD.md`
- `README.md`
- `package.json`

## 步骤

1. `tests/contract.test.mjs` 用假宿主起插件，走一遍：建项目、派两条线程、汇报、读 `overview`、`map`、`library`、`timeline`、`live-list`、`layout-set`。每个返回都按 `CONTRACT.md` 校验形状，用现有的 `ajv` 开发依赖。
2. `docs/acceptance.md` 加一节验收场景，写清输入原句和判据，结果栏留空给人填。
3. 更新 `BOARD.md` 的进度，`README.md` 补新接口。
4. 版本号升到 0.2.0。

## 默认值（没有人回答问题时按这个做）

- 验收单沿用现有表格格式。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 契约里每个接口都被测试调用过。

## 不要做

- 不提交（调度器提交）
- 不改上面清单之外的文件
- 不声称真桌面已验，结果栏留给人
