# Super agent 原文与记录机制核查

> 公开整理版 · 整理日期：2026-11-06 · 源版本：研究笔记；2026-10-31。
> 保留个人通用研究、方法和公开来源；已省略公司案例、项目专属实现、个人身份与会话材料。
> 本次仅整理文本，未重新运行原实验、复测宿主兼容性或更新外部资料；历史结论仍受原研究范围限制。


## 找到的是哪篇文章，是否读了全文

### Takeaway

高度吻合用户描述的材料是 DeepSeek Harness 团队于 2026 年 10 月 31 日发表的《Super-agent 设计探索：迈向更自主的 Agent 系统》。已读署名转载从开篇到第 9 节及作者致谢的全部正文；Bilibili 对应篇目的精确 URL 和版本仍未独立核实，不能宣称“已完整读取 B 站原页”。

### Cited Findings

- 原始公众号入口已通过公开链接追溯：[DeepSeek Harness 团队原文](https://mp.weixin.qq.com/s/zoS7GlReWPhfCjENGxXCdg)。该入口在本次工具环境返回环境验证，未取得正文。
- 全文读取入口：[署名转载 ChainCatcher](https://www.chaincatcher.com/article/2300676)。页面明确写原文标题、原文作者 DeepSeek 产品部；末尾署名 Yujia Qiao 为系统实现者和文章作者，列出团队审阅者。另一篇[同题转载 UIED](https://www.uied.cn/posts/922127)直接链回上述公众号，补核了第 7.2 节的完整文字。两份转载有细小差异：ChainCatcher 的 7.2 节少一段实验解释，致谢名单亦不完全相同；不能称为与 B 站逐字一致。
- 阅读覆盖清单：第 1 节目标形态；第 2 节全局协调和并发执行分工；第 3 节事件准入、订阅路由、上下文展开及提前准备；第 4 节异步调用和不同渠道的交互；第 5 节计算、状态、机器环境解耦；第 6 节独立进度监督；第 7 节调度消融及路由负载实验；第 8 节规模、交互、共享边界、安全等开放问题；第 9 节总结及原型定位。来源：[原文转载](https://www.chaincatcher.com/article/2300676)。
- 官方 B 站账号空间可追溯到 [DeepSeekHarness](https://space.bilibili.com/3747571004608077)，但本次公开抓取受阻：空间 API 为 HTTP 412，内置浏览器打开该空间超时。停止重复尝试，不绕过验证。

### Inferences

- 原文标题、发布日、官方原型仓库、记忆相关术语一致，故材料身份高度吻合；“就是用户看到的那一个 B 站版本”仍需精确链接核对。
- 原文是一份系统设计探索。讨论稿可以基于署名全文与官方源码开展，但应在来源处简短标注读取的是转载，不把转载域名写成官方域名。

### Gaps

- B 站文章链接及原页图文尚未取得。
- 已完整读正文文本及图题，未逐张审视图内所有像素；实验关键数值采用正文而非猜图。

## 原文对记忆与每轮钩子究竟说了什么

### Takeaway

最相关的机制是关联对象可逐跳读取、上下文只放当前必要部分，以及把耗时工作移到异步事件流。原文没有把“小模型每轮自动生成可演化本体”作为已解决的能力；那是本项目应进一步设计与验证的增量。

### Cited Findings

- 原文的 Router 负责跨任务联系，Worker 执行具体工作；Router 可使用轻量模型。近期内容内联、长内容保留续读入口，靠 Trigger、Thread、Worker Session 的唯一 ID 逐跳找回上下文；跨月记忆仍列为开放问题。实验采用模拟编码任务，只能支持调度效率结论，不能证明记忆准确性或本体质量。来源：[原文第 2、3.3、7、8.1 节](https://www.chaincatcher.com/article/2300676)。
- 官方生命周期文档区分可重放的 `session/event` 与实时 `agent/*`；成功、失败及取消调用有不同持久结算事件，但结算前硬崩溃可能没有可回放的流。官方建议需要可重放转录的 SDK 使用者消费 `session/event`。来源：[Agent Turn And Step Lifecycle](https://deepseek-harness.github.io/deepseek-harness/en/reference/agent-lifecycle)。
- 原型在启动时安装 Session 和 Executor hooks；Engine 有 `inputsRead`、`turnEnded` 等回调，区分“已经发送到 Session”和“该 Session 实际读入历史且随后报告或结束一轮”。这些是执行状态维护，不是自动语义归档或本体生成。来源：[007 Architecture](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/007-architecture.md)。
- 原型文档明确：一轮结束时如果 shell job 或 subagent 仍运行，仍占 Worker 槽位，后台结果可再次唤醒；不能直接把 turn end 当作任务完成。来源：[003 Execution](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/003-execution.md)。

### Inferences

- 对 Record，建议把“轮结束”当作触发派生整理的候选时机，而不是唯一捕获入口。先确保持久事件可续读，再入队整理；中断、失败、工具未结算、稍后补到的后台结果要有独立状态与补处理路径。
- 从原文能借鉴的是“内容、身份和引用路径分离”：记录的实体或结论应能回到原始事件，读取结果也给出下一跳。语义图不应成为唯一事实源。
- 小模型适合有边界的抽取、映射、候选关系和歧义标记；使用小模型并不能保证历史推断正确，尤其不能事后臆造主模型当时的决策理由。
- 原文中的轻量 Router 不等于轻量 ontology builder。两者任务难度、输入输出、失败代价不同，需要分别评测。

### Gaps

- 未发现原文承诺“每轮钩子调用小模型做语义归档”的文字，不应将用户自己的方案归给 DeepSeek。
- 未发现原文提供自动本体细分、类别迁移、schema 演化、历史数据重分类的算法与验证。
- 官方宿主当前文档证明可用事件分层，不证明本机安装版本具有相同精确 hook 签名；落地前仍要依安装版本核对。

## 公开原型已经实现了哪些与存储相关的能力

### Takeaway

公开原型的成熟借鉴点是持久任务对象、事务后执行的效果队列、关联 ID 与读取边界；它目前使用 SQLite，并非向量库或自动本体引擎。文章、内部实例和公开原型存在明确差异。

### Cited Findings

- 官方 README 把项目定位为研究原型、不是正式产品，并说明公开版本经过适配，部分文章设计仍未实现。它服务单个 GitHub 仓库，可选飞书入口。来源：[官方 README](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/README.md)。
- 原型使用 `<stateDir>/orchestrator.sqlite`；主数据包括 `trigger`、`disposition`、`trigger_thread`、`thread`、`ticket`、`decision`、`effect`、`outbox`、`kv`。Engine 是领域数据的统一写入者，事务内改状态和入队，外部效果在提交后执行。版本化设置和提示词也存储。读取接口给出可继续解析的 ID，并限制 Worker 只读自己 Ticket 范围。旧记录尚无删除策略、会持续增长。来源：[007 Architecture 的 Persistence、Engine 与 Read resources](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/007-architecture.md)。
- 重启后保留 Session、工作目录、订阅、待处理消息及已读证据；恢复指令要求先检查已有产物再重复外部动作。普通进展和需要人介入的报告分开处理。来源：[003 Execution 的 Failure and recovery](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/003-execution.md)。

### Inferences

- 本项目可以先用关系型存储表达实体、边、证据链接和版本；是否需要独立图数据库，应由查询形态和规模决定，不能因为叫 ontology 就先引入新数据库。
- 每轮派生记录应有稳定任务键及处理版本、输入事件区间、完成状态；允许至少一次投递与幂等写入，便于重试和重建。此为本项目建议，不能描述为 DeepSeek 提供的本体记录方案。
- 领域原件与模型派生层分开后，后续改模型、拆类别、重建索引才不需要改写会话历史；原文引用图对“证据可达性”提供启发，语义本体仍需独立设计。
- 无界历史增长在研究原型中是已写出的限制。Record 方案需要主动决定冷热分层、保留周期、重处理成本与检索范围。

### Gaps

- 本次仅阅读文档与接口说明，未安装或运行 dsh-superagent；不能报告实测性能、可靠性或安全通过。
- 未拿原型默认的终止后台工作、自动重启等策略作为目标项目操作建议。目标项目明确要求保留正常运行的任务，具体恢复规则须遵从目标项目约束。
