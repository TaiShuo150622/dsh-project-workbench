depends: P-04-shell
verify: node docs/handoff/panels/tools/count-tests.mjs tests/graph.test.mjs 14 && npm test && node scripts/mutation-check.mjs && npm run build && npm run e2e -- graph

# P-07-graph

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

实现 `graph`，知识图谱、依赖图这类都能显示。

## 类别

写代码

## 只许改 / 新建的文件

- `shared/families/graph.js`
- `client/families/graph.js`
- `client/registry.js`
- `scripts/build.mjs`
- `scripts/mutation-check.mjs`
- `tests/graph.test.mjs`
- `tests/e2e/graph.mjs`

## 步骤

1. 自写力导向和分层两种布局，有环不崩。力导向分帧跑，每帧预算 8ms，结束后停绘。
2. 展开邻居、最短路径、按组筛选、布局切换、搜索。
3. 标签按缩放级别显示，密的时候只显示重要节点。
4. 命中测试用空间网格。

## 默认值（没有人回答问题时按这个做）

- 节点缺 `label` 用 `id`。
- 结构不变时不重算布局，只有状态变化时节点不跳。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 5000 节点时能拖能缩放。
- 同样的数据两次打开，分层布局完全一致。
- 布局结束后不再占 CPU，e2e 量。
- 节点有 `status` 时画同一组符号 ○ ◐ ▲ ● ✕ 和主题里对应的颜色，检查器显示 `progress`；只改状态不触发重新布局。

## 不要做

- 不提交，提交由人做
- 不改上面清单之外的文件
- 不引入 elk、d3、dagre
