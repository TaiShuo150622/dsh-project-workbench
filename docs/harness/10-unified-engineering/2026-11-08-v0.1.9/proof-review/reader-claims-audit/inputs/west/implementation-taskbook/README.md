# W-07 · 从可信入口到 Coding 交付的实施任务书

先读[任务书](可信入口与Coding交付实施任务书讨论稿-v0.1.0.md)，再按 [slice-checklist.json](slice-checklist.json) 冻结具体实施范围。[HTML 阅读版](可信入口与Coding交付实施任务书讨论稿-v0.1.0.html)由 Markdown 生成。

**本批只交付设计。** 首切片 I01 仅做 history 绑定的可信命令入口与正确状态投影，无真实外部发送；其余六片是逐步解锁的提案，均未实施、未验收。没有新增默认实验任务量，没有改变原通用面板产品开发顺序。

首片开工前必须确定可信身份来源及门禁覆盖范围。若只能注入字面量 actor，最多得到入口模拟，不能称认证完成。当前请求去重、状态内核、工作台界面壳可以复用，但不能继承持久性、通用图、真实效果或任意消费可用性保证。

关键输入为固定提交 `7264be10387963f4d575d8688ed8573f4c16c8c4` 的源码，以及[实现精化报告](../../china/record-refinement/REPORT.md)、[独立映射审查](../../proof-review/record-mapping-audit/REVIEW.md)。所有输入身份与散列见 [inputs.json](inputs.json)；最终产物散列见 [SHA256SUMS](SHA256SUMS)，格式/链接检查见 [validation.json](validation.json)。

相对链接按本目录装配到统一研究树后的位置组织。机器清单中的验收项都是 `PROPOSED_NOT_RUN`，没有把研究探针、未来产品测试和当前文档检查混为同一种通过。
