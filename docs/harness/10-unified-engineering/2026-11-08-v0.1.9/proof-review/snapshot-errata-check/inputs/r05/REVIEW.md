# R-05：Record S1 精化映射的独立模型审查

**结论：报告的窄域映射和 acceptanceRevision 分析基本准确；RF03 应明确归为表达能力缺口。** 五项轨迹不是五个产品缺陷，也不是已有 AND/OR 算法的五个反例。认证、外部效果和持久性均未被这些合成探针验证。首个桥接可从历史与认证主体绑定的适配入口开始，无须立即改内核。

本轮是模型源码审查，非人类审核。完整阅读冻结 kernel、fixture、探针、REPORT 和内核 README，并核读矩阵与执行回执；没有重复执行20条测试或8条探针，没有修改产品或其他作者文件。输入固定于 [INPUT_MANIFEST.json](INPUT_MANIFEST.json)。

| 主要输入 | SHA256 |
| --- | --- |
| kernel.mjs | `1aa23a691e851aecea009a132d94129271606f8361f179315cf2b2e65f010bd8` |
| record-fixture.mjs | `533c3a671e73d79b1fe7a88a0415a29f50d5acf846b0af9e76b63815239ff8ea` |
| refinement-probes.mjs | `799ffec31c7cb0479638d20499b61087bdcb8864861729d8224c99c01706d401` |
| REPORT.md | `ca004586d30625b55a046a715a47381ca04171eaf677182a0023b7d7b0bf47fe` |

## 五项探针究竟说明什么

位置均指 `inputs/inputs/record/kernel.mjs` 或 `inputs/refinement-probes.mjs`。

| 探针 | 独立判断 | 准确分类与限制 |
| --- | --- | --- |
| RF01 | beginAttempt只存actor/host/session；reserve复制当前task.specVersion，旧attempt可以获得v2动作（kernel:183–188,282–290） | **缺少尝试规格绑定。** 可反驳“attempt不可变地绑定创建时规格”的直接映射；“新attempt必自动退休旧attempt”是另一个待选政策，不是一般模型天然要求。fixture的USER是合成角色，v2修订不是已核实的真人授权。 |
| RF02 | 普通envelope没有streamId，目标task/revision只在被调用实例中查；两实例本地ID碰撞时错路由可修改新实例（118,171–179） | **入口历史绑定义务。** acceptance token的跨历史保护不能外推到普通命令；不是已证明可绕过一个正确认证/路由适配器的漏洞。 |
| RF03 | 第二条同结果观察留在journal，但complete返回旧completion，不新增可单独撤回的支持项（73–88）；探针随后撤回整个completion | **表达能力/精化缺口。** 不是“仅撤回w1后OR算法错误清掉w2”；详见下文。 |
| RF04 | checkAction扫描包括自己的所有占位，dispatch明确排除本action（90–101,293–304） | **接口阶段语义不同。** 直接否定两者是同一guard；把前者当新动作预检查、后者当已有预留的最终准入即可，无须修改既有语义。 |
| RF05 | 首次完成创建available=true，无独立可用性观察或q字段（73–84,342–348） | **投影保证不足。** 不能单靠current-result声称独立观察过的Usable_L(t,q,n)，更不能声称世界可用；不是证明产物实际不可用。后续已知失效不会被重复历史观察重置，这个控制有效。 |

### RM01：RF03 的动作不是来源撤回

探针调用 `withdrawCompletion(completionId, reason)`（probe:88），kernel:236–250 无条件撤回指定当前结论。`reason='first source attribution withdrawn'` 只是文本，不把命令变成 `withdrawObservation(w1)`。即使一个系统真的支持 OR，**显式撤回整个结论**也可能合理地停止使用该结论。

因此，该轨迹不能单独证伪“仅撤回w1时仍由w2支持”的规则。它与源码共同确认的是：S1原生API/投影没有独立支持项、来源撤回命令与支持公式；重复observationRef并未形成原生OR见证。REPORT:64–66和矩阵已部分承认这一点，建议统一称“5项经实际轨迹核实的映射差异”，RF03标记为representation gap。无需把它改标为产品失败，也不能把relatedTaskId当证据支持边。

## 验收：并发令牌与已存决定适用性确实不同

REPORT:90–92的区别正确。tokenFor包含task.acceptanceRevision；新acceptResult要求提交token与当前token完全相同（62–71,269–280），随后accepted记录旧计数，task计数加1。读取current-acceptance则匹配有效completion、result、availabilityRevision（342–348），不比较这个写入计数。

最小源码推导：token计数0 → 新接受写入accepted计数0、task计数1 → 当前验收仍为真；另一新请求重用token0被拒绝。若把“适用”定义为accepted计数必须等于task当前计数，会错误地让刚写入的决定失效。相同requestId的精确重送又是历史收据重放（121–125），不能当新接受或新发送许可。

没有显式artifactVersion也不自动是缺陷：窄域resultId已绑定spec及mergeSha。当前政策是固定代码，不能据此声称支持可变政策、时钟或按q的验收；但不应为补齐通用字段数量而机械改内核。

## 合成证据与适配层责任

fixture中的USER/AGENT/VERIFIER均是对象字面量，SHA与observationRef也是合成数据。kernel只做角色、形状和作用域校验；reference存在不证明远端发送者终止。报告整体明确了这些边界，没有把probe成功升级为真实认证、GitHub效果或C01–C16适配通过。20条选定测试通过是作者回执中的本地结果，本线没有独立重跑或作外部状态确认。

| 缺口 | 可以由适配层解决的部分 | 不能只靠改名解决的部分 |
| --- | --- | --- |
| 历史/主体 | 私有kernel句柄绑定history；从可信会话导出角色与命名空间主体；拒绝错路由 | 裸kernel仍可被绕过时，外层门禁没有完整覆盖 |
| attempt版本/代际 | 适配侧记录创建时spec与执行身份，发送前检查明确的续用/退休政策 | sidecar和kernel更新必须有一致性规则；不能丢弃旧动作迟到证据 |
| OR支持 | 独立证据服务维护公式与来源撤回，向kernel提交经过聚合判断的完成变化 | 仅重复verifyCompletion或改reason文字不等于实现OR；若称S1原生支持，需真正扩展原生契约 |
| 可用性q | 另做有来源的消费观察/当前策略；S1 available仅作窄域条件 | 单主体403不能写成共享markUnavailable；没有q证据不能显示“可下载/可供此人使用” |
| 持久/真实发送 | 适配服务建立持久intent、统一资源权威与目标读回 | 现有同步apply及sent标签本身不提供这些保证 |

## 首个最小桥接切片：受作用域约束的命令入口

仅设计，建议先闭合RF02及actor信任入口，复用RF04的正确阶段语义；不同时加入通用图、费用或新调度器。

| 项目 | 建议 |
| --- | --- |
| 目标 | 一个宿主、一个既有history、一个私有S1实例：每次命令明确属于哪个历史和哪个已认证主体；外部调用者不能直接调用kernel |
| 数据/契约 | 外层请求绑定historyId、requestId及精确payload；可信宿主会话给出(identityAuthority,subject)和允许角色；适配层采用无碰撞主体映射后生成kernel actor。响应标记历史收据与当前查询的区别 |
| 安全约束 | 路由/身份检查先于apply；body中的actor不作为认证来源；不自动把旧重试改写为最新revision；checkAction只表示新动作预检查，dispatch仅产生发送意图；本切片不产生真实外部写入 |
| 验收 | 两history同taskId/revision时错历史请求被拒且内核未调用；伪造user/verifier字段无效；精确重送不生成第二次接纳/发送意图；自己的reservation使checkAction wait但仍可按dispatch规则准入；验收计数增加不废止已存决定 |
| 阻断项 | 尚未选定可信宿主身份来源，或有绕过门禁的kernel入口；未明确history归属和主体到角色的当前政策。没有这些依据，只能标为入口模拟，不能标认证已完成 |
| 后续边界 | 不在此切片宣称RF01不可变attempt、通用OR、Usable_q、崩溃持久性或真实发送已完成；下一切片再选其中一个，保留未支持状态 |

该切片不要求改kernel源码，也不承诺内存边界之外的效果。若选择把sidecar、持久化或外部发送一并加入，应另行扩大验收范围，不能继承本切片的通过标签。
