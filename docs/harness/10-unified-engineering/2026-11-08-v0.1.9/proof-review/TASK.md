# R-01 形式模型异模型审查

- Depends-On: root P1–P15 和架构冻结快照
- Verify: 逐条列出假设、反例、证明缺口；记录审查快照 SHA256
- Scope: 只写 docs/research/harness-20261107/proof-review/ 下的审查报告；inputs 只读。
- Do not: 不改产品代码/历史稿/其他工作树，不提交，不推送，不部署。
- Independence: gpt-6-astra 独立上下文；这是不同模型的批判性审查，不是机械证明。

检查 inputs/FORMAL_MODEL.md 与 ARCHITECTURE.md。寻找量词、时钟、知识/世界混淆、并发原子边界、预算预留、AND/OR 撤回、验收版本和组合性中的真实反例。区分错误命题、缺失假设、未落地工程条件和可接受取舍。不要制造不适用要求。提出可手工复查的最短反例与修订命题。
