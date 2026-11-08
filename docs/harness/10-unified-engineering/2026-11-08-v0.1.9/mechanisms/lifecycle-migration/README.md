# M-05：长期任务跨版本续接

本目录是独立研究增量，只写候选迁移契约和未运行协议；没有迁移器、runner、真实服务或产品实现改动。

阅读顺序：

1. [长期任务跨版本续接讨论稿 v0.1.0](长期任务跨版本续接讨论稿-v0.1.0.md)：六层兼容边界、官方机制、有限支持期与退役路线。
2. [contracts.json](contracts.json)：MC01–MC08 的前置冻结、后置条件和可观察证据。
3. [fault-scenarios.json](fault-scenarios.json)：LM01–LM06。全部 PROPOSED_NOT_RUN，actual_execution=false；参数 profile 仍待实验环境冻结。
4. [sources.json](sources.json)：6 组官方来源、固定提交、阅读覆盖和限制。
5. [validation.json](validation.json)：仅文档结构、JSON、ID 和本地链接检查结果；不代表宿主集成或场景运行。

来源范围：Temporal 文档提交 3fcf3f34596030d06979e9e3c68ab4964900b4a9；DBOS 文档提交 d280ec8f513ecfd39f68784ce598d28832d4557e；Cordis arXiv v1 的 §7.3；DSH fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159 的 Fiber 生命周期切片。DBOS Python/TypeScript 文档是一个机制的配对核对，未外推所有 SDK。

本轮重读 Cordis PDF 79–80 页及固定 Fiber 681–746 行；全文证明与更广实现映射的既有覆盖在 [上一轮阅读说明](../cordis-boundary/READING_COVERAGE.md)。Temporal 两篇与 DBOS 两种 SDK 升级文档完整阅读；Kubernetes 文档只读前 62 行概念部分。没有运行第三方代码、连接服务、调用模型、提交或推送。

关键口径：协议 SUCCESS 可以表示正确拒绝或暂停，不能计为业务迁移完成；UNKNOWN 不会因插件卸载、worker 退役或索引更新而自动消失。旧 worker 退役、补丁移除和归档制品到期是不同判定。

HTML 是讨论稿的静态阅读辅助。已生成并检查基本结构；没有在浏览器中做视觉验收，图的布局仍应在正式发布前查看。

