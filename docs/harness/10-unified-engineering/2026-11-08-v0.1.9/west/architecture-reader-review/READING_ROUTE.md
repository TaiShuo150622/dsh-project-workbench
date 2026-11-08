# 统一 Harness：一页阅读路线

这项工程希望把一次工作从资料输入一直接到可验收交付，并把值得复用的方法带入下一次工作。项目工作台是人的入口；Coding 方法决定如何预测、检查和纠偏；Record 保留可追溯材料并研究调用前选材；有类型的图帮助理解改动影响；工具与远程执行完成动作；持续改进判断新方法是否真正值得采用。它们可以是独立插件，共同遵守少量工作契约。

下列顺序用于阅读；不更改既有产品开发顺序。链接按本文件装配到统一研究目录后的位置组织。

| 顺序 | 先回答的问题 | 阅读入口 |
| --- | --- | --- |
| 1 | 为什么把这些插件与设想组织成同一个工程？人从中得到什么？ | [主稿](../../统一Harness工程与形式化基础讨论稿-v0.1.1.md)的“动机、总体架构、工作决策与持续改进”。先抓住目标→资料→计划→执行→验收→经验的循环。 |
| 2 | 哪些是原有方向，哪些是本轮修正？ | [既有讨论衔接](../../DESIGN_RECONCILIATION.md)。区分保留的产品目标与修正后的证据、模板和评价规则。历史设计不等于已经实现。 |
| 3 | 用户实际在哪里看、选、讨论和决定下一步？ | [架构 §9–11](../../ARCHITECTURE.md)；按需看[通用面板用户任务](https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/05-panels/docs/design/overall-discussion.md#journeys)和[DAG 改动前影响视图](https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/06-dag/current/docs/design/dag-detailed/07-%E7%AC%AC%E4%B8%80%E5%B1%8F%E6%94%B6%E5%8F%A3%E8%AE%A1%E5%88%92-2026-10-17.md)。面板承接产物和选择，图解释影响，工作台承接任务决策。 |
| 4 | Record 和远程能力具体要解决什么？ | [Record 自主上下文组装](https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/04-memory/Record%E6%99%BA%E8%83%BD%E8%AE%B0%E5%BF%86%E4%B8%8E%E8%87%AA%E4%B8%BB%E4%B8%8A%E4%B8%8B%E6%96%87%E7%BB%84%E8%A3%85-%E6%BA%90v0.1.2-%E5%85%AC%E5%BC%80%E6%95%B4%E7%90%86%E7%89%88.md)的轮后/后台/调用前三条路径；[远程双运行模式](https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/07-remote/DSH-%E8%BF%9C%E7%A8%8B%E5%B7%A5%E4%BD%9C%E5%8C%BA%E4%B8%8E%E5%8F%8C%E8%BF%90%E8%A1%8C%E6%A8%A1%E5%BC%8F%E8%AE%A8%E8%AE%BA%E7%A8%BF-v0.1.1.md)的每会话环境选择。本轮继续研究价值，未把自主本体或远程组合验收当作完成事实。 |
| 5 | 首个闭环、已有成果和下一步分别是什么？ | 主稿“验证与实施路线”；[12-run 最小校准](../evaluation-design-review/README.md)。公开演示任务先接通实际产物、版本、效果与验收，再评价复杂上下文和编排。12 次是测量校准，不能证明收益；成长试验为后续选项。 |
| 6 | 对外能复用什么，哪些主张能经得起核查？ | 主稿“相关工作”的候选贡献与 [ARCHITECTURE §11](../../ARCHITECTURE.md)；精确契约读[形式模型](../../FORMAL_MODEL.md)，证明读[独立复核入口](../../proof-review/general-proof-audit/REVIEW.md)。源码/协议、条件证明、模型检查、真实运行和用户接受是不同证据。 |

只想讨论产品价值，先读 1、3、5；准备实现，读 2、4 后进入 H01–H08 与契约；要复核工程结论，再读 6 和各专题的原始来源。需要找其他历史材料时使用[公开总索引](https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/INDEX.md)，无需先读完整归档。

本轮可交接的是统一设计、来源核查、条件证明、有限反例和未运行的评估方案。已有插件或 Record 输入的代码与历史有限检查另按各自版本看待。下一项产品证据应是一个真实闭环；不会由论文、形式通过或文档数量自动产生。
