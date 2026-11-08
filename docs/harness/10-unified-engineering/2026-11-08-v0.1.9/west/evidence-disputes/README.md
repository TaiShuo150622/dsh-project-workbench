# W11 · Record 证据争议与修正

正文：[讨论稿 v0.1.0](Record证据争议与修正讨论稿-v0.1.0.md)。[HTML 阅读版](Record证据争议与修正讨论稿-v0.1.0-离线阅读版.html)由同一 Markdown 渲染。

机器入口：[state-definition.json](state-definition.json)；实际离线结果：[check-results.json](check-results.json)；独立模型：[bounded_check.py](bounded_check.py)；来源、输入范围与哈希：[sources.json](sources.json)；材料自检：[validation.json](validation.json)。

双轨/四态表示采用已有思想，不主张新逻辑发明。四态只表达指定评估范围中支持与反对是否存在，不决定世界真值或行动许可；来源根不同也不证明统计独立性。模型不导入或测试 Record 产品，不运行宿主或外部动作；I01 保持原范围。RF03 保持“表达能力缺口”分类。

重跑仅此离线模型：`python3 bounded_check.py`。它在内存中构造合成记录，将结果写到标准输出；不读个人会话、凭据或外部系统。论文 PDF 仅定向读取并计算输入摘要，没有复制进交付包。

操作政策是独立的候选层：查看/搜证与发布分开；四态、版本及水位一致性检查不产生实际行动许可。实际运行含 14 项证据短轨迹、81 个有限赋值、24 个到达排列、240 个异键隔离对、18 项候选操作政策检查和 5 个错误策略反例，各范围分别报告，不相加冒充一般证明。

正文的跨专题相对链接面向整合包；当前只读对应位于 integration 工作树，链接自检按整合目标路径核对。
