depends: P-03-data
verify: node docs/handoff/panels/tools/count-tests.mjs tests/shell.test.mjs 14 && npm test && node scripts/mutation-check.mjs && npm run build && npm run e2e -- shell

# P-04-shell

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

做统一外壳和五种状态，所有类型都装在里面。

## 类别

写代码

## 只许改 / 新建的文件

- `shared/panel-state.js`
- `client/shell.js`
- `client/states.js`
- `client/theme.js`
- `client/app.js`
- `config/hyperparams.yaml`
- `scripts/build.mjs`
- `scripts/mutation-check.mjs`
- `tests/shell.test.mjs`
- `tests/e2e/shell.mjs`

## 步骤

1. 状态机写成纯函数 `shared/panel-state.js`：输入事件，输出 `loading` `empty` `error` `stale` `ready`。
2. 按 `design/PanelDefine.dc.html`、`design/PanelGallery.dc.html` 画外壳：头部、工具条、检查器、状态条。
3. `addResource` 监听 `panel.json` 和数据文件，变化时重读。校验失败保留上一版。
4. 尺寸用 `ResizeObserver`，按契约的宽度分三档，不重读数据。
5. `client/theme.js` 把 `design/themes/` 的变量映射到宿主明暗。
6. e2e 用测试专用的 `table` 假渲染器，改文件，断言状态切换。

## 默认值（没有人回答问题时按这个做）

- 检查器放右侧，卡片档收起。
- 问题列表点一下用 `openResource` 带 `params.line` 打开文件。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 配置写错时不白屏，能看到行号。
- 正文不可见时不重绘，e2e 里数 `requestAnimationFrame` 调用。
- 插件卸载后没有残留的监听。

## 不要做

- 不提交，提交由人做
- 不改上面清单之外的文件
- 不做具体类型
- 不做联网和批准
