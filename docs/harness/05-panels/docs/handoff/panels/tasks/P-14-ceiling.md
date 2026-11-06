depends: P-10-trust, P-13-types
verify: node docs/handoff/panels/tools/count-tests.mjs tests/ceiling.test.mjs 8 && npm test && node scripts/mutation-check.mjs && npm run build && npm run e2e -- ceiling

# P-14-ceiling

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

把四个上限样例做成真渲染器，在真宿主里量一次上限。

## 类别

写代码

## 只许改 / 新建的文件

- `samples/**`
- `scripts/ceiling.mjs`
- `tests/ceiling.test.mjs`
- `tests/e2e/ceiling.mjs`
- `docs/CEILING.md`
- `scripts/mutation-check.mjs`

## 步骤

1. `samples/` 放四种内置类型和 `compose` 的小样例。
2. 把 `design/LimitSky`、`LimitBim`、`LimitGraph`、`LimitMap` 的算法改写成 `samples/renderers/*/renderer.html`，走 `dsh-panel.js`，不依赖设计画布。
3. `scripts/ceiling.mjs` 在隔离实例里按固定规模跑，同时量空页面，输出 JSON。帧率判据用两者的比值，不用绝对值，机器忙时绝对值会掉一半。
4. 内存用固定序列：空闲、开一个面板、关掉、重复 10 次，看是否回到平台。
5. 结果写进 `docs/CEILING.md`，写清环境。

## 默认值（没有人回答问题时按这个做）

- 规模用设计稿的档位，上限档跑一次即可。
- 这张卡里 three.js 这类库也不用，样例本来就是裸 WebGL2。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 100 万点时，DSH 帧率和空页面之比不低于 0.85。
- 反复开关 10 次，内存不持续上涨。
- 样例全部用合成数据，文件里写明。

## 不要做

- 不提交，提交由人做
- 不改上面清单之外的文件
- 不在结果里写没测过的机器
