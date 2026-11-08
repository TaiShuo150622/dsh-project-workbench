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

这些失败配置是主动检验的错误命题，不是本工程产品失败。实际运行结果及轨迹会单独保存，未执行前不能把“预期”写成结果。

## 可重复运行

使用官方 TLC v1.7.4 的 tla2tools.jar 和 Java 17。下载来源与校验见 [官方发行页](https://github.com/tlaplus/tlaplus/releases/tag/v1.7.4)。本轮不将二进制工具纳入讨论稿公开包。

在本目录运行，TLC_JAR 指向本机下载的 jar：

    java -Xmx512m -cp "$TLC_JAR" tlc2.TLC \
      -workers 1 -config combined.cfg -metadir /tmp/harness-tlc-state \
      EffectContract.tla

其他配置分别替换 cfg 和 metadir；每次保留完整 stdout/stderr、退出码、模型与配置 SHA256。固定单 worker 便于复核最短 BFS 轨迹。TLC 在这个有限实例上没有找到违例，不是对任意次数、任意目标或实现精化的一般证明。
