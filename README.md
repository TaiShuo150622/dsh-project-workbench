# DSH 项目工作台

面向 **DeepSeek Harness 桌面版** 的插件。在「项目」里创建项目和总对话，模型自动分派持久的 DSH 工作线程，线程结果回到总对话。右侧标签直接使用 DSH 原生会话，可以阅读、继续交谈、停止和验收。

## Harness 讨论稿与后续设计

- **[DAG 统一图形表达方案](docs/harness/13-dag-visual-understanding/README.md)**：将讨论稿中的架构、流程、反馈、部署、时序与状态等图纳入统一视图方向，附 15 类场景映射；当前为讨论稿。
- **[交付管理与项目 DAG](docs/harness/12-delivery-dag/README.md)**：验收条件、模块输入输出约定、原线程、成果和人工验收；图上查看缺口、变更复核及双向导航。
- **[多模块目标、接续与远程恢复最小实现](docs/harness/11-project-management/README.md)**：三条独立分支、研究依据、最小范围及组合验证。

个人围绕项目工作台、远程执行与长期任务的讨论资料已汇集到本仓库：

- **[本轮统一 Harness 工程研究 · v0.1.9](docs/harness/10-unified-engineering/README.md)**：先看成果导读，再读 Coding 例子、统一总稿、证据与实施路线；包含 Record、DAG、远程与长期任务的连接，以及官方产品、开源和公开作者观点的对照。
- **[阅读指南与推荐顺序](docs/harness/README.md)**：从总体目标开始，依次了解工作台、通用面板、运行底座、上下文、DAG、远程与浏览器。
- **[完整文件索引](docs/harness/INDEX.md)**：按主题查看所有收录稿件、明确历史版本及设计附件。
- **[工作台后端计划](docs/handoff/ui-backend/BACKEND-PLAN-DRAFT.md)**：衔接当前插件代码与后续 B01–B12 设计；计划先完成通用面板平台。

文集包含公开整理版、历史记录和待实现方案。当前插件能力以下文使用说明为准；讨论稿、任务卡和设计画板的存在不代表相应功能已经实现或完成验收。

2026-11-08 新增研究保留两项条件性一般证明、有限模型与反例、固定代码映射及未运行的实施/评价方案。它是文档与研究归档，不改变当前插件行为；研究使用的 Record 草稿代码与本分支的产品实现分别标记。公开范围与逐文件清单见[本轮归档说明](docs/harness/10-unified-engineering/README.md)。

## 使用

1. 打开桌面侧栏「项目」→「新建项目」，填写名称和本地项目目录；可关联多个仓库。
2. 在总对话提出任务。模型自行选择拆分、依赖和复用线程；简单问题直接回答。新建的空会话沿用桌面起始页，发送首条消息后会出现项目入口与线程区。
3. 右侧「项目线程」查看总览或进入具体线程。研究线程只读；代码线程使用独立 Git 工作树。
4. 在线程里查看改动和验证证据。代码默认保留未提交差异，结果标为「待验收」，用户可标记验收通过。这个动作不提交或合并代码。
5. 在项目管理面板启用「交付管理与 DAG」，将验收条件关联到模块约定、原线程及成果，按成果版本记录人工验收。约定变化后先复核相关成果，再重新验收；具体操作见 [交付管理说明](docs/harness/12-delivery-dag/README.md)。

「加入已有 DSH 会话」会让总对话获得继续给该会话派活的能力，保留其原历史、目录和权限。新建代码线程从源仓库的已提交 HEAD 起步，源目录未提交内容不自动复制；面板会显示这一点。

当前范围是同一个 DSH 桌面实例中的会话。Claude/Codex 等外部会话尚未接入。

## 开发与发布

```sh
npm ci
npm test
npm run build
node scripts/mutation-check.mjs
```

使用 DSH 官方插件 CLI 的 `plugin --profile desktop add <本插件目录>` 安装本地包。为避免 Node ESM 热加载复用旧模块，生产版本通过 `node scripts/release.mjs --releases <版本目录> --patch <desktop/cordis.patch.yml>` 生成带内容哈希的独立目录和 Loader ID。脚本备份配置，只调整本插件的条目。桌面使用共享 renderer，包元数据中的 `client.platform: web` 是宿主的客户端协议名称。

运行状态保存在 `$DSH_HOME/project-workbench/projects.json`（未设置时为 `~/.dsh/project-workbench`）；工作树在同目录的 `worktrees/` 下。宿主断开后保留会话与工作树，运行中的任务显示「待恢复」，不擅自重跑。

所有可调上限、节拍和顺序在 `config/hyperparams.yaml` 登记。插件没有运行时 npm 依赖。测试使用 Node 内置 runner 和真实 Git。

## 权限与来源

只有总对话能分派本项目的工作线程；线程只能汇报自己的结果。跨项目 ID 会被服务端拒绝。项目成员通过原生工具另外启动 Claude/Codex 子代理或另一套 Team 分派会被拦住；项目外的普通 DSH 会话不受此限制。工作线程消息使用 DSH `agent-message` 来源，不能冒充用户授权。研究线程使用宿主只读预设，代码线程使用宿主 workspace-write 预设，并核对写入根目录确为工作树；保留宿主审批机制。

暂停会阻止新任务启动；正在执行的任务继续。停止只针对指定线程。恢复复用原会话和工作树。消息带持久 ID，重试不会重复写入同一收件箱。

桌面验收场景与结果见 [docs/acceptance.md](docs/acceptance.md)。
