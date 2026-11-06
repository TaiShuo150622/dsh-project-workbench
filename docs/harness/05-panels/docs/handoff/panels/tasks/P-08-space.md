depends: P-04-shell
verify: node docs/handoff/panels/tools/count-tests.mjs tests/space.test.mjs 14 && npm test && node scripts/mutation-check.mjs && npm run build && npm run e2e -- space

# P-08-space

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

实现 `space`，地图、平面图、网格这类二维内容都能显示。

## 类别

写代码

## 只许改 / 新建的文件

- `shared/families/space.js`
- `client/families/space.js`
- `client/registry.js`
- `scripts/build.mjs`
- `scripts/mutation-check.mjs`
- `tests/space.test.mjs`
- `tests/e2e/space.mjs`

## 步骤

1. 三种坐标：`lonlat` 用等距圆柱并按纬度修正，`plane` 平面单位，`grid` 整数格。
2. 图层：点、线、面、图片，能开关。
3. 平移、缩放、框选、测距。测距 `lonlat` 用球面距离。
4. `format: geojson` 转成图层。图片图层走数据读取。

## 默认值（没有人回答问题时按这个做）

- 没有底图瓦片，没有联网。
- 面用奇偶规则。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 图层关掉后不再参与命中测试。
- 上海两点的测距和已知球面距离差不超 0.5%。
- 图片地址不能逃出工作区。

## 不要做

- 不提交，提交由人做
- 不改上面清单之外的文件
- 不做三维
- 不接在线地图，那是第二级的事
