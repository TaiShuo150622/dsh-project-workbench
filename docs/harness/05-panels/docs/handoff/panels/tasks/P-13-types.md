depends: P-05-table, P-06-timeline, P-07-graph, P-08-space, P-09-sandbox
verify: node docs/handoff/panels/tools/count-tests.mjs tests/types.test.mjs 12 && npm test && node scripts/mutation-check.mjs && npm run build && npm run e2e -- types

# P-13-types

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

第三方能注册新类型，一个面板能组合两族。

## 类别

写代码

## 只许改 / 新建的文件

- `server/registry.js`
- `client/registry.js`
- `client/compose.js`
- `shared/spec.js`
- `schema/panel.schema.json`
- `index.js`
- `client/app.js`
- `scripts/build.mjs`
- `scripts/mutation-check.mjs`
- `tests/types.test.mjs`
- `tests/e2e/types.mjs`
- `tests/fixtures/type-plugin/**`
- `tests/fixtures/specs/**`

## 步骤

1. 按契约第 11 节实现 `panels` 服务，两侧各一份。`schema` 用契约写的子集校验。
2. `tests/fixtures/type-plugin/` 是一个真的第三方插件，注册 `wafer-map`，e2e 把它装进隔离实例。
3. `compose` 按契约第 2 节实现，`links` 走选中和点亮。子面板共用外壳，状态互不影响。

## 默认值（没有人回答问题时按这个做）

- 子面板出错只影响自己。
- `compose` 里能放 `custom`，批准规则照旧。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 卸载第三方插件后，面板回到 `error` 并说明缺的类型。
- 内置类型不能被覆盖。
- 地图加时间轴的组合样例能联动。

## 不要做

- 不提交，提交由人做
- 不改上面清单之外的文件
- 不做插件市场
