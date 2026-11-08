# 统一 Harness 工程研究 · 阅读入口

第一次打开建议先读[成果导读与五项待决策事项](START_HERE.md)，术语可查[中文速查](west/semantic-glossary/GLOSSARY.md)；本页保留全部专题和复核入口。

这批材料把项目工作台、Coding、Record、DAG、远程执行与工作方式改进放在同一套工作语义下讨论：**目标有版本，行动有权限，结果有证据，未知效果保留责任，复杂策略用实际收益判断是否采用。** 用一个小的 Coding 交付闭环检验这些边界；原产品顺序仍为完整通用面板 P01–P15，再接工作台 B01–B12，研究切片不自动替换它。

这是 2026-11-08 七小时研究窗口中的本地研究集，当前主稿为 **v0.1.9**。这里的形式证明和有限检查不等于产品已经实现、发布或通过真实宿主验收。工作台/Record 输入固定在 `7264be10387963f4d575d8688ed8573f4c16c8c4`；后续分支变化不会自动改变本轮结论。最终导出与检查状态见交付回执；研究窗口曾因执行额度限制中断，未完成支线不计入已验证成果。

## 先读哪几份

| 顺序 | 材料 | 阅读目的 |
| --- | --- | --- |
| 1 | [一页决策摘要 v0.1.1](west/decision-brief/MEMO-v0.1.1.md) | 先看建议保留什么、复用什么、用什么判断投入价值 |
| 2 | [贯穿例子](west/worked-example/EXAMPLE.md)，再读[统一讨论稿 v0.1.9](统一Harness工程与形式化基础讨论稿-v0.1.9.md) | 先以假想 Coding 交付理解路径，再看统一对象、组件关系和主要结论；例子未运行 |
| 3 | [产品决定与八问导览](west/design-continuity/旧设计决定与统一Harness衔接讨论稿-v0.1.0.md)，再读[七个研究验收切片](west/implementation-taskbook/可信入口与Coding交付实施任务书讨论稿-v0.1.1.md) | 分清原产品顺序、阶段 A 冻结和新语义验证；29 项检查仍是提案 |
| 4 | [证据与状态索引](EVIDENCE.md) | 区分证明、有限模型、源码探针、外部作者结果和未运行计划 |
| 5 | [最小评估 v0.1.1](west/evaluation-design-review/最小评估与可证伪价值讨论稿-v0.1.1.md) | 看怎样用 12 次校准暴露观察链问题；尚不能宣称收益 |

主稿是当前阅读入口；旧 v0.1.0–v0.1.8 保留修订历史。`inputs/`、`historical-inputs/`、`repair-inputs/`、`source-inputs/` 保存审阅或复跑时的固定输入，其中的相对链接有些只在原目录成立，不能拿它们代替当前导航。各专题自己的版本号独立，不与主稿强行对齐。

## 按问题继续读

| 问题 | 主要材料 | 需要一起看的边界 |
| --- | --- | --- |
| 各模块究竟共享什么 | [架构工作稿](ARCHITECTURE.md)、[可信入口路径](west/trusted-entry-map/MAP.md)、[既有方向衔接](DESIGN_RECONCILIATION.md)、[旧主题覆盖与边界](west/historical-coverage/COVERAGE.md) | 共享身份、契约与证据；没有决定重写宿主或从零实现全部组件 |
| 后期契约怎样进入实施路线 | [路线收敛说明](ROADMAP_CLOSURE.md) | 保留分支依赖，内容处置、迁移和覆盖按实际操作触发，不扩大 I01 |
| 第一版是否变得过于沉重 | [采用成本反方备忘](mechanisms/adoption-cost-review/MEMO.md) | 按具体操作选择必要保证；不能绕过保护，也不要求每次编辑启用完整协议；采用成本尚未实测 |
| Record 如何用于上下文 | [上下文与任务收益](west/context-evaluation/Record上下文与任务收益评价讨论稿-v0.1.0.md) | 三条时间路径、实际上下文控制、完整成本；复杂记忆收益未测 |
| 现有 Record 与统一模型差多少 | [修正后的映射报告](china/record-refinement/REPORT-v0.1.1.md)、[修正说明](china/record-refinement/README-current.md) | 20 条既有测试和 8 个探针；RF03 是表达能力缺口，非 OR 算法反例 |
| 结果可用性和权限如何区分 | [主体权限研究](west/authority-scope/主体权限与结果可见性讨论稿-v0.1.0.md) | 消费者、操作、接收范围及派生发布分别判断 |
| DAG 如何处理更正与撤回 | [形式模型 P5](FORMAL_MODEL.md)、[DAG 一般证明](dag-proof/README.md) | 完整读取依赖与无环前提；影响范围不等于全部失效 |
| 支持和反对证据同时存在怎么办 | [四态与操作政策](west/evidence-disputes/Record证据争议与修正讨论稿-v0.1.0.md)、[独立集合核查](proof-review/evidence-dispute-audit/REVIEW.md) | 证据状态、覆盖判断、完成支持和操作权限分开；不能用自报 complete 补隐藏反证 |
| 什么范围可以称为覆盖完整 | [有限声明域覆盖契约](mechanisms/coverage-contract/有限声明域覆盖契约讨论稿-v0.1.0.md)、[契约与例子审查](proof-review/coverage-example-audit/REVIEW.md) | 固定域、切点和逐项处理收据；合法摘要与实际原文输入分开；纸面提案未实现 |
| 删除或更正后怎样避免旧内容复活 | [内容处置与重处理契约](mechanisms/retention-replay-contract/CONTRACT.md) | 撤权、删除与证据资格分别处理；旧 worker 和恢复路径按处置水位检查，四见证未运行 |
| 恢复为何不能直接重试 | [适配契约与场景](适配契约与贯穿场景讨论稿-v0.1.1.md)、[效果模型](formal-spec/README.md) | 幂等、fencing、期限、取消与对账分别声明 |
| 收到消息为何不等于存好了 | [持久边界研究](mechanisms/durability-boundary/持久状态与发送效果边界讨论稿-v0.1.0.md)、[接纳模型](formal-spec/RELAY_README.md) | 内存命中、目标耐久确认、sent 标记各自成事实；真实宿主故障未复现 |
| 长任务如何跨版本继续 | [生命周期与迁移](mechanisms/lifecycle-migration/长期任务跨版本续接讨论稿-v0.1.0.md) | 历史解码、重放、接管、未来授权、旧效果解决不能互相替代 |
| 如何既推进工作又改进方法 | [自主推进与工作改进](mechanisms/work-improvement/自主推进与工作方式改进讨论稿-v0.1.0.md) | 有限候选、明确查询用途、已采纳义务、留出反馈及全部费用 |
| 长任务何时结束或交接 | [推进与终止条件](china/progress-conditions/自主推进与终止条件讨论稿-v0.1.0.md)、[独立模型审查](proof-review/progress-audit/REVIEW.md) | 有限停止、最终验收、服务窗口、责任接纳分开；公平性没有期限保证 |
| 换执行者后旧责任和费用去哪了 | [接管研究 v0.1.1](proof-review/handoff-composition/责任接管与负担连续性讨论稿-v0.1.1.md)、[独立复核](china/handoff-audit/REVIEW.md) | 同预算换 owner 保留旧负担；跨预算有限模型 R=0，仅终态观察授权入模 |
| 不同协议的完成能否互译 | [MCP/A2A/Native 适配契约](mechanisms/interop-contracts/跨宿主协议与有损适配契约讨论稿-v0.1.0.md) | 保留提供方、版本、声明范围及 loss/unknown；六个见证未运行 |
| 如何释放界面资源又保留长任务 | [资源归属与生命周期 v0.1.1](resource-lifecycle/资源归属与环境生命周期讨论稿-v0.1.1.md)、[条件审查](proof-review/resource-audit/REVIEW.md) | 费用、占用、速率、保留、期限分别计量；共享物理分配和 token/代际单列 |
| Cordis 的保证到哪里 | [组合与外部效果边界](mechanisms/cordis-boundary/Cordis-组合与外部效果边界讨论稿-v0.1.0.md) | 可恢复内部状态与外部 emission 分开；未来设想不是现成功能 |

## 公司、开源项目与公开观点

- [OpenAI、Anthropic 与西方产品机制](west/西方Harness机制核查讨论稿-v0.1.1.md)：产品、SDK、托管服务和代码分别标记，不把同一公司的不同层混为一种能力。
- [DeepSeek、腾讯、Qwen 与中国作者讨论](china/中国Harness机制核查讨论稿-v0.1.0.md)：固定源码、官方产品文档、研究原型与有身份依据的公开观点。
- [代表性开源机制与反例](mechanisms/机制对照与反例讨论稿-v0.1.0.md)：从具体调用及状态边界理解恢复、工具、图与资源。
- [署名工程作者观点](west/practitioner-views/工程作者观点归属与设计取舍讨论稿-v0.1.0.md)：每条保留作者、日期与归属依据；个人文章不自动代表公司立场。
- [按主题组织的来源入口](china/consolidated-sources/SOURCE_INDEX.md)：先按问题选原文，再查原目录 SHA 与 JSON pointer；冻结于 08:35:43 UTC。后续三个固定 DSH 文件的 root 阅读另见 [补充复核](ROOT_SOURCE_REVIEW_5.json)，不追改旧索引计数；完整后续入口见[来源增补](SOURCE_UPDATES.md)。
- [增补主题与联合地址索引](china/final-sources/SOURCE_INDEX.md)：冻结于 09:49:56 UTC，连接可信入口、推进条件、争议证据、MCP/A2A、资源及 W12 沿革；289 个精确地址键不是 289 篇独立文章，后续 W13、M10/M11/M12、C13 等输入另列于来源增补。
- [来源目录审查](china/evidence-catalog-audit/README.md)：说明条目、URL、引用位置和实际读取范围为何不能互相当作篇数或覆盖率。该审查是固定时点快照，新增专题另有自己的来源册。

## 对外介绍的简版

[登记简介与合作想法 v0.1.2](china/public-brief/登记文案-v0.1.2.md)按“个人插件作者为主、附带团队探索”整理项目工作台的方向、当前成果与希望讨论的支持。它是待讨论文案，未填写或提交表单；成果只采用已取得的研究证据，不把待做适配写成已交付功能。

## 复核入口

[形式模型](FORMAL_MODEL.md)定义自然语言命题和假设；[证据索引](EVIDENCE.md)连接实际程序、日志和审查；[复跑说明](REPRODUCE.md)给出工具版本及最短执行路径。研究脚本只检查声明模型或隔离输入，不接真实外部效果。

编号各有范围：P1–P15 是形式命题，P01–P15 是历史面板任务卡；H0 是早期方法试点，H01–H08 与 I01–I07 是本轮研究验收切片。阅读和实施时应同时带材料名称，避免把同字母编号当成一条连续排期。

`*_PASS_MANIFEST.json` 记录每次从研究线复制文件时的哈希，属于历史接收记录；后续编辑阅读页后，它们不再等同最终包的完整性清单。最终导出另给文件清单和派生转换映射。原始回执保留本地，分享副本如替换个人路径，会同时标注原始与派生 SHA，不伪装成未变的原件。

本轮没有修改产品行为、部署服务或新增公开发布；公司项目、量化实现/数据、凭据和私人会话不进入阅读包。旧公开讨论中的历史方案只作为来源与设计沿革，不自动升级为当前实现事实。
