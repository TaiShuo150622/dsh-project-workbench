# west 首轮重点复核包

访问日期：2026-11-08 UTC。以下结论已读正文，等待 root 重新打开；不表示运行验证。

## 1. 审批、恢复与外部效果

[OpenAI Agents SDK HITL，固定提交](https://github.com/openai/openai-agents-python/blob/27c75c5f9c5fd957d28c04fb7e9eeacaad4630a9/docs/human_in_the_loop.md)，定位 `Keep approval state on the server`、`Recovering after a crash`：RunState 反序列化不认证快照或提交人；审批不能保证 exactly-once。目标端原子幂等或权威对账仍由应用负责；结果未知时不自动重放。它直接反驳“持久审批快照足以安全重试”。

[Codex 用户验证协议，固定提交](https://github.com/openai/codex/blob/748ab55ca7de0b647d9a7a9d9a8e70e00f28666d/codex-rs/app-server-protocol/src/protocol/v2/user_verification.rs)，定位 `UserVerificationCancelResponse`：ACK 仅确认取消信号，原生工作可能尚未退出，完成效果不回滚。**只适用于该实验性原生用户验证 RPC**，不能泛化成所有 Codex 工具取消协议。

[OpenAI 托管 Agents API 恢复](https://developers.openai.com/api/docs/guides/agents-api/errors)，定位 `Recovery`：stream 断连不确定 turn 最终状态；失败 turn 可能已经改文件或调用外部工具，重试前应查已发生作用。

## 2. 会话、执行与环境必须分开

[OpenAI sandbox lifecycle](https://developers.openai.com/api/docs/guides/agents-api/environments/lifecycle)，定位 `Keep the environment available or stop it`、`Reconnect after a disconnect`：idle 单个事件不足以安全关机；中途断连可能令工具失败但 turn 仍完成；不会自动重启被杀命令。环境控制器应处理签名 webhook，入队后回成功，再读当前状态，不能按过时事件直接启动资源。

[Anthropic Managed Agents 架构原文](https://www.anthropic.com/research/managed-agents)，2026-04-08：session 日志、harness 和 sandbox 分离，harness 可从日志重建；sandbox 故障作为工具错误反馈后可另建。这里的可恢复不保证原进程继续或外部效果原子提交。

## 3. 程序完成、评分通过和产物可取是三个事实

[Claude Workflow runs](https://platform.claude.com/docs/en/managed-agents/workflow-runs)，定位 `Run events`、`Interrupt a session with runs open`：`completed` 只说明工作流结束，线程失败仍可被程序处理后完成；`phase_ended` 不证明通过；`workflow_run.error` 不是终止事件。主线程 interrupt 不结束 workflow run，后者可能继续或暂停。

[Claude Define outcomes](https://platform.claude.com/docs/en/managed-agents/define-outcomes)：独立上下文 grader 按 rubric 评分，达到目标或用完有限迭代后结束。`satisfied` 是评分器输出；产物在 session idle 后可能仍需等待上传才可列出。我们的推断：验收应绑定可取得的产物、验收规则版本与证据，不能仅映射 `idle` 或 `satisfied`。

## 4. 权限和上下文不是同一层

[Claude Managed Agents permission policies](https://platform.claude.com/docs/en/managed-agents/permission-policies)：`auto` 不是人工检查点；自定义工具由应用执行，不受该策略代管。将不可信终端用户内容转为 `user.message` 会使自动评估视为调用方意图；要由应用守住身份与权限边界。

[Claude Code memory](https://code.claude.com/docs/en/memory)：CLAUDE.md 与 auto memory 属上下文，不是强制配置。主题记忆按需读取，索引有启动读取上限。我们的推断：Record 上下文组装不能授予动作权限。

## 5. 员工公开取舍与归属

[Michael Bolin 原始访谈转录](https://www.turingpost.com/p/bolincodex)，2026-03-14，定位访谈正文的 `Repositories in an Agentic World`、`What Is the Harness?`：工具和模型训练分布协同；模型行为判断与宿主 OS 权限限制分层。此条为员工公开个人解释，不是 API 合同。身份交叉依据：[OpenAI 官方 2026-01-23 作者栏](https://openai.com/index/unrolling-the-codex-agent-loop/)标其为 Member of Technical Staff；访谈主持方称其开源 Codex 负责人。未据此断言其截至 11 月仍任同一职位。

[Prithvi Rajasekaran 官方署名实验报告](https://www.anthropic.com/research/harness-design-long-running-apps)，2026-03-24，正文注明 Labs team：逐个消融 harness 组件；模型升级后撤去 sprint 结构，保留有收益的 planner/evaluator。属于署名官方工程报告，不冒充独立个人发布或普适收益证明。

## 6. v0.1.1 新增优先复核

- [OpenAI automatic review](https://developers.openai.com/api/docs/guides/agents-api/sessions/approvals)：核对“Choose a review mode”和“Change the review mode”。默认none不转人工；模式变更要求idle和输入稳定，仍应处理竞态409；root/subagent均适用。
- [OpenAI sandbox security](https://developers.openai.com/api/docs/guides/agents-api/environments/security)：核对“Separate credentials”。托管控制面有应用权限与executor连接凭据区分，不能写成只提供session/runtime；最终用户业务对象授权仍是另一层。
- [Claude managed memory](https://platform.claude.com/docs/en/managed-agents/memory)：核对“Safe content edits”“Audit memory changes”“Redact a version”。已有版本/CAS/审计和历史内容清除；别把这些写成Record独有，也别把正文immutable解读为内容永久不可删。
- [Claude self-hosted memory](https://platform.claude.com/docs/en/managed-agents/self-hosted-sandboxes-memory)：核对“How the worker handles memory”和“Read-only stores and conflicts”，尤其工具成功但同步冲突覆盖且代理不收错；仅适用自托管副本。
- [Claude mirror固定源码](https://github.com/anthropics/claude-agent-sdk-python/blob/2209f2c134fee914c0f75733b631a5fc238ca846/src/claude_agent_sdk/_internal/transcript_mirror_batcher.py#L188)：timeout可能迟到落库故不重试；一般异常另有最多3次尝试；不能写成所有失败都不重试。
- [Rajasekaran全文](https://www.anthropic.com/research/harness-design-long-running-apps)：复核“The architecture”“Removing the sprint construct”“Results from the updated harness”。v0.1.1正文已列公开样例和局限；没有宣称可复现统计基准。末尾QA是取消每sprint检查，不是整个任务只一次检查。

## 7. 供总稿直接核对的状态边界

| 已收到信号 | 不能直接推出 | 应补的关联观察或契约 |
| --- | --- | --- |
| 取消ACK | worker已退出 / effect已回滚 | 停止确认、效果对账各自记录；O12仅验证特定RPC |
| 工具timeout | 目标尚未提交 | A21有取消后IO仍落库的代码解释；未知状态不得自动重复 |
| memory write成功 | 权威store已接受该版本 | A20本地同步冲突反例；需要服务端版本确认 |
| session持久化 | 文件/进程/外部效果可恢复 | 分别声明恢复范围；A01/O10 |
| workflow completed | 必需thread与目标全部通过 | 查看内部失败处理及目标证据；A08 |
| grader satisfied | 人或业务已接受 | 规则版本、可取产物和接受主体；A09；此设计是我们的推断 |
| API身份认证成功 | 当前用户可操作业务对象 | 应用授权入口；O17/A10 |
| 记忆版本被清除 | 所有依赖结论自动失效 | 本轮未核到该契约，不能当产品不支持的证明 |

这些表项中“应补”属于设计推断，不是上游接口保证。固定源码取消注释正确位置为 `user_verification.rs:166–167`。
