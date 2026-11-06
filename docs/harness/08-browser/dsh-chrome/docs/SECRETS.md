# 跨通道机器型 token（sec）

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


> 状态：**MVP 已实现，未接真实使用**（2026-11-06）。范围：机器型 token（API key、registry token、CLI 环境变量）的 Keychain 存储、`sec` CLI、`tools/pre-execute` 与 `tools/post-execute` 两个 Host 钩子、一个 skill。**不含**备份/导出、跨平台、截图像素遮罩、交互型浏览器的 credential helper（那部分见 [PASSWORD-MANAGEMENT.md](<PASSWORD-MANAGEMENT.md>)）。
>
> 与 `PASSWORD-MANAGEMENT.md` 的边界：那份设计负责“人在场时把网站密码填进页面”（helper、`{filled:true}` 回执、不做 `.env`）；本文负责“agent 需要自动使用的机器型 token”。两者都只把明文留在各自的取用进程里，共用一个 OS 凭据库但分 service。

## 1. 结论

1. 真值只存 macOS Keychain：service `com.taishuo.dsh.secrets`，account `<profile>/<name>`，一条 token 一个条目。
2. 文件里只有引用：`~/.dsh/secrets/<profile>.env` 写 `NAME=secret://<profile>/<name>`，没有真值。
3. 使用只有一条路：`sec run --profile <p> -- <command>`。值只注入该子进程的环境变量，子进程输出先按“已知值 + token 形态”脱敏再打印。
4. 目标绑定写在 `~/.dsh/secrets/bindings.json`；解释器类命令（`sh`/`bash`/`env`/`python`/`node` 等）永远拒绝，未绑定的引用不可用。
5. 模型永远不应收到值：`ls`/`describe` 只给元数据，`show` 只给遮罩（前四位…后四位 + 长度），且要人确认。
6. 两个 Host 钩子兜底：`tools/pre-execute` 拒绝 shell 工具里直接 `security find-generic-password` 一类读取；`tools/post-execute` 对工具结果文本做 token 形态脱敏。

## 2. 为什么不做“加密 env 文件”

- 本机 FileVault 已开，磁盘被拷走的威胁已经被系统层覆盖大半；再叠一层加密 env 的边际收益是“防误传/误提交”。
- 机器型 token 的使用者就是 agent 的子进程；任何“agent 能自动解开”的加密 env，在 `sec run` 解密注入后仍是明文环境变量。加密不构成对 agent 的边界。
- 引用式 env + Keychain 把“使用”和“读取”分开：agent 能发起使用，但拿不到值；人要看值只能走 `show --masked` 或系统 Keychain UI。

## 3. 信任边界与不变量

```
模型 / DSH 会话（工具参数与结果会发给模型服务商、写进会话日志）
  │  ref 与元数据；永不出现值
  ▼
dsh-chrome provider（本机 Node 进程）
  │  pre-execute 拒绝直读 Keychain；post-execute 文本脱敏
  ▼
sec CLI（本机进程；只在 run 期间持有值）
  │  校验白名单 → 读 Keychain → 注入子进程 env → 输出脱敏
  ▼
目标命令（curl / git / 公司 CLI …）
```

不变量：

1. 值不进入模型可见面（tool args/results、render、截图）。
2. 值不写进 env 文件、bindings、audit、日志、shell history。
3. 使用必须绑定命令；解释器不放过；未绑定即拒绝。
4. 任何失败都关闭，不回退明文。

## 4. 文件布局

| 路径 | 权限 | 内容 |
| --- | --- | --- |
| `$DSH_HOME/secrets/` | 0700 | 目录 |
| `$DSH_HOME/secrets/<profile>.env` | 0600 | `NAME=secret://<profile>/<name>` 与注释；无真值 |
| `$DSH_HOME/secrets/bindings.json` | 0600 | 每个引用的 `allow_commands`、`unattended` |
| `$DSH_HOME/secrets/audit.jsonl` | 0600 | 追加式审计：ts/session/action/ref/target/result/reason；5MB 轮转 |

## 5. `sec` 命令

| 命令 | 作用 | 谁用 |
| --- | --- | --- |
| `sec init --profile <p>` | 建目录、空引用文件、空绑定表 | 人 |
| `sec add <ref> [--env NAME] --stdin` | 从 stdin 读值写 Keychain，更新引用文件与绑定占位 | 人 |
| `sec rotate <ref> [--env NAME] --stdin` | 覆盖 Keychain 值并记审计 | 人 |
| `sec ls [--profile <p>]` | 列引用、存储状态、绑定；无值 | 人 / agent |
| `sec describe <ref>` | JSON 元数据：env 名、stored、binding；无值 | agent |
| `sec show <ref> --masked [--yes]` | 前四位…后四位 + 长度；TTY 上要确认 | 人 |
| `sec run --profile <p> [--dry-run] -- <cmd> [args…]` | 白名单校验、注入值、输出脱敏 | agent / 脚本 |

退出码：`0` 成功，`2` 用法/引用/绑定格式错误，`3` 未找到，`4` 拒绝或需要确认，`5` 存储/平台错误。

`run` 的行为细节：

- 只注入“绑定允许这条命令”的引用；其余跳过并记审计（`result:denied`）。
- 子进程环境先删掉父进程里同名的变量，避免外部 shell 残留值混进来。
- 输出按行缓冲再脱敏：已知值精确替换为 `«redacted»`，再套用 `src/headless-redact.js` 的 token 形态规则。
- 没有任何引用允许该命令（含解释器命令、空 profile）时直接失败，不执行命令；不允许“注入了 0 个引用但照跑”。
- 已知上限：外层 shell 的重定向发生在 `sec` 之外；命令白名单本身必须是可信工具，不能指望参数检查拦住“把值写到文件”。

## 6. `bindings.json`

```json
{
  "version": 1,
  "refs": {
    "secret://company/api-token": {
      "allow_commands": ["curl", "git"],
      "unattended": true
    }
  }
}
```

- `allow_commands`：裸命令名（不含路径），按 basename 精确匹配。解释器类命令永远拒绝，即使写进白名单。
- `unattended: false`：每次使用要人确认；非 TTY 直接失败关闭。
- 新增引用默认 `allow_commands: []`，必须由人编辑后 `sec run` 才会注入。

## 7. Host 钩子

`src/secrets-hooks.js` 在 `index.js` 的 `apply()` 里注册，两个监听器都随插件卸载释放：

- `tools/pre-execute`：`bash` 工具的 `command` 命中 `security find-generic-password|find-internet-password|dump-keychain|export` 时返回 `deny`，提示改用 `sec ls`/`describe`/`show`。
- `tools/post-execute`：对结果里的 text block 做 token 形态脱敏（`Bearer`/`sk-`/JWT/AKIA 等），保留图片 block 与 `block` 决策；无命中时原样透传。

系统提示另挂一段 `SECRETS_GUIDANCE`（`systemPrompt.section`，order 901），告诉模型 `sec` 的存在与红线。

**已知缺口**：provider 侧只做形态脱敏，不做“已知值精确匹配”（那需要把值加载进 provider，等于新增一个明文面）；精确值脱敏由 `sec run` 在子进程出口完成。因此绕开 `sec run` 直接把 token 拼进命令的情况，只剩形态规则兜底。

## 8. 安装与启用

```bash
# 仓库内（只读链接，不改用户配置）
node scripts/install-sec.mjs
# → ~/.local/bin/sec -> <repo>/bin/sec.mjs
# → $DSH_HOME/skills/secret-hygiene -> <repo>/skills/secret-hygiene
```

- 若 `~/.local/bin` 不在 PATH，按脚本提示加。
- 插件是 profile 里的本地 link（`dsh-desktop-chrome: link:<repo>`），改完 `index.js` 后在插件管理器里重载 bundle 即生效；不需要重装。
- 不想启用钩子时：`DSH_SECRETS_HOOKS=0`（只跳过 Host 钩子，`sec` CLI 仍可用）。

## 9. 迁移存量明文（等人拍板后执行）

1. `sec init --profile personal`
2. 逐个迁移：`pbpaste | sec add secret://personal/<name> --env <NAME> --stdin`（值从 stdin 进，不进 history）
3. 编辑 `bindings.json` 给每个引用加 `allow_commands`；高价值引用设 `unattended: false`。
4. 把 `~/.agent-env.sh` 改成只导出 `SEC_PROFILE`，或删除；确认没有别的 rc 在 export 真值。
5. 用哨兵值跑 `sec run --dry-run` 与 `sec run -- <被允许的命令>`，确认输出、audit、history 里都没有真值。
6. 回滚：保留原文件 7 天；Keychain 条目用 `security delete-generic-password -s com.taishuo.dsh.secrets -a <profile>/<name>` 删除。

## 10. 不承诺 / 已知限制

- 只实现 macOS；Linux/Windows 返回 `SECRET_UNSUPPORTED_PLATFORM`，没有明文 fallback。
- `security add-generic-password -w <value>` 的值会短暂出现在 argv（macOS 没有 stdin 写入口）；写入只有人执行，且本机单用户；这是记录在案的残余风险。
- 同 UID 的其他进程仍可读 Keychain、`~/.dsh`、会话日志；本文不承诺防住同用户恶意进程。
- 不提供 `get`/`list`/`reveal` 给模型；`show --masked` 仅人用。
- 不覆盖截图/录屏里的明文；不覆盖浏览器交互型密码。
- 备份/导出（age/1Password）本轮不做。

## 11. 测试

```bash
node test/secrets-store.mjs
node test/secrets-cli.mjs
node test/secrets-hooks.mjs
```

全部使用临时 `DSH_HOME` + 注入的 fake `exec`，不碰真实 Keychain；哨兵值断言值不出现在结果、错误、审计与文件中。

## 12. 验证记录（2026-11-06）

- 单元/契约：`node test/secrets-store.mjs`（17 checks）、`test/secrets-cli.mjs`（9 checks）、`test/secrets-hooks.mjs`（6 checks）全过；全部用临时 `DSH_HOME` + 注入的 fake `exec`，不碰真实 Keychain。
- 端到端冒烟：临时 PATH 上放 fake `security` 脚本，走 `init → add → ls → describe → show --masked → run --dry-run → run`；`run` 的输出与 audit 只有 `«redacted»`/元数据，`run -- sh -c …` 被拒（`SECRET_BINDING_DENIED`）。
- 仓库测试：除 `test/headless.mjs` 外逐项通过（含 `credentials`、`operation-log`、`headless-redact`、`capture-parity`、`version-consistency`、`tool-metadata`）。`test/headless.mjs` 在本机 Chrome 156 上因合成器帧时序断言失败；该文件自述 environment-sensitive，且只 import `src/headless.js`（本轮未改）。`bench-scenario` 未跑。
- `node test/secrets-api.mjs`（8 checks）：fake connection + 真实 `Request`/`Response`，覆盖 GET 元数据、POST 写入、默认 env 名、方法/JSON/超大 body/字段校验、非 macOS 501、写失败不回显值、connection 缺失时 fail-soft。
- `test/client-bundle.mjs` 扩到 secrets tab：tab/guide/槽位注册、空闲态与弹窗表单（5 个字段、token 字段是 `type=password`）、无 iframe/innerHTML/eval。
- 未验：真实 Keychain 写入（避免污染用户条目）；DSH 运行时重载后的钩子与面板行为（当前进程仍加载旧代码，需要在插件管理器里 reload bundle）；真实会话里点「凭据」tab 的完整路径。

## 13. 浏览器侧录入（2026-11-06 增量）

DSH Web 右栏新增「凭据」tab（与浏览器 tab 并列）：列出已有 ref 的元数据（env 名、存储状态、允许命令），点「添加 token」弹出对话框，输入 profile、名称、环境变量名、值、允许命令后保存。值只存在于该输入的本地状态和一次同源 POST 请求体里，不经过模型、工具参数、会话日志或审计。

- 入口：`client/index.js` 的 `dsh-desktop-chrome/secrets` tab（kind `dsh-chrome-secrets`）；标题/正文槽与浏览器 tab 同构。
- 路由（Host `src/secrets-api.js`，通过 `ctx.connection.fetch.register` 注册，owner-only，继承 DSH 的浏览器 cookie 与 Host/Origin fence）：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/api/dsh-chrome/secrets/refs` | 列 profile 与 ref 元数据（无值） |
| POST | `/api/dsh-chrome/secrets/store` | `{profile,name,envName?,value,allowCommands?,unattended?}` → 写 Keychain + 引用文件 + 绑定；返回 masked 元数据 |

- 限制：请求体 ≤64KB；非 macOS 返回 501；`connection` 不可用时面板显示读取失败，`sec` CLI 仍可用；样式只用 `--dsw-*` token。
- 未验：真实会话里的点击路径（需重载插件）、不同主题下的样式细节。
