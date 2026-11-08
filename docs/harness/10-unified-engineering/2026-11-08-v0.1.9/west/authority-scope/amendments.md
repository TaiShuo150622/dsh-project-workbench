# 对统一稿的具体修订建议

状态：2026-11-08 UTC；供 root 合并，未改 integration。定位基于本轮读取的当前正文，行号仅辅助；请以章节与字符串定位。所有新增定义是提案。

## FORMAL_MODEL.md

### F1：§1 Result、Grant 与 Principal 类型

原 Result 行将产物和“当前可取得、可使用”合成一个状态，建议替为：

> Result：resultId、artifactVersion；不可变结果版本。Materialization 另记 location、generation、存在/删除的观察；ConsumptionDecision 另记 consumer、operation、recipients、policy dependencies。一个访问观察不表示对所有主体可用。

将 Grant 的 `authority` 分清 `issuer`（授权来源）与 Principal 的 `identityAuthority`（身份命名空间）；添加 `grantId, parentGrantRefs, delegableScope`。actor、onBehalfOf 与 reviewer 是三个显式角色，不因恰好由同一个人或同一服务承担而合并。

不建议首版把所有“authority”改成一个复杂统一类；先禁止使用同一字符串字段混装身份命名空间、授权颁发者和凭据接收服务即可。

### F2：§3 Usable 的定义与世界谓词

把 `Usable(t,n)` 改为 `Usable_L(t,q,n)`，q 至少绑定 consumer、operation 与接收范围；详细展开见主稿§4。将 `Usable_W(t,τ)` 同步改为 `Usable_W(t,q,τ)`。依赖边引用 Usable 时必须携带 q 或能确定 q 的契约；否则换执行主体后 readiness 会误用上一人的判定。

追加文字建议：

> 产物存在性、证据支持性、某主体访问权与向某接收范围交付的权利分开计算。单主体 Grant 撤回只影响读取该事实或其派生链的判断；存在其他独立授权时，不自动使结果全局不可用。某副本删除也不证明所有副本消失。判定缺少依据、因策略拒绝、目标确证删除分别展示。

P3 保留非单调结论，但限定为固定 t、q。两主体例子：初始 U(A)=U(B)=true，撤回 A 独立 Grant 后 U(A)=false；在 B 的全部输入未变的条件下 U(B)=true。不能以全局 `result.available=false` 实现此事件。

### F3：§3 P4 Acceptance 的绑定和依赖

`availabilityRevision` 应指明是结果材料化状态修订还是某消费请求的授权/可用判定修订。不能用 A 的访问 revision 驱动 B 的验收失效。

建议将 D 中“主体权限状态”细化为规则实际读取的 `(principal, operation, resourceScope, policyDependency)`。审批者在决定时有权与其后来仍有角色是两个事实；是否让旧决定失效由 Acceptance policy 选择，不能统一从当前失去角色推导历史批准无效。

### F4：§5 AuthValid 与 Approval

追加一个简短定义：

> AuthValid 检查认证 actor、代表关系、有效 Grant 链和本次具体操作。Approval 是对绑定动作版本的决定；可被策略接受为一次许可输入，但不自动成为可跨动作、跨执行器或跨主体复用的 Grant。持续允许应单独表示其范围、来源、有效期和撤回规则。

`DispatchIntent` 除当前权限复查外，比较服务端候选最终版本与批准绑定；参数/目标/接收者/执行身份实质变化，重新规范化、授权和必要审批。允许无语义变化的规范化。已有 OpenAI 指纹检查须如实记作先例，不能称为我们的首创或声称 SDK 只认 call ID。

继续保留现有独立授权服务一致性、准入时/执行点/效果撤销三分法。本轮不建议再引入一个无法兑现的“全局实时撤回”不变量。

### F5：§6 ContextManifest

manifest 增 `consumer, recipients, policyEvidenceRefs, sourceDisclosureLabels, transformationRefs`；这些是本次编译依据，不是执行能力凭证。传入模型的历史批准/工具内容与当前权威策略分通道。

追加：

> 原始证据可读、派生结果可消费和可重新验证是不同操作。由有权流程发布的汇总结果可以在明示范围内使用，无需向每个消费者开放原始资料；未经授权的摘要转换不能扩大披露范围。删除/撤权对派生结果的影响由发布决定的依赖规则决定，不按所有祖先可读与否一刀切。

taint/provenance 仅帮助控制数据流和保留来源，不能由标记完整推出模型语义无泄漏。

## ARCHITECTURE.md

### A1：§4 公共契约表的局部字段

| 段 | 建议增加 | 准入/验证责任 |
| --- | --- | --- |
| Principal | identityAuthority、actor、onBehalfOf、reviewer、grant lineage | 认证通道解析身份；委派检查可委派范围 |
| Scope | 操作、目标服务与对象、接收范围、可委派范围 | 工具可见列表不自动授权；跨服务不透传不匹配的凭据 |
| Inputs | 来源披露范围、必要 transformation/release refs | 检索、摘要和上下文交付均按 consumer 判定 |
| Outcomes | 结果版本、存储副本、按 q 的可用性、证据审计可达性 | 生命周期与主体访问状态分别记录 |
| Context | consumer、recipients、策略观察、历史材料权威类别 | 历史“批准”文字不能成为有效 Grant |
| Effects | 最终参数摘要、executor scope、批准版本 | 改写后重判；当前权限复查不承诺外部回滚 |

### A2：§6 适配器声明

在“工具权限”旁增加几个独立特征，避免用总安全等级：

- 身份和代表关系是否可信传入，或只能得到会话匿名主体。
- 工具限制由何处强制：名称过滤、参数拦截、OS/目标权限；检查发生在改写前还是最终输入之后。
- 审批状态按调用、agent、session、工具类型还是执行器共享；是否存在持久允许和迁移语义。
- 子代理工具面、Grant 链和返回数据接收范围能否分别设置。
- 撤回一致性：缓存/准入时/目标执行点；不可声明时保留未知。

这不是要求每个适配器实现全部特征；需要哪个保证由任务契约决定，未声明与不支持继续分开。

### A3：§7 动作流程三处插入

步骤 2：readiness 计算传入本次消费 q，不复用另一主体的 Usable。

步骤 4–6：规范化及所有效果相关输入改写 → 固定候选 revision → 授权检查/必要审批 → 发送点核对最终绑定与当前政策。注意 callback 内合法改写可能是审批的一部分，但必须记录审批实际覆盖的最终版本或受批准的变换约束。

步骤 8：接纳验证结论后更新共享证据状态；分别重算受影响消费者的可用判定。不要把一个主体无权限的读回升级为全局 ResultUnavailable。

## 适配契约与贯穿场景：C14 拆分

| 编号 | 轨迹 | 应有判定 | 验证入口 |
| --- | --- | --- | --- |
| C14a | A、B 可消费同一结果；只撤回 A 的独立 Grant | A 本次操作不获准；B 输入未变则保持；历史完成和证据支持不被此事自动撤回 | 双主体策略与 readiness 对照，待运行 |
| C14b | 目标权威确认某结果版本的唯一可用副本删除 | 要求读取该原件的消费均不可取得；历史完成保留；独立派生发布按自身依赖判断 | 材料化读回与备选副本条件，待运行 |
| C14c | 原文仅 A 可读；授权流程发布汇总给 B | B 可消费指定汇总；不能读原文；不能声称能够重验全部证据 | releaseDecision 与原文拒绝两条观测，待运行 |

C14b 特意限定“唯一可用副本”和“要求读取原件”；若缺少这些前提，不能声称删除全局关闭所有结果消费。
