depends: P-05-table, P-06-timeline, P-07-graph, P-08-space
verify: node docs/handoff/panels/tools/count-tests.mjs tests/tui.test.mjs 24 && npm test && node scripts/mutation-check.mjs && npm run build

# P-12-tui

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

终端里能看同样的面板，退到字符。

## 类别

写代码

## 只许改 / 新建的文件

- `server/tui.js`
- `shared/lines.js`
- `shared/families/table.js`
- `shared/families/timeline.js`
- `shared/families/graph.js`
- `shared/families/space.js`
- `index.js`
- `config/hyperparams.yaml`
- `scripts/build.mjs`
- `scripts/mutation-check.mjs`
- `tests/tui.test.mjs`
- `docs/handoff/panels/CONTRACT.md`

## 步骤

1. 读 `~/.dsh/profiles/dsh-tui/node_modules/@deepseek-harness-tui/dsh-tui/lib/types/dsh-adapter/panels.d.ts`，只读。
2. 按契约第 10 节注册一个入口。
3. 每种类型写 `lines`：表格定宽、时序字符条、关系邻接树、空间字符画。效果对照 `design/PanelGalleryTui.dc.html`。
4. `graph` 再加框图画法，条件、分层、分叉汇合、「另 N 个」、粗框都按契约第 10 节。效果对照 `design/RunGraphTui.dc.html` 中间那一列；那块画板的流动点、左栏检查点、右栏详情、事件日志是工作台的事，这张卡不做。先写「能不能画框图」的判定纯函数，再写排版，判定和排版分开测。
5. `↑↓` 选，`Enter` 看详情，`Tab` 切面板。按键走 `host.onKey`。框图里 `←→` 在同一层换框，`↑↓` 换层。
6. 选中写同一份服务端状态。

## 默认值（没有人回答问题时按这个做）

- `tuiPanels` 的接口拿不准时，停下写清楚缺什么，不要猜着实现。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 没有 `tuiPanels` 时插件正常加载。
- 40、80、120 列都不超宽，中文按双宽算。
- `custom` 不运行渲染器，退到 `tui.image` 或 `tui.summary`。
- 静止时不用动画时钟。
- 框图：一分多、多汇一的样例画成框图；有环、跨层边、多对多、超过 `tuiGraphBoxMaxNodes` 个节点、窄于 `tuiGraphBoxMinCols` 列，五种各一条用例，都退成邻接树且第一行写对原因。
- 框图里含中文标题时，每个框的右框线在所有行落在同一显示列（按双宽算，逐行核对列号，不只看总宽）。
- 一层放不下时，留下的框按 `err` `run` `wait` `done` `idle` 排，「另 N 个」的 N 对得上。
- 选中节点是粗框，换选中后旧的恢复细框；`spans` 不越出行宽。
- 变异至少加两个打在框图上：判定放宽（让跨层边也画框图）、右框线错一列，都要被测试杀掉。

## 不要做

- 不提交，提交由人做
- 不改上面清单之外的文件
- 不改 `~/.dsh`，不改 dsh-tui 包
- 不注册多个面板
