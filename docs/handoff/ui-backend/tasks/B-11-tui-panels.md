depends: B-03-overview, B-09-live-feed
verify: node --test tests/tui-panel.test.mjs && npm test && node scripts/mutation-check.mjs && npm run build

# B-11-tui-panels

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

在 dsh-tui 配置下注册线程和实时两个侧栏面板，让 TUI 拿到同样的数据。

## 类别

写代码。真 TUI 里看效果由人做。

## 只许改 / 新建的文件

- `server/tui.js`（新建）
- `index.js`
- `scripts/build.mjs`、`scripts/mutation-check.mjs`
- `tests/tui-panel.test.mjs`（新建）
- `docs/handoff/ui-backend/CONTRACT.md`

## 步骤

1. 读 `~/.dsh/profiles/dsh-tui/node_modules/@deepseek-harness-tui/dsh-tui/lib/types/dsh-adapter/panels.d.ts`，只读。它是 React 组件接口，`apiVersion` 要精确匹配，每个插件最多 4 个面板，id 自动加插件前缀。
2. 用 `ctx.get('tuiPanels', false)` 取服务，没有时什么都不做，桌面和网页端不受影响。
3. 注册「线程」和「实时」两个面板，内容来自 B03、B09 的内部方法。把内容算成行的部分写成纯函数，组件只负责显示。
4. 实时内容到来时用 `badge` 提示，不抢焦点。`open` 每个插件 5 秒最多一次，超了会被丢弃，不要靠它做自动弹出。
5. 把查到的注册方式补进 `CONTRACT.md` 的 TUI 一节。

## 默认值（没有人回答问题时按这个做）

- `tuiPanels` 的接口拿不准时，停下写清楚缺什么，不要猜着实现。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 没有 `tuiPanels` 时插件能正常加载。
- 渲染函数在 80 列和 120 列下都不超宽，中文按双宽算。

## 不要做

- 不提交（调度器提交）
- 不改上面清单之外的文件
- 不改 `~/.dsh`，不改 dsh-tui 包本身
