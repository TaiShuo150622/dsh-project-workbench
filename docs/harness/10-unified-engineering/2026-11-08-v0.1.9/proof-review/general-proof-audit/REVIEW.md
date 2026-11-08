# R-03：DAG 与预算 Lean 一般证明的独立模型审查

结论：**两份冻结证明独立编译通过，未发现形式定理错误、结论被直接塞进前提或只能靠空前提成立的问题。** DAG 证明覆盖任意有限前缀上的确定性局部求值；预算证明覆盖所定义六类原子转移组成的任意有限轨迹。它们均比固定小域枚举更一般，但仍是抽象协议证明，不是需求正确性、世界事实或产品实现精化证明。

本轮有两项措辞/表达范围建议：DAG README 将“动态改变依赖”一概排除过窄，更新之间改变读取集合也可能满足现有定理；预算 `ReleaseCertified` 的类型只包含负担数值与金额，不能表达动作/代际绑定。后者 README 已大体限定为外部精化，建议再用精确类型说明消除“已刻画证书协议”的误读。

这是不同模型的独立模型审查与本地 Lean 编译，没有人类审核。未改作者文件、产品代码、首两轮输出，未提交或推送，未调用网络或模型 API。

## 固定输入、编译与公理

输入于 `2026-11-08T07:21:17.773351+00:00` 保存为本线副本，完整清单见 [INPUT_MANIFEST.json](INPUT_MANIFEST.json)。

| 输入 | SHA256 |
| --- | --- |
| IncrementalDag.lean | `b49bd9da7e2627486f75c39212d4d0867890ff88b166cb5a2060e42084746083` |
| DAG README.md | `831ba5400a0689c8c37c9651ed844edf4200fbe3dc97b3594d550e6a7d0e6639` |
| BudgetSafety.lean | `857ff81f5fd9ae82cbfde01f0e227fff8bbb4fb4951c2b2f7e038127ac5b4c1a` |
| 预算 README.md | `4877ae2efbf25742b3c27e926b04c389c036d229a267ae23fc351b00bd105ede` |
| 预算绑定 FORMAL_MODEL.md | `3997acfe5998ef37ec0fdc90f947bd8314f93dafd21b87cb205282da3d61139a` |

使用已提供的 Lean 4.35.0，commit `eb6cafb7290e8bd5f2937522d8d804f58f02bafc`；本线实际二进制 SHA 为 `d1d9c26a539f54fe839d2aa7760bf1ac1dd76a30b26e2c9684bebf2900038fcf`。发行归档来源核验由 root 完成，本线没有重做下载核验。独立编译记录见 [compile_receipt.json](compile_receipt.json)。

| 原证明副本 | 编译结果 | 公理输出 |
| --- | --- | --- |
| DAG | 退出 0，约 4.95 秒，stderr 空 | 主定理为 `propext, Classical.choice, Quot.sound`；完整求值一致性为 `propext, Quot.sound` |
| 预算 | 退出 0，约 5.48 秒，stderr 空 | 所打印五个定理均为 `propext, Quot.sound` |

输出与作者回执一致。源文件没有自定义 axiom、sorry/admit 占位或 native_decide；编译公理列表没有 sorryAx。`omega` 等策略产生内核检查的证明项，并不因此成为外部世界观测器。标准逻辑基础与实际 Lean 工具链仍在信任边界内。

## DAG 定理与 P5 的对应

主定理 `incremental_equals_full` 没有假设局部计算已经等于全量结果。它先证明全量 sweep 的一致性，再从旧一致性、闭包和规则不变推导闭包外相等，最后按扫描长度证明局部 sweep 前缀正确。这条链路真实使用了依赖局部性和拓扑顺序。

### 一般性与前提各自承担的责任

| 内容 | 本轮判断 |
| --- | --- |
| 任意有限 n | n 是未固定的自然数参数，结论对所有 i<n 成立；不是把 n=4 的归约例子当一般证明。 |
| 无限函数域 | Values 使用 Nat→α，但 Topological 保证 i<n 只可依赖 j<i<n；范围外 seed 不会影响范围内输出。 |
| 影响集合 | Closed 要求 selected 对新依赖的后继闭合，可保守多选，不要求最小集合。sameRule 强制所有实质规则变化进入 selected。 |
| 输入完整性 | Local 对任意两状态量化。只有在所有声明依赖一致时输出必一致，才成立；隐藏时钟、权限、外部网络或未声明读会破坏它。 |
| 旧缓存 | oldConsistent 要求旧值已经满足旧规则；对任意陈旧缓存不提供正确性保证。该条件没有预先假设新结果。 |
| 求值函数 | 允许任意确定性函数和任意值类型，不要求单调或仅 AND/OR；证明的是相对于同一新规则全量求值的等价，不另证明这些规则的业务含义正确。 |
| 算法代价 | sweep 扫描整个 0…n−1 前缀，只跳过未选节点的规则求值。未证明 O(影响子图) 总时间，函数式 put 的查询代价和节点计算代价也未建模。README 已明确这一点。 |

Topological/Local 是可检验或需要外部证明的工程义务，不是自动从一个名叫 DAG 的数据结构获得的事实。依赖提取器漏边时，不能套用定理。例如根由 10 改 20、子节点读取根+1，却把 deps 声明为空并只选根，局部值为 `(20,11)`，全量值为 `(20,21)`。空 deps 此时虽然满足 Topological 和 Closed，却不满足 Local。这是完整性前提的必要性说明，不是满足定理假设的反例。

P5 原始“影响不等于失效”命题与本定理不同：本定理支持在影响集内重新计算，而非直接清空。它并未单独证明任意证据 AND/OR 规则、信任规则或撤回来源本身合理；这些应由上层业务语义决定。

### GA01：读取集合可以在两轮之间改变，README 的排除句过窄

**分类：低优先级文案范围修正，不是证明错误。** 位置：`inputs/dag/README.md:40`。

原句把正递归、含否定循环与“动态改变依赖”并列为没有合法当前拓扑假设的情况。实际上定理只要求 **newRules 的完整 deps** 合法、变更规则进入 selected，以及 selected 按该 deps 闭合；它不要求旧规则与新规则读取同一个前驱。

本线不是只声称可能，而是构造并通过了 Lean 实例：

```text
节点0=10，节点1=7。
旧节点2读取节点0+1，旧值11。
新节点2读取节点1+1，新值8。
新依赖只有 1→2；selected={2}；节点0、1保留旧值。
```

在 [witnesses/DagWitness.lean](witnesses/DagWitness.lean) 中，`locality`、`topological`、`closed`、`oldConsistent`、`sameOutside` 均逐一证明，再调用原 `incremental_equals_full` 得到 `changed_read_set_instance`。因此这也证明主定理至少具有一个非平凡、非全选、确实更新值的可满足实例。

建议改成：“单次 sweep 期间规则/依赖变化，或两轮更新后尚未重新建立完整依赖、合法拓扑编号与影响集合时，不能套用该定理。两轮之间改变读取集合，在新图仍满足全部前提时可以适用。”无需修改证明。

## 预算定理与 P13 的对应

`Safe` 同时包含负担覆盖、诚实记账等式与 exposure 上限。单步定理只在源状态假设 Safe，再按六个具体构造证明目标状态 Safe。除 Reserve 的准入守卫之外，没有把目标 Safe 作为合法 Step 的前提。Reserve 检查总额是协议本身必须执行的准入规则，不是循环论证。

### 真实费用字段与各转移

`actualSpent` 是独立字段，Spend 与 Close 增加它；Settle 只把 hidden 转到 settled，不再增加真实消费。等式 `actualSpent=settled+Σhidden` 由初态与具体转移保持，不是将 actualSpent 定义成账本合计后直接宣称正确。

但这里“真实”仍是模型解释：真实系统若出现一个没有映射到 Spend/Close 的消费，或消费超过当前 future，这条世界行为根本不是已证明的合法 Run。Lean 不能靠字段名称证明现实费用没有漏记。README 98–110 已明确该限制，应随定理一并保留。

| 转移 | 证明真正使用的边界 |
| --- | --- |
| Reserve | exposure+cap+extraClosing≤budget；把新收尾义务一同计入，而非忽略新增清理成本。 |
| Spend | cost≤future；hidden 增量等于 actualSpent 增量，future 等额下降，reserved 不动。 |
| Settle | cost≤hidden；配合旧覆盖可推出 cost≤reserved，保证 Nat 截断减法不掩盖减多了。 |
| Release | amount≤future；future 与 reserved 等额减少，hidden 和已花不变。其世界真实性另见 GA02。 |
| Close | cost≤closing；实际消费和结算同步增加。延迟上报的收尾费用必须另映射为普通 obligation，不能偷偷当同步 Close。 |
| Cancel | 预算投影原样保持，不能解除 hidden/future。它是无新成本的取消事件抽象；真实取消操作有费用时须另记 Spend/Close。 |

Run 只由 refl 与 snoc 生成，对任意有限长度归纳；actions 是任意有限列表，Reserve 可继续追加，费用和预算为任意 Nat，没有固定数值枚举上限。结论因此适用于每一个合法有限前缀，不需要任务终止、未来公平调度或最终结算。

该证明是 P13 的一种明确保守协议实现。它没有覆盖所有可能的“满足某种总额不等式”的重新估价、退款、预算下调、币种转换或负担撤回操作。README 明确列出了这些未覆盖转移，没有发现用“任意有限轨迹”偷换为“任意操作都安全”。

### 预算前提可满足且六类转移确有非零轨迹

本线 [witnesses/BudgetWitness.lean](witnesses/BudgetWitness.lean) 构造预算10、初始 closing=1 的合法 Run：

```text
Reserve(cap=5,extraClosing=1)
→ Spend(3)
→ Settle(2)
→ Release(1)
→ Close(1)
→ Cancel
```

末态 `settled=3, actualSpent=4, closing=1`，唯一负担为 `(hidden=1,future=1,reserved=2)`。所有 Step 证据逐项构造，调用原 `from_empty_finite_run_safe` 得到 `actualSpent≤10`。它包含真实消费、未结算负担和未结束工作，不是空动作/零预算/空 Run 的自明实例。

### GA02：ReleaseCertified 没有刻画动作、代际与证书防重放

**分类：已声明外部精化边界的精确补充，低优先级；不反驳算术定理。** 位置：`inputs/budget/BudgetSafety.lean:91–101,123–130,190–198`，README:42、94–106。

类型为 `Obligation → Nat → Prop`，其中 Obligation 只有 hidden、future、reserved 三个数。它没有动作ID、资源、代际、负担版本或证书身份。因此只要两个动作的三个数相等，同一个关系证明即可用于两者。`step_preserves` 的 Release 分支也没有使用 certified 证明来推导算术性质；它只使用旧覆盖、amount 界及字段更新。

本线 Lean 构造了具体类型边界见证：

```text
两个独立列表项 A、B 都是 (hidden=0,future=3,reserved=3)。
numericCertificate(a,k) := a=(0,3,3) 且 k=3。
同一个 certificate 证明先用于 A 的 Release(3)，再用于 B 的 Release(3)。
两步构成合法 Run，两个项都变成 (0,0,0)。
```

`same_numeric_certificate_reused` 由 Lean 编译通过，且不依赖任何公理。它说明不能把此关系称为已实现的、逐动作绑定的证书协议。若世界里只有 A 的未来费用真的解除，B 仍可能花费，那么这个世界状态已不再忠实映射到模型的 future=0；若 B 随后消费，就不满足模型 Spend 的界。故世界可能超支不构成对该合法 Run 定理的反例，而是精化失败。

README 已明确身份不在证明中，且特别承认恒真关系不保证现实负担解除，这些限定基本充分。本轮建议只需补充上面的数值相同复用边界，并称其为“抽象 Release 许可关系；真实性与作用域在精化中提供”。也可将名称改为 ReleaseAllowed，但不是定理成立的必要改动。若以后要验证真实证书协议，再另建包含动作/代际/负担版本的模型；不要为了这个算术引理把整个认证系统搬入。

## 审查见证的执行与证据边界

[build_witnesses.py](build_witnesses.py) 将冻结作者源码原样作为前缀，仅在本线生成副本末尾追加审查实例。两个实例文件均独立编译退出0，约12秒，见 [witness_receipt.json](witness_receipt.json)。DAG 见证有两条 unused simp argument 的风格提示，不影响证明完成；原作者文件编译没有这些提示。

见证并不代替一般证明：它们用于证明关键前提确实可满足、动态读集例外确实存在、证书参数类型确实允许数值复用。一般节点数和一般有限轨迹仍由作者的原定理提供。

## 交接判断

两份定理均可作为限定范围内的一般规格证明交付。建议修正 DAG README 的动态读集表述，并补充预算关系的动作绑定限制；没有依据要求撤销原编译成功结论，也没有发现要靠增加“目标状态已安全”前提才能补好的漏洞。

交付时应并列呈现：形式陈述、可满足前提、实际编译、公理依赖、外部精化义务。尤其不要把 Lean 接受 `Local`/`ReleaseCertified` 的证明参数，写成 Lean 已验证真实依赖提取或真实释放证书。
