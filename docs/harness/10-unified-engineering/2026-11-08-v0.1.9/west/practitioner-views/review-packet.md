# west 第三轮复核入口

2026-11-08 UTC。状态：本线原文审阅和文档自查完成，root独立复核待做。

## 文件与阅读顺序

1. `工程作者观点归属与设计取舍讨论稿-v0.1.0.md`：五项核心署名材料、一项Qwen相关个人补充；观点转为六条候选决策。
2. `sources.json`：12个原始来源，含准确日期/无日期标记、身份支持、短摘录、可支持内容、限制、决策映射。
3. 本文件：独立复核入口与归属限制。

“五项核心”不等于五个私人发言：其中一本人原访谈、三篇官方署名工程文章、一篇联合署名论文。没有把联合论文分拆成作者各自说过的话。

## root重开顺序

| 项目 | 原文入口与定位 | 身份/日期复核 | 易写错的地方 |
| --- | --- | --- | --- |
| V1 Bolin | [原访谈](https://www.turingpost.com/p/bolincodex)，Transcript中Michael回答，尤其What Is the Harness | 采访页2026-03-14；[OpenAI本人文章](https://openai.com/index/unrolling-the-codex-agent-loop/)2026-01-23官方MTS署名 | 编辑的Quick answer不是Bolin逐字发言；产品边界要与模型判断分开 |
| V2 Lopopolo | [原文](https://openai.com/index/harness-engineering/)，repository knowledge与Increasing levels of autonomy | 2026-02-11，同页官方MTS署名 | 本仓库投入形成的自治不能外推所有团队；未使用作者速度估算作验证 |
| V3 Young | [原文](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents)，Testing、Future work、Footnote1、署名 | 2025-11-26同期官方工程署名；[官方webinar](https://claude.com/ko/resources/webinars/outtake-built-cyber-investigator-claude)列Applied AI但无日期 | 两个agent指不同初始提示，不证明两个模型/进程；精确当时职位未独立锁定 |
| V4 Rajasekaran | [原文](https://www.anthropic.com/research/harness-design-long-running-apps)，Removing the sprint construct及DAW phase表 | 2026-03-24，正文明确Labs团队 | 改为每build末尾QA，DAW仍有三轮；作者校准过QA，非无偏通用judge |
| V5 Shi/Zhang/Cui | [v1论文](https://arxiv.org/pdf/2608.25512v1)，首页、§6.1、§7.3、§8；[v1日期页](https://arxiv.org/abs/2608.25512v1) | 2026-08-26；Shi PKU+DeepSeek-AI，Zhang PKU，Cui DeepSeek-AI | 共同作者机构署名不等于独立雇佣记录；热重载不等于任务状态迁移或外部效果回滚 |

## Qwen补充必须保留的标记

[林俊旸个人文章](https://justinlin610.github.io/blog/from-reasoning-to-agentic-thinking/)的日期是2026-03-26。它可作为机制判断和预测来源，但本轮没有同期官方任职证据。

- [当前个人主页](https://justinlin610.github.io/)自述Independent researcher，无可回填当时状态的时间线。
- [2025-01-26官方报告首页](https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen2.5-1M/Qwen2_5_1M_Technical_Report.pdf?file=Qwen2_5_1M_Technical_Report.pdf)证明过往共同作者机构，不证明2026年在职。
- [Qwen3团队公告](https://qwenlm.github.io/blog/qwen3/)为2025-04-29集体署名；它不能为后来的个人文章提供公司背书。

因此V6只作补充，不计“Qwen在职员工观点”。没有用媒体报道补写具体离职日期，也没有为了公司覆盖数量改低标准。

## 可直接交给总设计的争议

1. 模型/工具共同优化与可替换模型：更换模型需要重新测接口使用行为；宿主权限独立生效。
2. 缓存与正确上下文：缓存命中可以优化，但不能延迟当前纠错或授权变更。
3. 长任务交接与完整历史：交接能否继续工作是目标，历史存得多不自动产生收益。
4. 独立评价与评价成本：质量标准需要校准；模型升级后重测频率与独立角色是否仍值得。
5. 插件自进化与恢复：可替换代码、局部状态存活、持久任务进度和已发生外部效果是四个不同问题。

这些是本线归纳，原作者未对我们的方案作任何背书。与上一轮协议衔接即可，不据这些观点直接新增产品组件。

## 自查与交付限制

- 主稿检查器：8章、3图，0错误、0警告。
- JSON、来源ID、引用ID、视图到来源/决策映射及每来源短摘录长度检查通过。
- 所有精确职务缺口在主稿和JSON中保留；无日期身份来源没有伪造日期。
- 未运行模型/API或产品、未改前两轮、未读凭据、未commit/push。
- 写入仅限west工作树的`docs/research/harness-20261107/west/practitioner-views/`。
- 结构检查不能替代root复核；未宣称完整形式证明审计或视觉渲染通过。
