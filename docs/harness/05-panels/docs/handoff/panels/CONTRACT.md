# 接口契约

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


这份是唯一口径。实现时发现要改，先改这里，再改代码，并在交付说明里写明。
实测数字和出处都在 `PROBE.md`，这里只写结论。

## 1. 总览

用户或模型写一份 `*.panel.json`，点开就在右栏显示。三级能力：

| 级 | 谁写 | 写什么 | 在哪运行 |
|---|---|---|---|
| 第一级 | 任何人、模型 | `panel.json`，类型是 `table` `timeline` `graph` `space` `compose` | 宿主页面，随插件发布 |
| 第二级 | 会写前端的人、模型 | `type: "custom"` + `renderer.html` | 沙箱 iframe |
| 第三级 | 插件开发者 | 插件调 `ctx.panels.registerType` | 宿主页面，和其他插件一样 |

接入点全部已实测，不改 DSH：

| 要做的事 | 接在哪 |
|---|---|
| 点文件打开 | `ctx.documentPreviews.register({extensions:['panel.json'], priority:'extension', loading:'bytes-complete', wrap:false})` + keyed slot `sidebar.right.tab.document` |
| 程序打开 | `ctx.sidebarRight.openResource('dsh-resource://file/session/<id>/<路径>')` |
| 文件变化刷新 | 正文的 `addResource(address)` |
| 模型交付 | 原生 `present` 工具，不新增 |
| 终端 | `ctx.get('tuiPanels', false)`，只注册一个入口 |

**服务要用 `ctx.inject([...], scope => …)` 等，不要写进顶层 `inject`。** 顶层列了当前 profile 没有的服务，插件会一直 pending，不报错。

## 2. `panel.json`

```ts
interface PanelSpec {
  apiVersion?: 1                          // 缺省当 1
  type: 'table'|'timeline'|'graph'|'space'|'compose'|'custom'|string  // string = 第三级注册的类型
  title: string
  description?: string
  data?: string | DataRef | (string | DataRef)[]   // 见下；不写就用内联字段
  encoding?: Record<string, string>       // 字段到位置、颜色、标签的映射
  layers?: Layer[]                        // space 用；其他类型忽略
  renderer?: string                       // 只有 custom 能写，相对 panel.json 的路径
  tui?: { image?: string, summary?: string }
  permissions?: { network?: string[], read?: string[] }
  refresh?: { on: 'file' } | { everyMs: number }   // 缺省 {on:'file'}
}
interface DataRef { path: string, format?: 'json'|'csv'|'tsv'|'geojson'|'binary', id?: string }
```

- **内联数据**：族的字段直接写在顶层，如 `{"type":"graph","nodes":[…],"edges":[…]}`。
- **文件数据**：`data` 写相对路径，文件内容是同样的字段。`format` 按后缀推断。
- 路径一律相对 `panel.json` 所在目录，写绝对路径或 `..` 逃出会话工作区的算校验错误。
- `permissions.read` 列 `custom` 渲染器运行中还要 `need` 的文件，规则和 `data` 相同。
- 未知字段报警告不报错，留给以后的版本。`apiVersion` 大于 1 报错。
- `panel.json` 本身上限 `specMaxBytes`。

### 四种内置类型

```ts
// table
{ columns: (string | {key, title?, type?:'text'|'number'|'date', width?, frozen?})[],
  rows: (unknown[] | Record<string, unknown>)[] }
// timeline
{ items: {id?, label, start: number|string, end?: number|string, group?, status?}[] }
// graph
{ nodes: {id, label?, group?, weight?, status?: 'idle'|'run'|'wait'|'done'|'err', progress?: number}[],
  edges: ([from,to] | {from,to,label?})[] }
// status、progress（0–1）都可选，只影响符号和进度条；终端框图和桌面检查器用同一组符号 ○ ◐ ▲ ● ✕
// space
{ coords: 'lonlat'|'plane'|'grid',
  features: {id?, label?, x, y, kind?:'point'}[]  // 或用 layers
  layers?: {id, title, kind:'points'|'lines'|'polygons'|'image', visible?, features?, src?}[] }
```

`id` 缺省时，表格用行号，时序用数组下标，保证同一份数据下稳定。选中、点亮都按 `id`。

### `compose`

```ts
{ type:'compose', layout:'rows'|'columns', panels: ({key: string, flex?: number} & PanelSpec)[],
  links?: {from: string, to: string, on:'select'}[] }
```

最多 `composeMaxPanels` 个子面板，不能嵌套 `compose`。`links` 的语义是：`from` 选中时，点亮 `to` 里同 `id` 的要素。

## 3. 校验

`validate(text) → {ok:true, spec, warnings} | {ok:false, errors}`，纯函数，宿主页面和 Node 用同一份代码，不加运行时依赖。

```ts
interface PanelIssue { code: string, message: string, path: string, line?: number, column?: number }
```

- `message` 给人看，中文，说清哪里错、怎么改，如「边 a → b 指向不存在的节点」「不认识 foo，这种要写渲染器」。
- JSON 语法错误要报行号。
- `graph` 查边的两端都存在，节点的 `status` 只收那五个值、`progress` 在 0–1（否则是警告，不是错误，按没写处理），`timeline` 查 `end >= start`，`table` 查行宽和列数，只报前 `issueMax` 条。
- 校验不过时，有上一版就保留上一版并显示 `stale`，没有就显示 `error`。

`schema/panel.schema.json` 和 `validate` 是两份东西，测试用 ajv（开发依赖）对同一批样例核对两者判定一致，这是独立尺子。

## 4. 读数据

| 路径 | 什么时候用 | 实测 |
|---|---|---|
| 内联 | 写在 `panel.json` 里 | 随文件读 |
| `workspaceFiles.readBytes` | 不超过 `directReadMaxBytes` | 31 MiB 0.5 到 1.2 秒，超 32 MiB 报 `workspace-file/too-large` |
| 插件接口 `/api/dsh-panels/data` | 更大的文件 | 512 MiB 1.2 到 2.5 秒 |

`readBytes` 返回 `{ok, value:{data, …}}`，别直接读 `.data`。

### `data`

`POST /api/dsh-panels/data`，只给宿主页面用：

```ts
// 请求（JSON）
{ sessionId: string, panelPath: string, ref: string, offset?: number, length?: number }
// 成功：二进制
// 头：content-type: application/octet-stream
//     cache-control: no-transform
//     x-panel-total: 文件总字节
//     x-panel-version: `${mtimeMs}-${size}`
// 失败：JSON {ok:false, error:{code, message}}，HTTP 200 以外
```

- **`cache-control: no-transform` 必须有。** 缺了宿主会压缩，同样 512 MiB 慢 2.5 到 13 倍，功能测试不会红。契约测试要断言这个响应头。
- `length` 上限 `chunkBytes`，默认 8 MiB，分块由客户端循环取。
- 按块读时带 `x-panel-version` 比对，中途文件变了就从头读，不混两个版本。

### 信任边界

路径是信任边界，每次请求都要重新检查：

1. `sessionController.inspect(sessionId)` 取工作区根目录，会话不存在就拒绝。
2. `panelPath` 真实路径必须落在根目录内，后缀是 `.panel.json`。
3. 服务端自己重读这份 `panel.json`，`ref` 必须是其中声明的路径或 `renderer` 及其同目录资源。
4. `ref` 真实路径必须落在根目录内，符号链接逃出去的算越界。相似前缀（`/a/b` 和 `/a/bc`）要测。

错误码：`session-missing` `outside-workspace` `undeclared-path` `not-found` `too-large` `changed`。

### JSON 接口

其余接口都是 `POST /api/dsh-panels/<endpoint>`，信封沿用工作台：
`{type:'client-request', rpcId, method:'dsh-panels/<endpoint>', payload}` → `{type:'server-response', rpcId, result}`，
`result` 是 `{ok:true, value}` 或 `{ok:false, error:{code, message}}`。业务错误不抛到 HTTP 层。
每个接口的成功、失败都要在测试里走到。`requestBody` 用 `'buffered'`，只收 `application/json`。

`health` 返回 `{ready:true, version, build, limits}`。

## 5. 外壳和五种状态

外壳是宿主 React 组件，所有类型共用，包括第二级、第三级。

- 头部 40px：标题、族名、要素计数。工具条放右侧，类型能加自己的按钮。
- 检查器：选中要素后显示字段，有「引用到对话」。
- 状态条 28px：最后一个事件、截断提示。
- 尺寸按容器宽度：`<360` 卡片，`<900` 右栏，其余全屏。同一份数据，不重新读。
- 颜色只用设计稿的变量，见 `design/themes/`，跟随宿主明暗。

| 状态 | 什么时候 | 显示 |
|---|---|---|
| `loading` | 首次读取 | 宿主同款圆点 + 文字 |
| `empty` | 校验过了但没有要素 | 一句话 + 文件路径 |
| `error` | 没有上一版可显示 | 问题列表，能点到行号 |
| `stale` | 文件变了但这版读不出或校验不过 | 保留上一版，顶部提示原因 |
| `ready` | 正常 | 面板 |

## 6. 第一级的规模

内置渲染器不追求极限，超了不报错，画前 `builtinMaxElements` 个并在状态条写明。

| 类型 | 画法 | 上限 |
|---|---|---|
| `table` | 虚拟滚动 DOM | `tableMaxRows`，默认 1,000,000 |
| `timeline` | Canvas 2D | `builtinMaxElements`，默认 5000 |
| `graph` | Canvas 2D，力导向和分层两种布局，自写 | 同上 |
| `space` | Canvas 2D，平移、缩放、图层、测距，无底图瓦片 | 同上 |

模型函数和绘制分开：`model(spec, view) → viewModel` 是纯函数，桌面和 TUI 共用。不引入图表、图、地图库。

## 7. 第二级：沙箱

### 页面组装

```text
<iframe sandbox="allow-scripts" srcDoc=…>
```

`sandbox` 只有 `allow-scripts`，绝不加 `allow-same-origin`、`allow-forms`、`allow-popups`。
文档由宿主拼出，顺序固定：

1. `<!doctype html><html><head>`
2. CSP `<meta>`，必须是 `<head>` 第一个子元素
3. `dsh-panel.js`（内联）
4. 渲染器 HTML，其中相对路径的 `.js` `.css` 由宿主读出后内联，总量不超 `rendererAssetsMaxBytes`

默认 CSP，改动要有实测：

```text
default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval' blob:; worker-src blob:;
style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none';
base-uri 'none'; form-action 'none'
```

**没有这条 CSP，沙箱能连外网，也能连本机宿主。** 这已实测，`sandbox` 属性本身不断网。

沙箱里有 WebGL2、blob Worker、WebAssembly。没有 `localStorage`、`indexedDB`、`SharedArrayBuffer`。`Worker` 要从 `blob:` 建。WebGPU 不写进契约，两次实测结果不一致。

### 信任

CSP 拦不住两条路，都已实测：WebRTC 能打通外部 STUN；页面能把自己跳到外部地址，地址里能带数据。
所以「默认离线」防的是误连，不是恶意代码。规则：

- 第一级只有数据，不用批准。
- 第二级第一次运行前，外壳显示渲染器路径和声明的联网地址，人点「运行」才挂 iframe。
- 批准记录键是 `工作区根目录 + 渲染器相对路径`。改内容不重新问，`permissions.network` 变了要重新问。
- 模型没有任何批准接口，批准只来自人点按钮。
- iframe 的 `load` 事件第二次触发，说明页面跳走了：立刻移除 iframe，显示 `error`，记一条日志，不自动重载。

### 联网

`permissions.network` 写 `https://host` 这样的来源，不收通配符和 `http:`（`localhost` 除外）。
批准后把这些来源加进 `connect-src` 和 `img-src`，其他不变。

### 协议

消息前缀 `dsh-panel/`，字段 `proto: 1`。宿主只认 `event.source === iframe.contentWindow`，页面只认 `event.source === parent`。名字不在表里的丢掉。上行全部当不可信输入：校验形状、限大小（`upMessageMaxBytes`）、限频（`upMessagesPerSecond`）。

| 方向 | 名字 | 字段 |
|---|---|---|
| 下 | `init` | `spec, theme, size, visible, state, caps` |
| 下 | `data` | `ref, offset, total, final, buffer` 或 `json`；`buffer` 走 transfer |
| 下 | `theme` `resize` `visible` | 对应字段 |
| 下 | `emphasize` | `ids, note?` |
| 下 | `reload` | `reason` |
| 上 | `ready` | 无 |
| 上 | `need` | `ref, offset?, length?` |
| 上 | `select` | `ids, label?` |
| 上 | `status` | `state, message?, count?` |
| 上 | `save` | `state`，不超 `savedStateMaxBytes` |
| 上 | `error` | `message` |

大文件读取时，`fetch` 的响应体是 16 KiB 一段，直接转发会变成几万条消息。宿主要攒到 `chunkBytes` 再发。

`dsh-panel.js` 对外：

```js
const panel = DshPanel.connect();
panel.on('init', ({spec, theme, size, state}) => {});
panel.on('data', (msg) => {});
panel.on('emphasize', ({ids}) => {});
panel.on('visible', ({visible}) => {});   // false 时要停掉 requestAnimationFrame
panel.need({ref, offset, length});
panel.select({ids, label});
panel.status({state, message, count});
panel.save(state);
panel.ready();
```

## 8. 模型工具

模型写文件、用原生 `present` 交付，这三个工具只做补充。全部不改用户数据。

```ts
panel_check({path?})        // 不带 path 返回 schema 和写法说明；带 path 返回校验结果
panel_point({path, ids, note?})  // 点亮要素
panel_selection({path?})    // 读用户最近一次选中
```

`panel_point` 只记状态，桌面在面板可见时按 `pointPollMs` 轮询，隐藏时不轮询，终端在下次绘制时读取。

## 9. 选中回到对话

选中写进服务端状态，模型用 `panel_selection` 读，桌面和终端一样。

桌面的「引用到对话」走 `conversation.input.for(sessionCtx)`，要拿到保活的 Session 作用域。
`setDraft` 会替换整段草稿并删掉引用胶囊，所以：

- 草稿为空：写入引用文字。
- 草稿非空：拿不到安全的追加方式时，复制到剪贴板并提示，不覆盖用户正在写的内容。

引用文字：`[面板：<标题>] <label 或 id 列表>`，并带文件相对路径。

## 10. 终端

`ctx.get('tuiPanels', false)` 没有时什么都不做。

- 只注册一个入口，id `panels`。每个插件最多 4 个面板，所以类型不各占一个。
- 列表来源：`snapshot().cwd` 下有界扫描 `*.panel.json`，跳过 `.git` `node_modules`，上限 `scanMaxFiles`、`scanMaxDepth`。
- 每种类型一个纯函数 `lines(spec, {width, height, selected?}) → {text, tone, spans?}[]`，中文按双宽算，不超宽。`spans` 可选，`{from, to, tone}[]` 按显示列覆盖整行的 `tone`，框线和框里的字才能分色。
- `graph` 有两种画法，`lines` 自己选：
  - **框图**：同时满足才用——节点不超过 `tuiGraphBoxMaxNodes`，宽度不小于 `tuiGraphBoxMinCols`，无环，没有跨层的边，相邻两层之间只有一对一、一分多、多汇一三种连法。按最长路径分层，一层一排框，层间画分叉 `┌┬┐`、汇合 `└┴┘`。一排放不下时按 `err` `run` `wait` `done` `idle` 的顺序留前几个，最后一格写「另 N 个」。框最窄 `tuiGraphBoxSlotCols` 列；框里依次是标题（在上框线上）、`group`、进度条、状态符号。选中的节点用粗框 `┏━┓`。对照 `design/RunGraphTui.dc.html` 的中间一列。
  - **邻接树**：其余情况都退到这里，第一行写明为什么退（太多 / 太窄 / 有环 / 连法太复杂）。
  - 两种都是静态的，没有流动点，不用动画时钟。
- 退路顺序：`tui.image`（面板 `Image`），`tui.summary`，类型自带的 `lines`，最后是要素列表。
- 自定义面板不运行渲染器。
- 动画只能用 `ui.useAnimationTime`，静止时传 `null`。
- `open` 每 5 秒一次，提醒走 `badge`，不自动弹出。`sendToChat` 目前恒为 false，不要依赖。

## 11. 第三级：类型注册

```ts
ctx.panels.registerType({
  id: 'wafer-map', family: 'space', schema,   // JSON Schema 子集：type/required/properties/items
  desktop: Component,                         // 只在宿主页面
  tui: { lines, minColumns },                 // 只在 Node
})
```

`panels` 是 Cordis 服务，两侧各一份。`registerType` 返回 disposer，走 `ctx.effect`。
`id` 重复抛错，不许覆盖内置类型。插件卸载后，用这个类型的面板回到 `error`，提示缺哪个类型。
`family` 限八族：`space` `relation` `time` `chart` `table` `document` `media` `live`。

## 12. 资源

- 没有变化时零重绘：不开常驻定时器，不跑空的 `requestAnimationFrame`。
- 正文不可见时，内置类型停绘，沙箱收 `visible:false`。
- 同时活着的 iframe 不超 `maxLiveFrames`，超了卸载最久没看的，保留 `save` 过的状态。
- 视图状态（缩放、选中）放内存 LRU，上限 `viewStateMax`，不进 localStorage。
- 所有订阅、定时器、监听都归 `ctx.effect`，卸载后不留。
- 实测基线：100 万点在 DSH 里和空页面都是 60 帧，宿主没有额外开销；机器忙时两边一起掉到约 30 帧；4 个 100 万点同屏时每个约 10 帧。内存这轮测不准，P-14 重测。

## 13. 超参

全部进 `config/hyperparams.yaml`，写清 value / why / adjust。这份文件是 JSON 内容，沿用工作台的做法。

| 名字 | 默认 | 说明 |
|---|---|---|
| `specMaxBytes` | 8 MiB | `panel.json` 上限 |
| `issueMax` | 20 | 一次最多报几条问题 |
| `directReadMaxBytes` | 32 MiB | 走 `readBytes` 的上限，与宿主 `maxFileBytes` 一致 |
| `chunkBytes` | 8 MiB | 分块大小 |
| `dataMaxBytes` | 2 GiB | 单个数据文件上限 |
| `jsonMaxBytes` | 64 MiB | 内置类型能解析的 JSON 上限 |
| `tableMaxRows` | 1,000,000 | 表格行数上限 |
| `builtinMaxElements` | 5000 | 其他内置类型的要素上限 |
| `composeMaxPanels` | 4 | 组合面板子面板数 |
| `rendererAssetsMaxBytes` | 32 MiB | 渲染器及其资源总量 |
| `upMessageMaxBytes` | 256 KiB | 上行单条大小 |
| `upMessagesPerSecond` | 120 | 上行频率 |
| `savedStateMaxBytes` | 1 MiB | `save` 的状态大小 |
| `maxLiveFrames` | 4 | 同时活着的 iframe |
| `viewStateMax` | 64 | 内存里保留多少个面板的视图状态 |
| `pointPollMs` | 1000 | 点亮状态的轮询间隔，只在可见时 |
| `scanMaxFiles` | 200 | 终端列表扫描上限 |
| `scanMaxDepth` | 6 | 终端列表扫描深度 |
| `tuiGraphBoxMaxNodes` | 12 | 终端关系图画框图的节点上限，多了退邻接树 |
| `tuiGraphBoxMinCols` | 100 | 画框图的最小终端宽度 |
| `tuiGraphBoxSlotCols` | 16 | 框图里一个框的最窄列数，决定一排放几个 |
