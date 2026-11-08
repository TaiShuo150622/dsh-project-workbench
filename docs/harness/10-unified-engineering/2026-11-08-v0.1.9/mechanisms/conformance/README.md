# C01–C16 适配验收协议目录

本目录定义一组尚未运行的场景，不提供执行器，不实现产品，不生成通过记录。

- schema_version：0.1.0。
- status：PROPOSED_NOT_RUN。
- actual_execution：false。
- 当前 16 个 case 的 verdict：NOT_RUN。
- [catalog.json](catalog.json)：机器可读场景目录。
- [review.md](review.md)：对 root 固定稿的定向审查及精确源码引文。
- [validation.json](validation.json)：本地格式、ID 与引用检查收据；不是场景执行回执。

## 如何理解这个 JSON

JSON 是可供后续工具读取的协议目录，oracle 使用明确的自然语言条件，不是可直接执行的断言语言。

| 字段 | 含义 |
| --- | --- |
| reviewed_source | 固定的源稿 SHA-256、Git HEAD 和捕获时间上界；行号仅对应这一内容 |
| capability_vocabulary | 本目录所用能力名，不能代替实际能力证据 |
| capability_provider_roles | 能力可来自适配器、目标、认证观察者或隔离测试设施；fault_control 不要求宿主暴露私有内存 |
| observation_channels | 允许使用的公开观察通道及其边界 |
| shared_contract | 所有运行必须填齐的作用域、时间、证据与判定规则 |
| cases[].requires | 本场景依赖的适配器能力；不满足时按断言/变体报告 |
| cases[].parameters | 必须由具体 profile 冻结的参数，不提供隐含生产默认值 |
| initial_state / disturbance | 通过公开接口建立的初态与受控扰动；不要求读取宿主隐藏内存 |
| observations | 可观察通道及用途；可来自独立目标或测试设施，未要求宿主自己提供全部通道 |
| oracle | SUCCESS、FAILURE、UNSUPPORTED、UNKNOWN 的判据 |
| variants | 必须分别报告的边界变体；additional_requires 是额外能力 |
| must_not_infer | 不能从本场景证据推出的更强保证 |
| execution_evidence | 当前为空；不得填入其他有限模型的收据来冒充实际执行 |

所有正向结果都必须绑定 adapter version、config digest、principal/tenant、目标稳定身份、effect set、history incarnation、授权语义和观察窗口。能力名匹配、JSON 检查通过、目录存在都不构成验收通过。

## 冻结 profile 后才能运行

1. 为具体宿主和无破坏目标声明能力与证据；缺失能力只能使依赖它的断言 UNSUPPORTED。
2. 填齐 namespace、期限、最大迟到范围、时钟误差、效果范围、故障域与权威读回口径。没有声明有限进展界时，观察期限用来结束测试并报告 UNKNOWN，不制造失败或成功。
3. 冻结人工可核的 oracle 和独立观察来源，再安排故障注入。不能从被测规则自动生成同一份期望值。
4. 用公开回执/目标屏障证明扰动发生在所需阶段；若没命中，判 UNKNOWN 或重新设计场景，不能虚构宿主内部状态。
5. 执行证据与协议分开保存；本目录的 actual_execution 不因将来某个宿主通过而整体改成 true。应另建绑定 profile 和具体 case/variant 的运行回执。

此处规定的是将来执行的要求，不构成启动远端任务或对外写入的授权。

## 判定语义

| 结果 | 判定条件 |
| --- | --- |
| SUCCESS | 实际运行，前提成立，扰动已证实，所需观察完整且支持全部指定断言；仅适用于该有限轨迹和配置 |
| FAILURE | 有充分观察证据反驳已声明契约；或者明确有限进展承诺在完整观察窗口中被违反 |
| UNSUPPORTED | 指定配置明确不声明所需能力；必须列缺失能力和受影响断言 |
| UNKNOWN | 来源、时序、扰动、目标范围、观察覆盖或真实性不足，无法判定 |
| NOT_RUN | 没有执行；本目录所有场景的当前结果 |

**产品 unknown 与测试 UNKNOWN 不同**：恢复器正确保留一个未知效果并继续占位，可以使 C06/C09 的有限场景 SUCCESS；测试器无法知道恢复器是否误释放，则是测试 UNKNOWN。

**负面观察要有范围**：普通日志没有发送条目，不证明没有发送；目标一次返回未找到，不证明以后不会迟到提交；调用返回，不证明远端进程终止。必要的不存在性判断需完整出站覆盖、目标端封闭窗口或更强协议证据。

**变体不能互相替代**：顺序去重通过不等于并发、跨租户或到期行为通过。C12.liability 可以用于软预算；C12.hard_cap 额外要求 hard_cost_bound。C05 的显式撤销预留变体也不能冒充保留 reserved 的核心变体。

## 不可观测内部状态的替代

| 不使用的断言 | 使用的观察或限定 |
| --- | --- |
| 内部只执行了某些重算 | 先检查输出、支持身份和绑定；工作量单列可选遥测 |
| 旧进程一定死了 | 指定主体和范围的终止证明；否则保留未解决 |
| 目标内部事务正在某一行 | 受控目标/代理的阶段屏障回执；不能提供时 UNKNOWN |
| 回执就是实际效果 | 独立目标状态或目标审计，绑定同一稳定动作 |
| 读取集合一定完整 | 规则作者声明及独立审查，作为条件；不从黑盒输出逆推完整性 |

## 当前检查范围

仅允许 stdlib 对 JSON、唯一 ID、能力引用、观察通道引用、C01–C16 覆盖、变体引用及本地文件链接做结构检查。没有伪 runner，没有执行宿主工具，没有真实故障注入，也没有 PASS 样本。结构收据本身使用明确的 STRUCTURE_ONLY 标记。

