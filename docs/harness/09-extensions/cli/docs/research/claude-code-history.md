# Claude Code 发展史：从 research preview 到现在

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


> 调研截止：**2026-10-17**（本机时间）。
> 数据口径：官方 changelog 的 **422 条版本说明** + npm registry 的 **546 个版本记录**（截至抓取时 latest `2.1.302`）。
> 原始材料：完整官方 changelog（原文引用，未随公开文档附带） · 546 个版本索引（原文引用，未随公开文档附带） · 机器可读 JSON（原文引用，未随公开文档附带）
> 复现脚本：scripts/fetch-claude-code-history.mjs（原文引用，未随公开文档附带）

## 0. 一页纸

| 时间 | 阶段 | 关键变化 |
|---|---|---|
| **2025-02-24** | Research preview | Anthropic 随 Claude 3.7 Sonnet 发布命令行的 Claude Code，**limited research preview**：在终端里读代码库、改文件、跑命令/测试 |
| **2025-05-22** | **1.0 / GA** | 随 Claude 4（Opus 4 / Sonnet 4）**正式可用**；新增 VS Code / JetBrains 集成、GitHub Actions 后台任务 |
| **2025-09-29** | **2.0** | 原生 VS Code 扩展（beta）、终端界面 2.0、**checkpoints**、搜索历史；Claude Code SDK 更名 **Claude Agent SDK**；底座是 Sonnet 4.5 |
| **2026-01-07** | **2.1 系列开始** | Skills 热重载 / fork 上下文、hooks 进入 skill/agent frontmatter、通配符 Bash 权限、Ctrl+B 统一后台、`/teleport`、Vim 动作扩充 |
| **2026-10-16** | 当前 latest | `2.1.302`；2.1.x 已走过 **260 个 npm 版本**，加入 auto mode、worktree、Chrome、桌面 App、cloud sessions、`/goal` 等 |

一句话：**从「终端里的一个受限 coding agent」→「IDE/CI/桌面/云端多入口的 agent 平台」**；版本节奏从 0.2 时代每天多版，变成 2.x 时代几乎每天都有 patch。

## 1. 起点：research preview（2025-02-24）

Anthropic 在发布 Claude 3.7 Sonnet 的同一天推出 Claude Code（[官方公告](https://www.anthropic.com/news/claude-3-7-sonnet)）：

- 定位是**终端里的 agentic coding 工具**：直接读整个项目、按自然语言改多文件、执行命令/测试；
- 当时是 **limited research preview**，不是 GA；
- npm 上第一个版本是 **`0.2.6`（2025-02-24 18:03 UTC）**，GitHub 仓库 `anthropics/claude-code` 创建于 **2025-02-22**；
- 早期 changelog 只从 `0.2.21`（backfill 日期写 April 2, 2025）开始，所以 research preview 的第一批内部迭代没有逐条公开说明。

这个阶段解决的是「agent 能在终端里跑起来」：权限确认、读文件/搜代码、编辑、bash、`/` 命令、`CLAUDE.md` 等基础形态。

## 2. 1.0：正式 GA（2025-05-22）

Anthropic 随 Claude 4 宣布 **Claude Code is now generally available**（[Claude 4 公告](https://www.anthropic.com/news/claude-4)）：

- 底座换成 **Claude Opus 4 / Sonnet 4**；
- 从 research preview 扩到更完整的开发者工作流：
  - **VS Code / JetBrains 原生集成**（在 IDE 里看 Claude 的改动）；
  - **GitHub Actions 后台任务**；
  - 终端交互、权限和稳定性继续打磨；
- npm `1.0.0` 发布于 **2025-05-22 16:57 UTC**，与公告同日。

1.0.x 阶段（到 2025-09-28）共 **121 个 npm 版本**，是整个产品从「能用」走向「日常主力」的阶段：大量条目集中在终端体验、IDE 集成、权限/设置、MCP/工具、错误处理和平台兼容性。逐条见 版本索引（原文引用，未随公开文档附带）。

## 3. 2.0：终端界面重做 + checkpoints（2025-09-29）

官方公告《[Enabling Claude Code to work more autonomously](https://www.anthropic.com/news/enabling-claude-code-to-work-more-autonomously)》给出 2.0 的三件事：

1. **原生 VS Code 扩展**（beta）：侧栏实时看 diff；
2. **终端界面 2.0**：状态更清楚、`Ctrl+R` 搜索历史提示；
3. **checkpoints**：长任务可回退到之前的状态，降低「放手让它跑」的风险；
4. 同时 **Claude Code SDK 更名为 Claude Agent SDK**，并补上 subagents / hooks 的 SDK 支持；底座是 **Sonnet 4.5**。

changelog `2.0.0` 的具体条目包括：新 VS Code 扩展、`--agents` 动态子代理、`/rewind` 回退、`/usage` 查看额度、Tab 切 thinking、Ctrl-R 历史、界面换新、`claude config` 下线等。

2.0.x 阶段（到 2026-01-06）共 **70 个 npm 版本**。从 changelog 首次出现的位置可以看到几个后续大件：

| 能力 | changelog 首次出现 |
|---|---|
| Plugins / MCP 管理、`/model`、`/resume` | `2.0.12`（2025-10-09） |
| Sandbox | `2.0.30`（2025-10-30） |
| Claude in Chrome | `2.0.72`（2025-12-17） |
| Skills | `2.0.74`（2025-12-19） |

> 注意：这是「**changelog 文字里首次出现**」的版本，不等于该能力的首次发布；有些能力先在文档/公告出现，或前一个版本已经以别的词出现。官方公告日期优先。

## 4. 2.1：Skills / hooks / auto mode / 多入口（2026-01-07 起）

`2.1.0`（2026-01-07）的 changelog 条目很密，代表 2.1 的主题：

- **Skills**：`~/.claude/skills` / `.claude/skills` 自动热重载；skill 可用 `context: fork` 在子代理里跑；skill 可指定 `agent`；
- **hooks** 进入 agent / skill / slash command 的 frontmatter；
- **权限**：Bash 通配符（`Bash(npm *)` 等）、`Task(AgentName)` 禁用特定 agent；
- **后台**：Ctrl+B 统一把 bash 和 agent 放后台；
- **远程/规划**：`/teleport`、`/remote-env`、`/plan`，以及 `/` 在输入任意位置都能补全；
- **编辑器**：Vim motions 扩充；
- 其他：MCP `list_changed`、`CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS`、`IS_DEMO` 等。

2.1.x 持续到 **260 个 npm 版本**，后期又出现（按 changelog 首次出现）：

| 能力 | changelog 首次出现 |
|---|---|
| Auto mode | `2.1.7`（2026-01-14） |
| Worktree | `2.1.19`（2026-01-23） |
| `/agents` | `2.1.47`（2026-02-18） |
| Voice | `2.1.69`（2026-03-05） |
| Desktop App | `2.1.69`（2026-03-05） |
| `/loop` | `2.1.71`（2026-03-07） |
| `/goal` | `2.1.139`（2026-05-11） |
| Cloud sessions | `2.1.176`（2026-06-12） |

当前 latest：**`2.1.302`（2026-10-16）**；npm dist-tags 同时有 `stable: 2.1.292`、`latest/next: 2.1.302`。这说明发布通道有 stable/latest/next 的分层，**不要假设 latest = 所有人默认拿到的版本**。

## 5. 版本节奏

| 系列 | npm 版本数 | 起 | 止 |
|---|---:|---|---|
| `0.2.x` | 95 | 2025-02-24 | 2025-05-22（0.2.126） |
| `1.0.x` | 121 | 2025-05-22（1.0.0） | 2025-09-27（1.0.128） |
| `2.0.x` | 70 | 2025-09-29（2.0.0） | 2026-01-06（2.0.77） |
| `2.1.x` | 260 | 2026-01-07（2.1.0） | 2026-10-16（2.1.302） |
| **合计** | **546** | | |

月度发布数（npm 时间）：2025-02 10 → 03 28 → 04 30 → 05 35 → 06 29 → 07 27 → 08 31 → 09 29 → 10 25 → 11 20 → 12 21 → 2026-01 29 → 02 29 → 03 24 → 04 29 → 05 27 → 06 30 → 07 23 → 08 29 → 09 27 → 10（截至 16 日）14。

**注意**：npm 的 546 个版本含预发布/旧 tag；官方 changelog 只有 422 条，缺口主要是早期 `0.2.6–0.2.20` 等没有 changelog 的版本。

## 6. 「每一次更新加了什么」在哪

- **claude-code-releases.md（原文引用，未随公开文档附带）**：546 个 npm 版本 × 发布日期 × changelog 日期 × **首条变更摘要**（自动生成，适合扫读/检索）。
- **claude-code-changelog-raw.md（原文引用，未随公开文档附带）**：官方 changelog 原文（422 条，含每一条 Added/Changed/Fixed/Improved）。
- **claude-code-versions.json（原文引用，未随公开文档附带）**：同一份数据的机器可读版，包含每条 changelog 的完整条目数组。
- 本文件只做「阶段/主线」叙述；**逐条细节以 raw changelog 为准**。

## 7. 公开方法：怎么自己跟、自己查

这些数据源都是公开的，不需要 Anthropic 内部权限：

| 想要 | 公开入口 | 备注 |
|---|---|---|
| 官方 changelog（人读） | <https://code.claude.com/docs/en/changelog> | 页面由 GitHub `CHANGELOG.md` 生成 |
| changelog 的 Markdown | <https://code.claude.com/docs/en/changelog.md> | 最稳定的抓取入口；本次调研用它 |
| GitHub 仓库 | <https://github.com/anthropics/claude-code> | 有 `CHANGELOG.md`、examples、plugins、issues；**不等于完整核心源码公开** |
| 原始 CHANGELOG | `https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md` | 可能较大/较慢；本次用官方 md 入口更稳 |
| GitHub Releases / Tags | `https://api.github.com/repos/anthropics/claude-code/releases?per_page=100`、`/tags` | 有 `v2.1.302` 这类 tag 和发布时间；未认证 60 次/小时 |
| 版本与发布时间 | `https://registry.npmjs.org/@anthropic-ai/claude-code` 或 `npm view @anthropic-ai/claude-code version time dist-tags --json` | npm 的 `time` 是最全的逐版本时间线（546 条） |
| 本机版本 | `claude --version`、`claude update` | 只反映本机安装，不是历史 |
| 官方公告 | Claude 3.7/Claude Code（2025-02-24）、Claude 4（2025-05-22）、2.0（2025-09-29） | 阶段背景，不逐版本 |
| 文档索引 | <https://code.claude.com/docs/llms.txt> | 适合让 agent 找页面 |

**最小复现**（本仓脚本）：

```sh
cd ${PROJECTS_ROOT}/dsh-cli
node scripts/fetch-claude-code-history.mjs
```

脚本会：

1. 抓官方 changelog markdown；
2. 抓 npm registry 的 `time` / `dist-tags`；
3. 抓 GitHub 仓库元信息；
4. 写 `claude-code-changelog-raw.md` / `claude-code-releases.md` / `claude-code-versions.json`；
5. 打印版本总数、latest、首尾版本、各系列计数。

**注意**：官方没有承诺 changelog 的 HTML 结构或 `.md` 入口永久稳定；如果格式变了，脚本的 `<Update label=...>` 解析会失效。若要长期跟踪，建议加一条「格式指纹」断言（例如解析出的版本数不为 0 且 latest 版本能在 npm 里找到），失败就告警，而不是静默产出空表。

## 8. 口径与已知不确定

- 版本/日期优先用 **npm `time`（UTC）**；changelog 的 `description` 日期是给人读的，早期条目有 backfill（如 0.2.x 大量写 April 2, 2025），不能当作逐版本准确发布日。
- 「changelog 首次出现」只证明**文字首次出现**，不等于功能首次发布；本文件已在表中标注这一点。
- 2.1.0 没有找到同等级的官方发布公告来交叉验证，因此「2.1 开始」依据是 npm + changelog，不宣称它是官方大版本公告。
- npm 版本数含预发布/tag 变化；`stable` / `latest` / `next` 可能不同，本文件抓取时三者分别为 `2.1.292` / `2.1.302` / `2.1.302`。
- GitHub 仓库公开了 CHANGELOG、示例、插件等，但**不要据此推断 Claude Code 核心是开源的**；本文件只使用其公开 changelog/release 元数据。

## 9. 参考

- [Claude 3.7 Sonnet and Claude Code（2025-02-24）](https://www.anthropic.com/news/claude-3-7-sonnet)
- [Introducing Claude 4（2025-05-22，Claude Code GA）](https://www.anthropic.com/news/claude-4)
- [Enabling Claude Code to work more autonomously（2025-09-29，2.0）](https://www.anthropic.com/news/enabling-claude-code-to-work-more-autonomously)
- [Claude Code changelog](https://code.claude.com/docs/en/changelog) · [changelog.md](https://code.claude.com/docs/en/changelog.md)
- [anthropics/claude-code](https://github.com/anthropics/claude-code) · [CHANGELOG.md](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
- [npm @anthropic-ai/claude-code](https://www.npmjs.com/package/@anthropic-ai/claude-code) · [registry JSON](https://registry.npmjs.org/@anthropic-ai/claude-code)
