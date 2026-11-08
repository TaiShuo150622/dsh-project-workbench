# M-06：持久状态、发送意图、历史回执与真实效果

本目录只含静态研究和未运行协议，未运行产品、宿主、模型枚举或故障注入。

- [讨论稿 v0.1.0](持久状态与发送效果边界讨论稿-v0.1.0.md)：固定调用链、四层证据、六项精化义务。
- [crash-cuts.json](crash-cuts.json)：DC01–DC06 的初态、切点、观察与分类，全部 PROPOSED_NOT_RUN / actual_execution=false。
- [sources.json](sources.json)：4 组证据；代码组包含 workbench 与其宿主接缝，另 3 组为 Node、Linux man-pages、AWS outbox。
- [validation.json](validation.json)：仅研究文档结构、JSON、引用与本地链接校验，不代表产品试验。

固定 workbench：7264be10387963f4d575d8688ed8573f4c16c8c4。固定 DSH：fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159。

供 root 有限模型优先使用的三点：

1. DC02：队列属于 Store 实例；同一进程两个实例也不共享临界区。外层 dispatch 去重检查并未进入 change 的串行边界。
2. DC04：选 worker 向 lead 的汇报 relay，保证 retry_delivery 可重试同一 ID。只有目标写入未提交、没有后续成功 drain、outbox sent 保留而目标历史不保留这些前提同时成立，才是持久接收性质的精化反例。普通 flush 拒绝不足以证明这些前提。
3. DC06：历史回执重送不更新当前授权。若适配器把旧 dispatch receipt 再次用来发请求，违反发生在该映射处；不能把 Record 的历史回执设计本身描述成重新授权。

DSH JSONL 具有文件与目录同步、失败缓冲保留、追加回滚等机制；全局 flush 也可能仅因其他 session 失败而拒绝。研究不把 workbench Store 的限制扩大给宿主，不凭缺少 fsync 宣称实际丢失，不凭数据库名称承诺跨服务效果一次性。

HTML 仅生成并检查结构，未作浏览器视觉验收。所有证据均为源码和原始文档阅读。

