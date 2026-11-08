# M08：跨宿主协议与有损适配契约

本轮只读官方协议与固定工作台源码，形成有限的适配契约提案。未实现 MCP/A2A 桥，未连接任何真实服务，也未运行这些映射案例。

1. 先读 [讨论稿 v0.1.0](跨宿主协议与有损适配契约讨论稿-v0.1.0.md)。
2. [mapping.json](mapping.json)：9 条映射规则，包含能力、身份、完成、取消、恢复、历史、产物、授权和组合损失。
3. [acceptance.json](acceptance.json)：6 个 PROPOSED_NOT_RUN 见证，actual_execution=false。SUCCESS 是映射守住证据边界，不是业务完成。
4. [sources.json](sources.json)：10 份固定源码切片/规范文件，带 URL、作者机构、日期、SHA-256、读取范围、主张及限制。
5. [validation.json](validation.json)：本地结构与引用检查结果；不代表 wire-schema 或真实协议验收。

核心结论：MCP completed 可以包含工具级错误，A2A COMPLETED 是提供方任务成功声明，工作台 completed 是本地 accept 转移。取消请求确认、提供方终态、外部效果解决分别保留。纯翻译不提升证据；新增观察必须保留新来源。

## 固定版本与阅读覆盖

| 对象 | 固定点 | 实际阅读 | 未读/未执行 |
| --- | --- | --- | --- |
| MCP 核心 | 2026-07-28；94f4ebc8ecb3764584bc30d5139d57c03692b734 | Streamable HTTP 的请求/流/取消/兼容段，完整 cancellation 页，authorization 的作用域与 token 段 | 非全规范审查；未跑 SDK/服务器；未审核完整 OAuth 链 |
| MCP Tasks | 2026-07-28 官方扩展；cc9aaac1047a9440b07486e38f37060bbebeef4c | capability、tools/call、status/result、durable creation、get/update/cancel、安全段 | 未验证任何 SDK 的版本覆盖或部署能力 |
| MCP 旧 Tasks | 2025-11-25 页面，同 core snapshot | experimental 与 requestor-directed 导言 | 未把旧版全部方法混进新扩展 |
| A2A | 正式 v1.0.1；3303592588e388e62e0f69f701af531d2f4e3991 | spec §3.1–3.7 相关操作/版本/历史；§7.6 授权；§13.1；proto Task/Part/Role/Message/Artifact/状态/服务 | 未全读所有 HTTP/gRPC 示例；未运行 SDK；未宣称服务可用 |
| A2A 旧版 | v0.3.0；8d57eba286de756176892518a8fc39b0ac2ccefb | §7.9 名称与恢复边界，仅作版本对照 | 非全旧版兼容审查 |
| 工作台真实适配层 | 7264be10387963f4d575d8688ed8573f4c16c8c4 | Native 全文件；Projects report/action/flush 切片 | 本轮未运行产品或重跑 M07；没有 MCP/A2A 产品适配实现 |

MCP 当前 Tasks 是官方版本化 extension；旧 2025-11-25 页面才明确标 experimental。A2A 文档版本 1.0.1 的 wire version 是 1.0。当前 moving main 与正式发布固定点分开。规范发布不等于目标宿主已经支持。

## 结果边界

- 映射案例是 claim 层合成观察，不是假 runner，也没有声称输入已通过完整协议 wire schema。
- [M07](../relay-code-probes/README.md) 曾运行固定方法加可控 fake，只支持条件控制流结论；不能转写成本轮互操作实现或真实 DSH 集成证明。
- [M06](../durability-boundary/README.md) 的持久状态/效果边界继续适用，本轮不重复 TTL 或崩溃模型。
- HTML 是生成的阅读视图；未做浏览器视觉验收。JSON 校验与讨论稿结构检查不核实规范实现正确性。

后续执行须另行冻结实际 adapter、能力 profile、观察期限、保留期、效果 oracle 与授权绑定，不自动启动真实网络实验。
