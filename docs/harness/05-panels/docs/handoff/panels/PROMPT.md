# 给 Codex 的开工提示词

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


`tools/run-card.sh` 会把下面这段和当前任务卡一起发给 Codex。手动开工时整段贴进去，再贴卡的路径。

---

你在 `dsh-panels` 的工作树里开发，分支 `codex/panels`。这是一个 DSH 插件，让用户和模型用 `panel.json` 定义面板。

先读 `docs/handoff/panels/README.md`、`COLLABORATION.md`、`CONTRACT.md`、`PROBE.md` 和这张任务卡。核对阶段A冻结单的完整提交、实际HEAD及已有差异；阶段A未完成或当卡边界未定时，交回缺口，不自行采用漂移的main或聊天里的未决提案。

每次只做一张卡。卡做不完就停下说明，别顺手做下一张。

硬规则：

- 只改卡上列出的文件。要改别的，停下来写明原因。
- 不提交、不推送、不合并、不改 git 配置。提交由人做。
- 不碰 `~/.dsh`、`~/.dsh-tui`、桌面版安装目录。测试用临时目录和隔离的 `DSH_HOME`。
- 不读凭据文件。`${PROJECTS_ROOT}/deepseek-harness`、`${PROJECTS_ROOT}/dsh-project-workbench`、`${PROJECTS_ROOT}/dag-studio` 只读，不改。
- 不装运行时依赖。开发依赖只许 `ajv`。图、地图、三维库一个都不进插件，只能出现在 `samples/` 的渲染器里。
- 不新起文档站式的长文。结论写进卡要求的位置。
- `client.js`、`build.json` 是 `npm run build` 的产物，会跟着变，不算改了清单外的文件。

做事的规矩：

- 从事件、配置或数据算结果的部分写成纯函数，放 `shared/`，便于测试，桌面和终端共用。
- `index.js` 只做注册，业务放 `server/`。`client/app.js` 只做接线，界面放 `client/` 的分文件。
- 新数字进 `config/hyperparams.yaml`，写清 value / why / adjust。名字以 `CONTRACT.md` 第 13 节为准。
- 新源文件要加进 `scripts/build.mjs`，否则哈希认不出改动。
- 每张卡至少一条负向用例，并在 `scripts/mutation-check.mjs` 里加至少两个变异，确认破坏后测试会红。新测试文件要加进它的运行列表。
- 接口形状以冻结的 `CONTRACT.md` 为准。发现契约缺口先交回行为、影响卡和建议；按 `COLLABORATION.md` 同步契约、卡和验收后，明确采用提交再实现，不在卡内自行扩张公共接口。
- DSH 的行为不确定时，去 `${PROJECTS_ROOT}/deepseek-harness` 查源码，引用文件和行号，不要猜。本机桌面版是 0.2.1-rc.3，源码是 0.2.1-rc.2，差异以 `probe/run.mjs` 实测为准。
- 重复的工作只做一次：内存和 CPU 跟功能一起算。没有变化时不重绘，不开常驻定时器。
- 颜色只用 `design/themes/` 的变量，界面对照 `design/` 的画板。

收尾时按这个格式写，不要写别的：

```
卡：<编号>
基线：<冻结完整SHA；开始HEAD；结束HEAD及未提交差异>
改了：<文件列表和行为变化>
验证：<实际命令、环境、退出码、结果>
证据：<日志／截图／资源原始结果路径；未提交文件需交接>
变异：<新增几个，几个被杀；未运行如实写>
偏差：<契约／任务卡差异、原因、待裁定事项；无则写无>
没量到：<真实桌面、TUI、性能或其他尚缺证据的部分>
```

你说做完不算数，调度脚本会自己再跑一遍 verify。
