# W13 · 旧意图覆盖核对

本包回答：统一主稿 v0.1.5 是否漏掉旧公开稿的重要意图。只有文档研究与检查结果，没有产品修改、运行实验或发布。

先读 [补漏备忘](MEMO.md)，再查 [逐条机器映射](mapping.json)；阅读深度和哈希见 [READING.md](READING.md) / [reading-list.json](reading-list.json)。[inventory.json](inventory.json) 保存选稿之前的路径、版本探索所需元数据和内容哈希。

## 先列最新/代表入口，再选择补读

这里的“最新”只指已公开归档内的版本关系，不表示外部产品今天的最新状态。先对指定七目录全部 Markdown 做内容哈希去重，96 条元数据中无完全相同内容；2 份 activity 正文未读、未哈希。数值版本不跨主题排序。

| 实际目录 | 最新/代表版本 | 入口 | 本轮选择与理由 |
| --- | --- | --- | --- |
| 01-vision | 总体 v0.3（v0.1/v0.2 为历史） | [总体 v0.3](<https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/01-vision/harness-discussion-v0.3.md>) | 选读决定与流程；资源和外部框架调研段不重复核验 |
| 02-methods | 方法线没有单一总版本：H0 v1、主动性 v0.1.1、工具面 v0.1.0 | [H0](<https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/02-methods/2026-10-19-Agent%E6%A1%86%E6%9E%B6%E4%B8%8B%E4%B8%80%E8%BD%AE%E5%BC%80%E5%8F%91%E8%AE%BE%E8%AE%A1%E7%A8%BF.md>)、[主动性](<https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/02-methods/2026-10-22-Agent%E4%B8%BB%E5%8A%A8%E6%80%A7%E4%B8%8E%E6%8F%90%E9%97%AE%E8%BE%B9%E7%95%8C%E8%AE%A8%E8%AE%BA%E7%A8%BF-v0.1.1.md>)、[工具面](<https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/02-methods/2026-10-22-Agent%E5%B7%A5%E5%85%B7%E9%9D%A2%E8%AE%BE%E8%AE%A1%E8%AE%A8%E8%AE%BA%E7%A8%BF-v0.1.0.md>) | 三份新选；Agent/Workflow 已由 root 衔接，本文不再读全稿 |
| 04-memory | Record v0.1.2；文件源 v0.2 明确是历史 v0.1.1 | [当前 Record](<https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/04-memory/Record%E6%99%BA%E8%83%BD%E8%AE%B0%E5%BF%86%E4%B8%8E%E8%87%AA%E4%B8%BB%E4%B8%8A%E4%B8%8B%E6%96%87%E7%BB%84%E8%A3%85-%E6%BA%90v0.1.2-%E5%85%AC%E5%BC%80%E6%95%B4%E7%90%86%E7%89%88.md>)；[早期常驻记录 v0.1](<https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/04-memory/%E4%BC%9A%E8%AF%9D%E8%AE%B0%E5%BD%95%E5%B8%B8%E9%A9%BBAgent%E8%AE%BE%E8%AE%A1-%E6%BA%90v0.1-%E5%85%AC%E5%BC%80%E6%95%B4%E7%90%86%E7%89%88.md>) | 当前稿沿用 W09 的 1–145 行；本轮只补已列明命中。早期捕获稿新全文读，不能替代当前方向 |
| 06-dag | current 目录为公开现行入口，内部协议/提案各有自己的版本 | [面板协议 v2](<https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/06-dag/current/docs/design/dag-detailed/08-%E9%9D%A2%E6%9D%BF%E5%8D%8F%E8%AE%AEv2%E7%AC%AC%E4%B8%80%E7%89%88.md>)、[借鉴 Super-agent v0.1.0](<https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/06-dag/current/docs/design/dag-detailed/11-%E5%80%9F%E9%89%B4SuperAgent%E6%9E%B6%E6%9E%84%E8%AE%A8%E8%AE%BA%E7%A8%BF-v0.1.0.md>) | 两份新全文读；第一屏收口已读。current 文件夹不等于所有提案已批准 |
| 07-remote | 双运行模式 v0.1.1；rc.5 兼容记录为历史测试 | [远程 v0.1.1](<https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/07-remote/DSH-%E8%BF%9C%E7%A8%8B%E5%B7%A5%E4%BD%9C%E5%8C%BA%E4%B8%8E%E5%8F%8C%E8%BF%90%E8%A1%8C%E6%A8%A1%E5%BC%8F%E8%AE%A8%E8%AE%BA%E7%A8%BF-v0.1.1.md>) | 复用 W09 1–130 行，不重读或据此声称全文覆盖 |
| 08-browser | 稳定文件名协议：CONTRACTS/LIFECYCLE/OPERATION-LOG/SECURITY 等；平台路线独立 | [ARCHITECTURE-PLATFORM](<https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/08-browser/dsh-chrome/docs/ARCHITECTURE-PLATFORM.md>) | 核心协议 W09 已读；本轮新读平台路线。日期和 provider 版本保留历史语境 |
| 09-extensions | 实时讨论 2026-10-28（未编号）；CLI 发展史为历史补充 | [实时讨论工作台](<https://github.com/TaiShuo150622/dsh-project-workbench/blob/b9d44847d72883bf5116c72f445c31618d7cc020/docs/harness/09-extensions/discussion/%E5%AE%9E%E6%97%B6%E8%AE%A8%E8%AE%BA%E5%B7%A5%E4%BD%9C%E5%8F%B0%E5%BC%80%E6%BA%90%E6%96%B9%E6%A1%88%E8%B0%83%E7%A0%94-2026-10-28-%E5%85%AC%E5%BC%80%E6%95%B4%E7%90%86%E7%89%88.md>) | 实时稿 W09 全读；CLI 史不提供需补的新意图，本轮只留索引覆盖；activity 排除 |

新补读恰好 8 份：总体、H0、主动性、工具面、早期记录、DAG 协议、DAG 借鉴、浏览器平台路线。7 份通读，总体选读正文 498 行（明确行段见清单）；8 份均不在 W09/W12 的既读正文条目中，且字节与固定提交一致。这里没有重新宣称全部 192 附件逐页核读。

## 结果怎样进入总稿

- IC01–IC02：补强已有明确需求，适合各加一两句；没有新增默认实验或实施切片。
- IC03：给历史 H0 计划一个明确承接状态，不重启旧排期，也不宣称已经完成。
- IC04：把当前 Record 已有的来源语义写得更直接。
- IC05–IC06：明确暂缓的旧提案，不能作为已采纳功能清单。

主稿/专题/实施章节落点已在 mapping.json 逐项列出。本包沿用 [W09 原覆盖快照](../historical-coverage/README.md) 与 [W12 决定沿革](../design-continuity/README.md)，不倒改它们。

## 验证与限制

运行的检查只包含 JSON 解析、引用路径存在、文件哈希、引用行范围和阅读范围一致性。详见 [validation.json](validation.json)。不把这些检查写成产品验收；没有外部检索、付费模型调用、真实远程动作、代码改动、提交或推送。

正文对照冻结为 v0.1.5 / SHA-256 `28d373e48c8305e2ccb51c77e9c4bcf1f2b1c11c9e58215c2f0af9453ea813af`。root 若更新草稿，应按差异重新判断本包建议是否仍成立。
