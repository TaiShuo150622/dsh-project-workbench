# P13 预算安全的一般 Lean 证明 v0.1.0

Lean 4.35.0 已检查通过：对**任意长度的有限动作列表、任意自然数预算与费用、任意有限合法轨迹**，保持逐动作未结算负担覆盖、诚实记账等式和 `E ≤ B`，从而推出模型中累计真实消费 `actualSpent ≤ B`。这不是继续增加枚举范围，也没有固定动作数或固定轨迹长度。

该结果是一个明确协议的条件性安全定理。实际工具、账单、释放证书、并发存储和收尾费用必须正确映射到协议；Lean 没有验证生产实现或外部证据。

## 文件、输入与复跑

- [BudgetSafety.lean](BudgetSafety.lean)：定义、单步保持证明、任意有限轨迹归纳及 `#print axioms`。
- [compiler.stdout.txt](compiler.stdout.txt)、[compiler.stderr.txt](compiler.stderr.txt)：最后一次完整编译的原始输出。
- [execution_receipt.json](execution_receipt.json)：退出码、工具版本、源文件及日志散列。
- [lean-toolchain.json](lean-toolchain.json)：root 下载核验的官方发行工具元数据副本。
- [inputs.json](inputs.json)、[输入规格](inputs/FORMAL_MODEL.md)：P13 工作稿读取快照。
- [SHA256SUMS](SHA256SUMS)：包括源文件、回执在内的交接文件散列。

在本目录执行：

```bash
__LOCAL_HOME__/Documents/Codex/2026-11-06/zh/work/harness-seven-hours/tooling/lean-4.35.0-darwin_aarch64/bin/lean BudgetSafety.lean
```

使用的是官方 Darwin arm64 Lean 4.35.0，commit `eb6cafb7290e8bd5f2937522d8d804f58f02bafc`。只导入 `Std` 与 Lean 核心的 `Lean.Elab.Tactic.Omega`；没有 Mathlib、Lake 依赖解析或新增安装。

规格工作树 HEAD 为 `7264be10387963f4d575d8688ed8573f4c16c8c4`，但读取的是尚未提交的工作稿，实际身份以文件 SHA-256 为准：

`3997acfe5998ef37ec0fdc90f947bd8314f93dafd21b87cb205282da3d61139a`

没有修改前两轮材料。本目录的输入快照对应这次一般证明，不替换前一轮有限模型使用的较早快照。

## 状态量各自表示什么

| 层 | Lean 字段 | 含义 |
| --- | --- | --- |
| 每个动作负担 | `hidden` | 已真实消费，但尚未转入结算账的费用 |
| 每个动作负担 | `future` | 仍可能产生的未来消费上界 |
| 每个动作负担 | `reserved` | 账本为该动作保留的未结算负担额度 |
| 全局 | `settled` | 已结算累计费用 U |
| 全局 | `actualSpent` | 独立累计的真实消费 X；发生消费时增加，单纯结算时不增加 |
| 全局 | `closing` | 剩余收尾预留 C |
| 全局 | `actions : List Obligation` | 任意有限个逐动作负担；Reserve 可以追加新项 |

动作身份和业务授权不在本证明中。列表中的每个位置代表一个独立计入的负担；实际适配必须将所有费用源纳入，不能因任务 ID 相同或一次重试而漏掉一项。

定义：

```text
Covered(actions)  := 每个 a 满足 a.hidden + a.future ≤ a.reserved
HonestAccounting  := actualSpent = settled + Σ hidden
E                 := settled + Σ reserved + closing
Safe B s          := Covered ∧ HonestAccounting ∧ E ≤ B
```

`actualSpent` 是独立状态字段，**不是定义成** `settled + Σ hidden`。该等式先在初态成立，再由每种转移推导保持。Spend 与 Close 才产生真实费用，Settle 只重新分类已经发生的费用，避免把“收到一张账单”误当成再次消费。

## 合法转移与真正使用的前提

下表中 h/f/r 表示被选中列表项，U/X/C 表示全局字段。其他列表项保持原样。

| 转移 | 前提 | 更新 | 不把哪些结论当作前提 |
| --- | --- | --- | --- |
| Reserve(cap, extraClosing) | `E + cap + extraClosing ≤ B` | 追加 `(0,cap,cap)`；`C += extraClosing` | 不假定结果状态 Safe；由新项与准入式推导 |
| Spend(k) | `k ≤ f`，这次真实消费受未来上界约束 | `X += k; h += k; f -= k`；r 不变 | 不因费用尚未上报就释放 r |
| Settle(k) | `k ≤ h`，账单对应已经发生的费用 | `U += k; h -= k; r -= k`；X 不变 | 不预设新覆盖或新 E；由旧覆盖与该界推导 |
| Release(k) | `k ≤ f`，且有 `ReleaseCertified a k` | `f -= k; r -= k`；h/U/X 不变 | 不从取消、断连或父进程退出推出证书 |
| Close(k) | `k ≤ C` | `X += k; U += k; C -= k` | 不把新 E≤B 直接写为转移前提 |
| Cancel | 无费用解除前提 | 预算投影不变 | 不能凭取消消除 hidden 或 future |

所有数量为自然数，因此证明还显式处理减法的截断语义。Spend/Settle/Release 的界和旧覆盖足以推出需要的减数界；没有把普通整数运算直觉当成自然数减法结论。

Reserve 同时包含 `extraClosing`，因此新任务增加必要收尾义务时也必须占用预算。Release 是保守的充分协议：只把有证据解除的未来负担与等额预留一同减少，不尝试证明任意重新估价或释放闲置裕量的策略都安全。

## 证明链路

1. `covered_append`、两个总和 append 引理，允许在任意 `pre ++ action :: post` 上定位及替换一项。
2. 三个局部引理分别从旧 `h+f≤r` 以及对应消费/结算/释放界推出新覆盖。
3. `step_preserves` 分别检查六类转移，推出新的逐动作覆盖、真实记账等式和 E 上界。只有 Reserve 的前提包含总预算准入式；其他转移没有以目标 Safe 作为公理。
4. `run_preserves` 对 `Run` 的有限构造归纳。轨迹可以任意长，Reserve 可以任意多次，没有枚举上限。
5. `hiddenTotal_le_reservedTotal` 对任意动作列表归纳。配合记账等式和非负 C，推出 `actualSpent ≤ E`。
6. `finite_run_budget_safety` 合并上述结果，返回覆盖、诚实记账、`E≤B`、`actualSpent≤B`。`from_empty_finite_run_safe` 给出 U=X=0、空动作列表、初始收尾预留不超过预算的常用入口。

这是每个有限前缀的安全结论，不要求所有任务最终结束。它没有证明公平调度、最终结算、最终目标完成，也没有用这些活性假设掩盖尚未解决的费用。

## 公理与信任边界

最终编译输出中，五个主定理依赖都为：

```text
[propext, Quot.sound]
```

- `propext` 是 Lean 的命题外延性：逻辑等价的命题可以作为相等命题使用。
- `Quot.sound` 是 Lean 商类型的基础规则：关系等价的元素在商类型中相等。

没有自定义公理，没有未完成证明占位，没有 `native_decide`；输出中没有 `sorryAx` 或 `Classical.choice`。`omega` 生成由 Lean 内核检查的证明项；本轮仍信任所使用的 Lean 内核、标准库定义及已核验工具链。发行包散列匹配证明工具包内容身份，不证明一个业务系统已经满足定理前提。

`ReleaseCertified` 是对所有证明量化的参数关系，**不是新增逻辑公理，也不是已经验证过的认证服务**。Step.Release 要求调用者提供该关系的证据，但本文件没有从 Cancel 构造它，也没有认证外部证书。若部署把这个关系草率实现为恒真，纯算术定理仍只描述更新后的模型字段；它不能保证真实的未来费用已消失。这个映射必须单独验收。

## 与真实实现之间尚缺什么

| 必要映射 | 本证明做了什么 | 仍需工程验收 |
| --- | --- | --- |
| 所有真实消费都被捕获 | X 在 Spend/Close 增加，h/U 对应更新 | 真实账单、后台存活、重试、子任务和费用延迟不能漏记 |
| 未来成本确有硬上界 | Spend 的费用不得大于 f | 预测均值不是上界；价格、计价单位和工具行为需要约束 |
| 结算诚实 | k 必须来自已有 h | 账单身份、去重、部分结算、乱序和重放需要适配 |
| Release 的事实正确 | 只减少被认证解除的未来项，保留 h | 认证来源必须排除迟到或继续产生费用；取消信号不足够 |
| 收尾负担有覆盖 | Reserve 计入新增收尾预留；Close 在同一步实际消费并结算 | 若收尾费用也会延迟上报，应先进入普通 obligation 的 hidden；不能提前扣 C 而不记账 |
| 更新有原子性 | 一个 Step 是一个原子状态迁移 | 并发准入、持久化、崩溃恢复和跨宿主一致性尚未证明 |
| 单位与初态可信 | 任意 Nat 固定计价单位，初态满足 Safe | 小数费用要有保守编码；旧成本和旧负担不能在恢复时清零 |

本证明不自动覆盖证据撤回后的费用重新估价、退款、负价格、多币种换算或预算下调。若真实系统需要这些操作，应增加明确转移并重新证明；不要因为已有一个 `Safe` 定理而将额外操作视为自然包含。

本轮的 P13 文字已足够支持上述保守协议，未发现需要把“每步 Safe”补成前提的问题。实际应用时需要保留表中的精化条件，尤其是收尾延迟计费和释放证书的真实含义。
