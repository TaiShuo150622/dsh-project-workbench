# DSH 项目工作台

面向 **DeepSeek Harness 桌面版** 的插件。在「项目」里创建项目和总对话，模型自动分派持久的 DSH 工作线程，线程结果回到总对话。右侧标签直接使用 DSH 原生会话，可以阅读、继续交谈、停止和验收。

## 使用

1. 打开桌面侧栏「项目」→「新建项目」，填写名称和本地项目目录；可关联多个仓库。
2. 在总对话提出任务。模型自行选择拆分、依赖和复用线程；简单问题直接回答。
3. 右侧「项目线程」查看总览或进入具体线程。研究线程只读；代码线程使用独立 Git 工作树。
4. 在线程里查看改动和验证证据。结果标为「待验收」，用户可标记验收通过。这个动作不合并代码。

「加入已有 DSH 会话」会让总对话获得继续给该会话派活的能力，保留其原历史、目录和权限。新建代码线程从源仓库的已提交 HEAD 起步，源目录未提交内容不自动复制；面板会显示这一点。

当前范围是同一个 DSH 桌面实例中的会话。Claude/Codex 等外部会话尚未接入。

## 开发与发布

```sh
npm ci
npm test
npm run build
```

使用 DSH 官方插件 CLI 的 `plugin --profile desktop add <本插件目录>` 安装本地包。为避免 Node ESM 热加载复用旧模块，生产版本通过 `node scripts/release.mjs --releases <版本目录> --patch <desktop/cordis.patch.yml>` 生成带内容哈希的独立目录和 Loader ID。脚本备份配置，只调整本插件的条目。桌面使用共享 renderer，包元数据中的 `client.platform: web` 是宿主的客户端协议名称。

运行状态保存在 `$DSH_HOME/project-workbench/projects.json`（未设置时为 `~/.dsh/project-workbench`）；工作树在同目录的 `worktrees/` 下。宿主断开后保留会话与工作树，运行中的任务显示「待恢复」，不擅自重跑。

所有可调上限、节拍和顺序在 `config/hyperparams.yaml` 登记。插件没有运行时 npm 依赖。测试使用 Node 内置 runner 和真实 Git。

## 权限与来源

只有总对话能分派本项目的工作线程；线程只能汇报自己的结果。跨项目 ID 会被服务端拒绝。工作线程消息使用 DSH `agent-message` 来源，不能冒充用户授权。研究线程使用宿主只读预设，代码线程使用宿主 workspace-write 预设，并核对写入根目录确为工作树；保留宿主审批机制。

暂停会阻止新任务启动；正在执行的任务继续。停止只针对指定线程。恢复复用原会话和工作树。消息带持久 ID，重试不会重复写入同一收件箱。

桌面验收场景与结果见 [docs/acceptance.md](docs/acceptance.md)。
