# 接口契约

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


这份是唯一口径。实现时发现要改，先改这里，再改代码，并在交付说明里写明。

## 通用

- 全部挂在 `/api/project-workbench/<endpoint>`，只收 POST，信封沿用 `index.js`：
  `{type:"client-request", rpcId, method:"project-workbench/<endpoint>", payload}` → `{type:"server-response", rpcId, result}`
- `result` 是 `{ok:true, value}` 或 `{ok:false, error:{message}}`。业务错误不抛到 HTTP 层。
- 时间一律 ISO 字符串。Session 事件的 `time` 是毫秒数，出接口前转换。
- 读接口带 `revision`（整数，项目状态每次变化加一）。请求带 `sinceRevision` 且没变时，返回 `{notModified:true, revision}`。
- 跨项目的 ID 一律拒绝，错误文字沿用现有的「线程不属于此项目」。
- 新数字进 `config/hyperparams.yaml`，写清 value / why / adjust，别写死在代码里。

## 状态

后端给 `display`，前端只认这个字段，不再自己从 `phase` 推。

| `display` | 文字 | 符号 | 分组 `group` | 来源 |
|---|---|---|---|---|
| `running` | 进行中 | ◐ | `active` | `phase` 为 running / starting |
| `queued` | 排队中 | ○ | `active` | `phase` 为 queued |
| `wait` | 等待审批 | ▲ | `waiting` | 会话里有未决的 `approval/asked` |
| `ask` | 等待回答 | ? | `waiting` | 会话里有未答的提问，或 `phase` 为 waiting_user |
| `plan` | 计划待审 | ▲ | `waiting` | 计划模式等人批，来源以 B02 查实为准 |
| `interrupted` | 待恢复 | ▲ | `waiting` | `phase` 为 interrupted |
| `failed` | 失败 | ✕ | `waiting` | `phase` 为 failed |
| `review` | 待审核 | ◎ | `review` | `phase` 为 review |
| `done` | 已完成 | ● | `resolved` | `phase` 为 completed |
| `stopped` | 已停止 | ○ | `resolved` | `phase` 为 stopped |

`wait`、`ask`、`plan` 优先于 `running`：线程在跑但卡在审批时，要显示等待审批。

## 线程新增字段

```ts
interface ThreadExtra {
  history: { phase: Phase; at: string }[]   // 每次换 phase 追加一条，只追加不改
  nextStep: string                          // 给人看的一句话，project_report 的 next_step，缺省取 summary 第一句
  prs: { number: number; url?: string }[]   // project_report 的 prs，缺省空
  outputs: { path: string; title: string; at: string }[]
}
```

旧的 `projects.json` 没有这些字段。读的时候补默认值，不许报错，也不许丢数据。

## `overview`

入参 `{projectId, sinceRevision?, resolvedLimit?}`

```ts
{ revision, project: {id, title, paused, leadRunning},
  counts: {review, waiting, active, resolved},
  groups: { review: Row[], waiting: Row[], active: Row[], resolved: Row[] },
  resolvedMore: boolean,
  outputs: { threadId, path, title, at }[] }

interface Row { id, sessionId, title, mode, display, statusText, nextStep, prs, outputs, updated, running: boolean }
```

每组按 `updated` 倒序。`resolved` 默认只给 `resolvedLimit` 条，上限登记成超参。

## `library`、`library-changes`

`library` 入参 `{projectId, root?, path?}`。不带 `root` 时返回顶层：

```ts
{ roots: { id, kind: 'repo'|'worktree'|'outputs', title, path, threadId?, changed: number }[] }
```

带 `root` 时列一层目录：`{entries: {name, kind:'file'|'dir', size?, change?:'M'|'A'|'D'|'R'}[], truncated}`

`library-changes` 入参 `{projectId, threadId}`，返回 `{files: {path, change, additions, deletions}[], truncated}`。

**路径是信任边界**：解析真实路径后必须落在该 root 内，符号链接逃出去的算越界。

## `goal-get`、`goal-set`

```ts
interface ProjectGoal {
  id, text, status: 'active'|'paused'|'blocked'|'done',
  criteria: { id, text, done: boolean, evidence?: string, by?: 'user'|'thread' }[],
  threadIds: string[], updated
}
```

项目级目标，和 DSH 单会话的 `/goal` 是两回事，互不改写。线程能报证据，只有用户能把目标标 `done`。模型工具 `project_goal` 只给总对话，能改文字和标准，不能标完成。

## `map`

入参 `{projectId, sinceRevision?}`。只给结构，不给坐标。

```ts
{ revision,
  nodes: { id, kind:'goal'|'lead'|'thread'|'subagent'|'fork', sessionId?, title, display?, statusText?, nextStep?, meta?: {files?, contextPct?, elapsedMs?} }[],
  edges: { id, from, to, kind:'member'|'depends'|'subagent'|'fork'|'inferred', evidence: Evidence }[],
  truncated: {count, reason} | null }

type Evidence =
  | {grade:'fact', source:'project'|'dependsOn'|'parentSession'|'subagent'}
  | {grade:'inferred', source:'changed-files', files:string[]}
```

- 线型由 `kind` 决定：`member`、`depends`、`fork` 实线，`subagent` 双线，`inferred` 虚线。
- `inferred` 只提示，不能驱动任何动作，图闸也不算它。
- 节点 ID 跨次稳定，状态变化不许改变 `nodes` 的顺序，这样前端才能做到位置不跳。
- `depends` 由 `dependsOn` 来。有环时不崩，整条标记后返回。

## `thread-tail`

入参 `{projectId, threadId, limit?}`，返回 `{messages:{role,text}[], line:string, truncated}`。`line` 是常驻卡片那一行：最后一个工具调用或助手句子的短摘要。

## `thread-fork`

入参 `{projectId, threadId, atSeq?, title?}`。调 `sessionController.fork`，把新会话加为本项目的 `fork` 线程，记下 `forkedFrom`。不启动模型。

## `timeline`

入参 `{sessionId}` 或 `{projectId}`。

```ts
{ total: number, unit:'ms', runs: {
    id, title, status: 'running'|'completed'|'failed'|'cancelled'|'interrupted',
    phases: { title, members: { seq, label, start: number, end: number|null, outcome?: string, childId? }[] }[]
  }[] }
```

`start`、`end` 是相对运行开始的毫秒数。没有结束事件的成员 `end` 为 null，前端按进行中画。`{projectId}` 时用线程 `history` 拼一张线程级时间线，`phases` 只有一组。

## `live-list`、`live-read`

不进对话记录的实时内容。

```ts
interface LiveItem {
  id, threadId?, sessionId?, kind:'doc'|'job'|'chart'|'note',
  title, status:'streaming'|'done'|'failed', revision: number, updated,
  source: {type:'file', path} | {type:'inline'}
}
```

`live-list` 入参 `{projectId, sinceRevision?}`，`live-read` 入参 `{projectId, id, sinceRevision?}`，返回 `{item, body, truncated}`。

模型工具 `live_publish({kind, title, body?, path?, final?})` 写入。`note` 只出提示，不进面板。容量是环形的，上限登记超参，淘汰不影响 `source.file` 指向的文件。

## `layout-get`、`layout-set`

```ts
interface Layout { revision, panes: string[], docked: string[], rail: 'threads'|'library'|'goal'|'map', updated }
```

`panes` 最多 3 个线程或总对话的 ID，超过由后端拒绝。`set` 带 `revision`，不匹配返回 `{conflict:true, layout}`，前端用返回值重画。

## TUI

TUI 不走 HTTP，插件在同进程里直接读上面这些方法的内部实现。接口形状相同。
