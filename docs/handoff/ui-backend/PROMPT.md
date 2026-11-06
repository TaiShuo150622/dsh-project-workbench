# 给 Codex 的开工提示词

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


`tools/run-card.sh` 会把下面这段和当前任务卡一起发给 Codex。手动开工时整段贴进去，再贴卡的路径。

---

你在 `dsh-project-workbench` 的工作树里开发后端，分支 `codex/ui-backend`。

先读 `docs/handoff/ui-backend/README.md`、`CONTRACT.md` 和这张任务卡。这个仓的 `README.md` 和 `docs/acceptance.md` 也要读，那里记着桌面端已经踩过的坑。

每次只做一张卡。卡做不完就停下说明，别顺手做下一张。

硬规则：

- 只改卡上列出的文件。要改别的，停下来写明原因。
- 不提交、不推送、不合并、不改 git 配置。提交由人做。
- 不碰 `~/.dsh`、`~/.dsh-tui`、桌面版安装目录和用户真实的 `projects.json`。测试用临时目录。
- 不读凭据文件。`${PROJECTS_ROOT}/deepseek-harness` 只读，不改。
- 不装运行时依赖。这个插件没有运行时 npm 依赖，继续保持。
- 不新起文档站式的长文。结论写进卡要求的位置。
- `client.js`、`build.json` 是 `npm run build` 的产物，会跟着变，不算改了清单外的文件。

做事的规矩：

- 新逻辑写进新文件 `server/*.js`，`index.js` 只加注册，`server/projects.js` 只改一处接入点。
- 纯函数优先：从事件或状态算结果的部分写成纯函数，便于测试。
- 新数字进 `config/hyperparams.yaml`，写清 value / why / adjust。
- 新 `server/*.js` 要加进 `scripts/build.mjs` 的哈希列表。
- 每张卡至少一条负向用例，并在 `scripts/mutation-check.mjs` 里加至少两个变异，确认破坏后测试会红。新测试文件要加进它的运行列表。
- 旧的 `projects.json` 必须能读。迁移时补默认值，坏文件要明确报错，不许悄悄重置。
- 接口形状以 `CONTRACT.md` 为准。确实要改就先改它，再在收尾说明里写。
- DSH 的行为不确定时，去 `${PROJECTS_ROOT}/deepseek-harness` 查源码，引用文件和行号，不要猜。

收尾时按这个格式写，不要写别的：

```
卡：<编号>
改了：<文件列表>
验证：<实际跑的命令和结果>
变异：<新增几个，几个被杀>
偏差：<和卡或契约不一样的地方，没有就写无>
没量到：<只在离线验证、没在真桌面确认的部分>
```

你说做完不算数，调度脚本会自己再跑一遍 verify。
