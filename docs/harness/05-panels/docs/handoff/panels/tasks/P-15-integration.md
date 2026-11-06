depends: P-11-model, P-12-tui, P-14-ceiling
verify: node docs/handoff/panels/tools/count-tests.mjs tests/integration.test.mjs 10 && npm test && node scripts/mutation-check.mjs && npm run build && npm run e2e -- all

# P-15-integration

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

全部接口走一遍，能装进真桌面，留下验收单。

## 类别

写代码。真桌面、真终端走查由人做。

## 只许改 / 新建的文件

- `tests/integration.test.mjs`
- `tests/e2e/all.mjs`
- `scripts/release.mjs`
- `scripts/mutation-check.mjs`
- `docs/acceptance.md`
- `README.md`
- `package.json`
- `package-lock.json`
- `index.js`
- `config/hyperparams.yaml`

## 步骤

1. 逐个调用全部接口，走成功、失败、边界。
2. `scripts/release.mjs` 照工作台，生成带内容哈希的发布目录，只调整本插件的条目，先备份配置。
3. `docs/acceptance.md` 写人要走的步骤：桌面三个里程碑、终端一遍，每步写预期和证据。
4. 在干净的工作树里跑一遍全部 verify。
5. 升到 `1.0.0-rc.1`，`health` 的版本从 `package.json` 读。

## 默认值（没有人回答问题时按这个做）

- 发布脚本默认只生成不安装，安装由人做。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 干净工作树里全过。
- `npm pack` 的内容只有运行需要的文件，没有 `probe/`、`docs/`、`tests/`。
- 变异全部被杀。

## 不要做

- 不提交，提交由人做
- 不改上面清单之外的文件
- 不安装到真桌面
- 不提交
