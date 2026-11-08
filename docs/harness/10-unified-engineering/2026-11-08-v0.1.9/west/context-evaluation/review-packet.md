# west 第二轮交接与复核包

2026-11-08 UTC。状态：资料与协议已整理；原文/指定源码已读；未复现；root独立复核待做。

## 阅读顺序

1. `Record上下文与任务收益评价讨论稿-v0.1.0.md`：六个样本、三组研究内数值对照、评分口径与候选架构。
2. `evaluation-contract.md`：任务验收、分母、实验臂隔离、完整费用及经验转移定义。
3. `protocol.json`：机器可读研究配置，8个候选臂分阶段，72个拟议episode；标记PROPOSED_NOT_RUN。
4. `sources.json`：18个证据条目，其中6项原论文、11项固定作者代码/仓库文档、1项官方员工工程报告。
5. 本文件：独立复核入口和未决项。

这些文件只属于研究交付，不包含数据集、runner、模型响应或产品实现。所有性能数字是原作者报告；本轮模型API调用为0，也未下载模型权重或数据集。

## root须重新打开的重点

| 来源 | 优先复核位置 | 要核的界限 |
| --- | --- | --- |
| [LongMemEval v2](https://arxiv.org/html/2410.10813v2) | 3.3、5.2–5.4、Table 3、A.4 | Top-10 0.670→0.720是同研究按轮存原文、改变key的对比；不是全工作流程收益，也不是当前商业产品评分 |
| [LoCoMo ACL终稿](https://aclanthology.org/2024.acl-long.747.pdf) | Table 5、3.4、4–5、C.1 | 正式10段1,986题；合成+人工编辑；QA、事件摘要与多模态任务分开，不能和7512题旧设置混排 |
| [MemGPT v2](https://arxiv.org/html/2310.08560v2) | 3.1–3.2、6.1.2–6.1.5 | 回忆基线的摘要输入与全历史可检索输入不等价；原文不等于当前Letta产品验证 |
| [A-Mem v11](https://arxiv.org/html/2502.12110v11) | 3、4.1、Table 3、A.5 | 最终采用v11，前期v3只用于发现；链接/演化消融值得研究，但数据版本和按类调k限制解释 |
| [LLMLingua-2 v2](https://arxiv.org/html/2403.12968v2) | Table 1、5、Appendix F | 970/3003是平均输入长度，86.92/87.75是该QA口径；不等于端到端总成本或语义无损 |
| [FlexA-Mem v1](https://arxiv.org/html/2610.33274v1) | 4–6、Table 3、Appendix B/E.1 | 147确认任务4k：64.6/76.2/76.9；6k时间线增量未显著；LME汇总参与设计、每任务重置、模型/预算固定范围 |

三个评分器需直接读固定代码：

- [LongMemEval evaluate_qa.py](https://github.com/xiaowu0162/LongMemEval/blob/9e0b455f4ef0e2ab8f2e582289761153549043fc/src/evaluation/evaluate_qa.py#L24)：lines24–42，更新题容许旧新同现，时间题容忍部分边界偏差。
- [LoCoMo evaluation.py](https://github.com/snap-research/locomo/blob/3eb6f2c585f5e1699204e3c3bdf7adc5c28cb376/task_eval/evaluation.py#L189)：lines189–237，拒答词串与无检索trace时recall默认值。
- [A-Mem test_advanced.py](https://github.com/WujiangXu/A-mem/blob/f9a173dec325d84fcc97e7828775c7b241c33466/test_advanced.py#L129)：lines129–198、421–423，题类prompt、候选式拒答及locomo10默认路径；不能当自由回答任务完全等价。

FlexA-Mem冻结声明另核[manifest](https://github.com/WujiangXu/Flex-Amem/blob/37ba0ce2b4d14f6746e819b6a2d728ad74c364f2/configs/splits/manifest_confirm.json)与[README研究日志说明](https://github.com/WujiangXu/Flex-Amem/blob/37ba0ce2b4d14f6746e819b6a2d728ad74c364f2/README.md)。有任务hash不等于已独立证明完整研发/运行时间顺序。

## 合并时建议保留的判断

- Record的候选价值是减少重复说明、找回精确事实、保持连续工作轨迹和降低返工；这些结果应与读取成本一起测。
- 原始证据可追溯是研究基础；历史全部常驻、自主ontology、图数据库、独立selector均没有在本任务域证明必要。
- 同一模型/输入/工具下比较简单检索与规则时间线，再做标签、链接、演化及自主选择的增量实验；不要一次更换多个组件后给单组件记功。
- 当前可信策略独立提供给全部实验臂。测试旧记忆是否误导模型，不让记忆检索器充当授权来源。
- 短期episode成功不证明跨任务持续学习；经验迁移必须用冻结经验库与未见家族，测负迁移和撤回负担。
- [Rajasekaran工程报告](https://www.anthropic.com/research/harness-design-long-running-apps)只支持模型升级后重测编排收益的案例判断，不能将其写为普遍统计规律。

## 尚未解决

- A-Mem论文7512题与当前默认locomo10的具体对应、原运行数据hash未核实；主文没有照抄其表分数作公平比较。
- MemGPT DMR总评测实例数未在已读段落核定，未猜测填充。
- 原论文及当前仓库快照不自动等于原运行快照；每个代码条目均标paper_version_equivalence未建立。
- 72episode只是初步设计，功效、最小有意义收益、非劣界限、具体模型、总费用及补跑规则尚待冻结。
- 本轮没有中文/真实个人项目用户试验，没有权限层验证、跨用户测试或生产恢复证明。
- 文档结构检查与JSON检查不能替代root重开来源；Mermaid已做结构检查，未宣称完成视觉渲染验收。

## 本线自查

- 主讨论稿检查器：0错误、0警告，9章、3张Mermaid图。
- sources/protocol：JSON可解析、来源ID唯一、固定提交格式、正文引用ID、场景算术与实验臂ID检查通过。
- 无模型API运行、无大数据下载、无凭据读取、无外部消息、无产品代码改动、无commit/push。
- 写入只在west工作树的`docs/research/harness-20261107/west/context-evaluation/`。
