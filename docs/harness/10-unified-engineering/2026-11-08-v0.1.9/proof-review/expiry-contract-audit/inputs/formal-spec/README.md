# 目标端效果契约的 TLA+ 有限模型

这份模型补充 Python 的账本/图/预算枚举，专门检查目标端幂等、fencing、稳定业务身份、取消和观察之间的区别。它不是 Record 产品代码，也没有调用任何真实外部目标。

## 模型边界

- 一个逻辑业务动作，参数固定；最多三次发送，两代执行身份。
- 同一业务动作的稳定 key、目标原子去重和目标拒绝旧 epoch 是三个分别声明的条件。
- InstallNewEpoch 表示新 epoch 已经安装在目标端，不代表某个远端授权服务撤回之后所有目标瞬间得知。
- 目标将“是否已经使用 key”的判断、效果发生和 key 保存放在同一原子步骤，去重记录在模型期间不丢失/过期。
- 没有目标崩溃、存储丢失、参数篡改、恶意执行者或多个业务动作。扩大这些域需要扩展模型。
- 本地 Cancel 阻止新 Send，不会消除已发送消息；Deliver 可晚于 Cancel。
- effects 是模型拥有的世界状态，confirmed 是调用方收到成功观察的状态。模型可看到 effects 不意味着真实恢复器也能直接读取它。
- 不假设公平性、消息最终送达或自动重试；本轮只检查安全性质。关闭 deadlock 检查是允许有限工作结束，不是声称已证明活性。

## 预先约定的结果

| 配置 | 检查 | 预期 |
| --- | --- | --- |
| combined | 不重复效果、无旧 epoch 提交 | 在上述有限域与原子目标假设下通过 |
| fence-only | 不重复效果 | 找到合法 epoch 重复发送产生两次效果 |
| dedupe-only | 无旧 epoch 提交 | 找到旧消息在新 epoch 安装后仍提交 |
| unstable-key | 不重复效果 | 找到同一业务意图换 key 后重复执行 |
| cancel-is-not-rollback | 本地取消后绝无新效果 | 找到已发送消息在取消后提交 |
| world-is-not-ledger | 世界已发生效果必已被调用方确认 | 找到效果已提交、观察尚未收到的状态 |

这些失败配置是主动检验的错误命题，不是本工程产品失败。本轮已执行这六个配置；combined 为 624 个不同状态完整通过，其余五个配置按预期找到反例并退出 12。见 [运行回执](results/receipt.json)。

## 可重复运行

使用官方 TLC v1.7.4 的 tla2tools.jar 和 Java 17。下载来源与校验见 [官方发行页](https://github.com/tlaplus/tlaplus/releases/tag/v1.7.4)。本轮不将二进制工具纳入讨论稿公开包。

在本目录运行，TLC_JAR 指向本机下载的 jar：

    java -Xmx512m -cp "$TLC_JAR" tlc2.TLC \
      -workers 1 -config combined.cfg -metadir /tmp/harness-tlc-state \
      EffectContract.tla

其他配置分别替换 cfg 和 metadir；每次保留完整 stdout/stderr、退出码、模型与配置 SHA256。固定单 worker 便于复核最短 BFS 轨迹。TLC 在这个有限实例上没有找到违例，不是对任意次数、任意目标或实现精化的一般证明。

## 分项正向检查与期限补充

另外两个配置分别检查独立保证：`fence-property` 仅检查 NoStale，604 个不同状态完整通过；`dedupe-property` 仅检查 NoDuplicate，660 个不同状态完整通过。见 [分项回执](feature-results/receipt.json)。这避免仅展示移除机制后的失败，而不说明机制本身覆盖什么。

独立的 [ExpiryContract.tla](ExpiryContract.tla) 使用一个业务意图、两次发送、目标时钟 0…2。所有发送都在期限 2 之前，去重记录在 2 时允许删除；接收与提交是分开的步骤。它补充期限边界，不修改原六配置的模型含义。

| 期限检查位置 | 实际结果 | 不同状态数 | 含义 |
| --- | --- | --- | --- |
| 只限制发送 | 找到重复效果，退出 12 | 59，遇反例停止 | 到期前发送的请求可在到期后提交 |
| 发送 + 目标接收/准入 | 找到重复效果，退出 12 | 81，遇反例停止 | 接收时未过期的工作仍可排队到去重删除以后 |
| 发送 + 目标实际提交点 | 完整通过 NoDuplicate，退出 0 | 66 | 目标同一时钟，提交时拒绝过期业务意图，且去重记录保留到此前提时刻 |

两条反例都是 9 次转移：首请求提交；第二请求已发送/接收；时间推进到 2；删除 key；第二请求提交。模型没有新发送违规。第三条只在目标提交检查与效果原子、时钟不倒退、同一个不可变意图和给定保留规则下成立。它不证明分布式时钟误差、动态延长期限、目标崩溃或任意目标的幂等性，也不保证期限内一定完成。

这与 AWS 工程讨论中迟到请求及身份保留周期的责任一致；我们的模型是对其中一种期限协议的独立小规模检验，没有声称 AWS 采用同一实现。[AWS 原始讨论](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)

可复跑命令：`python3 run_expiry.py --jar /path/to/tla2tools.jar --output /tmp/expiry-results`。完整结果见 [期限回执](expiry-results/receipt.json)；首次解析失败的日志另存 `expiry-results/initial-parse-failure/`，该轮没有执行状态检查，不混入通过计数。官方 jar SHA256 为 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`。
