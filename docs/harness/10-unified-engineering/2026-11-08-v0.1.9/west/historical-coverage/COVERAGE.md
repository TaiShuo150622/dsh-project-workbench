# 旧讨论覆盖与最小桥接建议

2026-11-08 · W09 · 仅源内研究；主稿输入 v0.1.2

**总体判断：00–07 的主方向已经连接到统一工程，08 浏览器和 09 实时讨论需要补明确的适配边界。** 这不要求扩展首个 Coding 闭环，也不要求新增默认实施切片。浏览器是具体执行/观察能力，实时讨论是带修正的输入路径，仍服务项目工作台、远程执行与长期任务。

## 阅读与覆盖口径

- **本轮全文核读**：实际读取所列文件正文；只确认文档表达，不替文档中的实现宣称作运行验证。
- **本轮选读**：记录实际行区间，未读部分不算覆盖。
- **前轮核读、哈希确认**：延用 W06–W08 已读范围，当前文件 SHA 一致；不是本轮再次全文阅读。
- **索引层覆盖**：只依据 INDEX 的标题、版本、性质和新稿的显式衔接定位主题，未推定该主题下全部条款都已纳入。

[INDEX](https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/INDEX.md) 实际解析为 192 条：00–09 分别 49、5、6、5、8、45、16、5、49、4 条。HTML 画板、PNG 和设计 JSON 均未在 W09 逐页检查。精确的阅读等级、行范围与哈希以 [reading-list.json](reading-list.json) 为准；“主题已连接”是设计覆盖，不是功能完成。

## 旧主题到新阅读包

| 旧主题 / 索引数量 | 本线阅读依据 | 主稿与专题去向 | I 切片 / 有意保留的边界 |
| --- | --- | --- | --- |
| 00 项目工作台与后端 / 49 | 旧任务包仅索引；现有界面/业务源码由 W07 单独核读 | 主稿动机、总体架构；ARCHITECTURE §9–11 | I01 状态、I02 引用、I04 交付。B-01–B-12、会话地图/TUI/布局细节继续留原任务包，不声称全部实现 |
| 01 信息到动作 / 5 | 索引 + DESIGN_RECONCILIATION 的显式衔接 | 主稿工作决策与持续改进；work-improvement | I07。保留目标推进与工作流改善，旧资源数字、旧仓库比较不继承为当前结果 |
| 02 方法、工具面、Workflow / 6 | 索引 + 衔接稿相关表 | 工具发现/接口/授权，工作决策；W05 与 work-improvement | I04/I07。H0 和旧效果门槛仍是历史计划；模板和事前预测是可替换策略 |
| 03 运行底座、Coding、长期资源 / 5 | 旧稿索引；新主稿/架构已选读 | 执行/恢复/资源；固定机制研究与 lifecycle-migration | I03/I04/I06。底座重新评估但未选择；旧 Coding 正文/文件版本差异保留；无内部实现迁入 |
| 04 Record 与上下文 / 8 | Record v0.1.2 前轮选读、哈希一致；其余旧笔记仅索引 | 主稿 Record 三时序；context-evaluation、authority-scope、record-refinement | I01/I03/I05。确定性 S1 与自主记忆方向分开；本体不是首片前提 |
| 05 通用面板 / 45 | overall-discussion 用户路径前轮选读、哈希一致；画板与任务卡仅索引 | 主稿工作台/DAG 段；ARCHITECTURE §9；W06 | I02。稳定实体选中与引用已接入设计；完整 P-01–P-15、TUI、自定义渲染器仍按原计划，未被新路线替代 |
| 06 DAG / 16 | 第一屏收口计划前轮全文核读、哈希一致；其余索引 | 主稿 DAG 与变化传播；dag-proof、FORMAL_MODEL | I02/I04。保留改前看影响；布局、动效、领域提取和通用 AND/OR 精化分别处理；公开摘编不是完整原系统 |
| 07 远程 A/B / 5 | v0.1.1 前轮选读、哈希一致；草图/原型未重看 | 主稿执行/恢复；ARCHITECTURE 场景 B；migration | I06。每会话环境选择已保留；先一个模式/隔离目标；不重用历史 rc.5 兼容结果作当前验收 |
| 08 浏览器/凭据边界 / 49 | 本轮核读 8 份正文、选读 CAPABILITIES；其余索引 | 当前架构只将浏览器列为能力，尚缺以下 B01–B03 具体映射；可接 authority-scope、conformance | I02 的页面对象引用；I04 的未来观察/效果适配；I06 的位置绑定。I01 不增加真实浏览器发送；平台扩张、完整共享控制、Computer Use 暂缓 |
| 09 实时讨论 / 1 | 本轮全文核读 57 行 | 可接 Record 三时序、来源/范围、工作决策与面板；还需 B04 输入修正契约 | I02/I05 的未来输入扩展；ASR、实时分人、多人权限和云/本地全链部署不进入首闭环 |
| 09 CLI 发展史 / 1 | 仅索引 | 历史补充；当前能力以本轮固定源码机制为入口 | 非独立实施切片，不从发展史推断当前产品机制 |
| 09 活跃度面板 / 2 | 仅索引，**明确排除** | 不进入本次新主线或推荐阅读路线 | 用户已排除。工程资源计量/生命周期诊断仍可服务长期任务，不等于恢复该面板产品 |

主稿入口为[统一讨论稿](../../统一Harness工程与形式化基础讨论稿-v0.1.2.md)，架构为 [ARCHITECTURE](../../ARCHITECTURE.md)，旧方向修正为 [DESIGN_RECONCILIATION](../../DESIGN_RECONCILIATION.md)，实施约束为[七片任务书](../implementation-taskbook/README.md)。逐行可机读目标和路径在 [coverage.json](coverage.json)，不复制原 192 份内容。

## 四条最少必要的桥接

**B01 浏览器调用、业务效果与操作摘要分开。** [OPERATION-LOG](https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/08-browser/dsh-chrome/docs/OPERATION-LOG.md) 第 14、21–24、31–44、130–140 行说明日志可关闭、尽力写入、截断/轮转、无防篡改且只覆盖工具 wrapper；`ok` 仅指工具正常返回。它适合诊断，不能直接成为 Record 的权威提交或业务完成证明。[CONTRACTS](https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/08-browser/dsh-chrome/docs/CONTRACTS.md) 第 13–27 行的连接 generation、runId/callId/owner，需在未来适配层显式关联到 history、attempt、action、provider/context/tab 代际及最终参数。连接重建使旧 RPC ID 失效，不等于原操作未生效；页面提交后失联仍保留 unknown，另做目标效果观察。派生摘要保留缺口，关键效果来源另作受范围约束的证据引用，不把秘密或页面正文塞入诊断日志。

**B02 浏览器租约只是局部控制，不是效果围栏。** [LEASES](https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/08-browser/dsh-chrome/docs/LEASES.md) 第 6–10、47–52、89–99 行明确该历史阶段仅有内存基础，未统一接写动作，provider 重启丢失，takeover 后可再次申请。未来接 I03/I04 时，先证明实际写入口覆盖，再把 owner 从可信主体派生，并绑定正确实例/标签页代际。TTL、导航、关闭、用户接管只能改变后续控制资格；不能回滚服务器已接受的请求，也不能单独证明旧发送者停止。[LIFECYCLE](https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/08-browser/dsh-chrome/docs/LIFECYCLE.md) 的资源释放不变量应作为待验证契约；长任务期间是否可清理 profile/capture/下载引用，应由拥有者、在途动作和证据保留要求共同判断。

**B03 权限、能力、页面材料与执行位置分别映射。** [SECURITY](https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/08-browser/dsh-chrome/docs/SECURITY.md) 第 21、27–36、52 行保留页面不可信、目标 origin、截图/下载会话归属和个人本机边界；[CAPABILITIES](https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/08-browser/dsh-chrome/docs/CAPABILITIES.md) 第 101 行明确声明能力不等于当前可用。未来适配器应记录最终目标 origin、对象/参数版本、批准适用范围与执行位置；审批后页面/对象变更须依当前策略重新判定，不能把旧批准移给新对象。数据进入 Record/模型时保留消费者与接收范围，访问句柄不变成授权。项目在远端不表示浏览器、登录态或文件上传也应转移到远端；SECURITY 的本机保证不能自动覆盖 A/B 远程模式。此桥接不改用户已有审批选择，只要求固定实际策略与强制点。

**B04 实时输入先有可修订来源，再进入决定与行动。** [实时讨论稿](https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/09-extensions/discussion/%E5%AE%9E%E6%97%B6%E8%AE%A8%E8%AE%BA%E5%B7%A5%E4%BD%9C%E5%8F%B0%E5%BC%80%E6%BA%90%E6%96%B9%E6%A1%88%E8%B0%83%E7%A0%94-2026-10-28-%E5%85%AC%E5%BC%80%E6%95%B4%E7%90%86%E7%89%88.md) 第 31–43、45–55 行已经区分 User/Person/SpeakerLabel、输入文本版本、临时/稳定状态、参与者陈述/决定/AI 推测以及慢检索。最小新契约是：片段绑定资产位置、版本与采集/接纳时点；改口 supersede 旧断言并更新投影，原依据仍可查；说话人标签或稳定转写本身不授予行动权限。慢检索返回时核对问题版本、当前目标、材料水位与访问范围，过时结果可留作历史，不能覆盖当前决定。建议将它作为 I05 的一种输入夹具；先验证一段输入→修正→晚到结果→当前上下文，不先造语音平台。已发送的外部动作不会因转写修正被自动撤销。

这四条是**本轮桥接提案**，尚未写入主稿、现有 I 清单或产品代码；不增加默认实验组。若未来把浏览器动作选作真实效果样本，需另定其目标和结果契约，不能伪装成 S1 普通 PR merge。

## 历史文档中的待核对点

1. CONTRACTS/LIFECYCLE 写的是 `0.2.21 / 3014180`，LEASES 为 `0.1.98`，CAPABILITIES 为 provider `0.1.87`。它们不是同一次运行的能力快照，不能拼成“当前全部支持”。
2. CONTRACTS 把 runId/callId 关联到 operation log，OPERATION-LOG 的严格字段表却不列它们。当前只能登记**文档映射缺口**，需以后读对应固定源码确认；不能先假设已经有可恢复的调用身份。
3. APPROVAL 早段建议独立审批，§5/§11 又明确记录后来选择 `follow-dsh`；“硬敏感始终问”的目标清单与“部分尚未接入”也并存。应保留版本/决定先后并核查实际路径，不自行恢复更早默认值或新增审批流程。
4. CONTEXTS §6 说尚无 `chrome_verify`，§7 又描述其接口，产物目录的说法也不同。暂不把此文档当真实断言编排已完成的证明；浏览器验证产物及存续范围仍待固定代码/真实回执。

没有浏览器产品源码或运行回执的新检查，因此以上是源内阅读发现，不是当前漏洞、故障或验收结论。其他平台路线、密码管理/跨通道专稿、Windows 队列和性能数字只保留索引入口；没有把未读条款作为新契约依据。

## 最终阅读包的收口方式

核心路线仍为主稿 → 七片任务书 → 一个 Coding 交付 → 远程/长期任务；浏览器按 B01–B03 作为能力专题加入，实时讨论按 B04 作为输入专题加入。旧版本、画板和平台扩张放可选历史入口，不阻塞首片，也不从归档消失。

公司与量化内部材料不在本包输入内；公开稿中出现的通用思想只按其公开边界引用。未读附件保持 `INDEX_ONLY`，哈希只证明文件身份，不证明已经理解或实现其内容。
