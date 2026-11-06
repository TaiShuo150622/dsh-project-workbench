depends: none
verify: node docs/handoff/panels/tools/count-tests.mjs tests/skeleton.test.mjs 6 && npm test && node scripts/mutation-check.mjs && npm run build && npm run e2e -- smoke

# P-01-skeleton

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

搭出插件骨架和真宿主测试，`.panel.json` 能在隔离的 DSH 里被认领。

## 类别

写代码

## 只许改 / 新建的文件

- `package.json`
- `package-lock.json`
- `cordis.patch.yml`
- `index.js`
- `client/app.js`
- `config/hyperparams.yaml`
- `scripts/build.mjs`
- `scripts/mutation-check.mjs`
- `tests/skeleton.test.mjs`
- `tests/e2e/run.mjs`
- `tests/e2e/smoke.mjs`
- `README.md`
- `.gitignore`

## 步骤

1. 结构照 `${PROJECTS_ROOT}/dsh-project-workbench`：`index.js` + `client/app.js`，`scripts/build.mjs` 生成 `client.js` 和 `build.json`，`window.__ModuleLoader__.load`，宿主 React。
2. `package.json`：`npm test` 跑 `node --test tests/*.test.mjs`，`npm run e2e` 跑 `tests/e2e/run.mjs`，`dsh.bundle.patch` 指向 `cordis.patch.yml`，开发依赖只有 `ajv`。
3. `index.js` 注册 `health`。客户端照 `probe/plugin/client.js` 注册预览和 keyed slot，正文先显示文件名。服务用 `ctx.inject` 等。
4. `tests/e2e/run.mjs` 从 `probe/run.mjs` 改成通用框架：`run.mjs <场景名>` 建临时 `DSH_HOME`，先 `--from-default-profile web --dump-config` 再 `plugin add`，启动宿主，起无头 Chrome，跑 `tests/e2e/<场景>.mjs`，结束清理。夹具会话用测试专用插件建，不进发布包。
5. `config/hyperparams.yaml` 写全契约第 13 节。测试解析 `CONTRACT.md` 这一节，断言名字集合和默认值完全一致。

## 默认值（没有人回答问题时按这个做）

- DSH 路径用环境变量 `DSH_BIN`，缺省桌面版自带 CLI。Chrome 路径用 `CHROME_BIN`。
- 端口从进程号算，两次运行不撞。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 改任何一个源文件 `build.json` 的 id 都变，测试覆盖 `index.js`、`client/` 和 `shared/`。
- e2e 断言插件真的激活了：宿主输出里没有 `did not activate`。
- e2e 失败时退出码非 0，不留临时目录和子进程。

## 不要做

- 不提交，提交由人做
- 不改上面清单之外的文件
- 不做校验和渲染
- 不复制工作台的业务代码
