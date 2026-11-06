depends: P-04-shell
verify: node docs/handoff/panels/tools/count-tests.mjs tests/timeline.test.mjs 12 && npm test && node scripts/mutation-check.mjs && npm run build && npm run e2e -- timeline

# P-06-timeline

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

实现 `timeline`，甘特、轨迹这类都能显示。

## 类别

写代码

## 只许改 / 新建的文件

- `shared/families/timeline.js`
- `client/families/timeline.js`
- `client/canvas.js`
- `client/registry.js`
- `scripts/build.mjs`
- `scripts/mutation-check.mjs`
- `tests/timeline.test.mjs`
- `tests/e2e/timeline.mjs`

## 步骤

1. `model` 算分组、折叠、时间窗、行布局。
2. Canvas 2D 绘制，只在视图或数据变化时画。`client/canvas.js` 处理设备像素比和命中测试，后面两种类型复用。
3. 缩放、平移、折叠分组、悬停读数、选中。
4. 进行中的项 `end` 缺省，画到时间轴右端并标出。

## 默认值（没有人回答问题时按这个做）

- 同组重叠的项自动分行。
- 时间数字按原单位显示，ISO 按本地时间。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 5000 项时缩放不掉到 30 帧以下，e2e 量。
- 状态符号沿用组件库的 ◐ ● ◎ ▲ ✕ ○ ?。
- 静止时 Canvas 不重绘。

## 不要做

- 不提交，提交由人做
- 不改上面清单之外的文件
- 不接运行条，运行条的甘特图是工作台那边的事
