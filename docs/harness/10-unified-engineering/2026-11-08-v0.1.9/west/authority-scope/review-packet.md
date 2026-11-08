# 第四轮复核与交接入口

2026-11-08 UTC。状态：相关原文和固定源码静态核查完成；提案/用例未运行。未改 integration、前三轮或产品代码；未提交、推送、调用模型 API、读取凭据或触碰远程任务。

## 先读哪些文件

1. `主体权限与结果可见性讨论稿-v0.1.0.md`：结论、五组证据、消费谓词、委派与派生发布、最终动作审批。
2. `amendments.md`：按 FORMAL 与 ARCHITECTURE 现有章节给精确局部改法，含 C14a/b/c。
3. `contract-cases.md`：15 个未运行的输入/转移/oracle，其中 T01、T02、T05 是最低 C14 组合。
4. `sources.json`：五组原始来源；多个子文档逐一给 URL/路径/定位，分清规范、产品文档和源码机制。

## root 独立复核最短路径

| 入口 | 本次看到的事实 | 需特别保留的限定 |
| --- | --- | --- |
| [MCP 授权安全规范](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/94f4ebc8ecb3764584bc30d5139d57c03692b734/docs/specification/2026-07-28/basic/authorization/security-considerations.mdx) 的 Audience / Privilege Restriction | 凭据限定资源服务；上游另取 token | 不是业务数据 ACL；不是派生摘要发布政策 |
| [MCP schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/94f4ebc8ecb3764584bc30d5139d57c03692b734/schema/2026-07-28/schema.ts#L2276) 的 Annotations；另看 L1900 | audience 是 user/assistant 提示；工具注解不保证行为 | 不能把显示角色当实际 principal 接收名单 |
| [OpenAI HITL](https://github.com/openai/openai-agents-python/blob/27c75c5f9c5fd957d28c04fb7e9eeacaad4630a9/docs/human_in_the_loop.md#L49) 以及 Keep approval state on server | 持久批准按工具类别有不同共享边界；服务端负责认证授权 | 不得称 SDK 只有 call ID 检查：另读 [参数指纹 L165](https://github.com/openai/openai-agents-python/blob/27c75c5f9c5fd957d28c04fb7e9eeacaad4630a9/src/agents/_tool_invocation.py#L165) 与 [差异拒绝 L596](https://github.com/openai/openai-agents-python/blob/27c75c5f9c5fd957d28c04fb7e9eeacaad4630a9/src/agents/run_context.py#L596) |
| [Claude 权限流程](https://code.claude.com/docs/en/agent-sdk/permissions#how-permissions-are-evaluated)、[允许修改输入](https://code.claude.com/docs/en/agent-sdk/user-input#respond-to-tool-requests) | callback 非必经；允许返回修改后的输入 | 我们要求审批覆盖最终输入，不把这个要求冒充已核完整产品保证 |
| [Claude 子代理](https://code.claude.com/docs/en/sub-agents#scope-mcp-servers-to-a-subagent)；同页 Permission modes / Subagent output scanning | 子可有父工具面没有的服务；返回内容不携带用户授权 | 无法由子代理名称/工具列表推导严格能力衰减；动态文档无固定源码证明 |

## 最重要的修订

`Usable` 的自由变量应有消费请求 q；权限撤回、原件副本删除、结果整项撤销发布、证据被反驳四者分开。尤其 C14b 不应写“一个副本删除即所有派生结果都不可用”，需要指定唯一副本和消费对原件的要求。

本轮还指出一个过度约束风险：要求任何消费者都可读全部祖先，会让获授权发布的汇总无法共享；把任何摘要当公共又过于宽松。建议单独记录受权发布决定，保留原文审计可达性与结果消费权的差异。它是待决定的应用契约，当前来源没有替我们决定该业务政策。

## 尚未决定和未验证

未决定：派生发布在源撤权/删除后是否仍有效；旧验收在评审角色改变后是否仍适用；跨主体代办首版范围；策略依赖精确度；可实现执行点撤回的适配器。

未验证：任何新增谓词/用例的产品实现、分布式一致性、语义无泄漏或模型遗忘。只运行文档结构和 JSON 格式检查；其结果不等于这些性质成立。

本轮检查记录：主稿 discussion-draft 检查通过，9 个章节、3 张图、0 错误、0 警告；sources.json 由 Python json.tool 解析通过。以上不是契约测试或来源独立复核。
