depends: P-04-shell
verify: node docs/handoff/panels/tools/count-tests.mjs tests/table.test.mjs 12 && npm test && node scripts/mutation-check.mjs && npm run build && npm run e2e -- table

# P-05-table

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

实现 `table`，100 万行能滚能排序。

## 类别

写代码

## 只许改 / 新建的文件

- `shared/families/table.js`
- `client/families/table.js`
- `client/registry.js`
- `config/hyperparams.yaml`
- `scripts/build.mjs`
- `scripts/mutation-check.mjs`
- `tests/table.test.mjs`
- `tests/e2e/table.mjs`

## 步骤

1. `model(spec, view)` 是纯函数：排序、筛选、可见行范围。数字列用 TypedArray。
2. 虚拟滚动，挂载的 DOM 行只和视口有关。
3. 排序、筛选、冻结列、选行。选中进检查器。
4. e2e 生成 100 万行 CSV。

## 默认值（没有人回答问题时按这个做）

- 列类型不写时看前 1000 行推断。
- `id` 缺省用行号。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 100 万行时 DOM 行数不超 200。
- 排序后选中的还是同一行。
- 排序中文列用 `Intl.Collator`。
- 超过 `tableMaxRows` 时状态条说明，不崩。

## 不要做

- 不提交，提交由人做
- 不改上面清单之外的文件
- 不做编辑，面板只读
- 不引入表格库
