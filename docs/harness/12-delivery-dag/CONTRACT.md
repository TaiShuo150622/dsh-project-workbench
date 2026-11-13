# 交付管理与项目 DAG 契约

2026-11-13。首轮已确认范围：验收条件 → 模块输入输出约定 → 原工作线程 → 成果 → 人工验收，包含项目图、双向导航、缺口、变更复核及接续。单宿主验证，沿用既有任务启动规则。

## 数据责任

工作台 `projects.json` 的项目级 `delivery` 保存 version 1 数据，含 revision、criteria、packages、artifacts、acceptances、events。读取不初始化或修改项目。`initialize` 是明确写入入口，旧项目原线程、会话、结果和轮次不变。

条件、工作包、成果使用稳定 UUID 与对象版本；修改保留 history。条件编辑同步既有 coordination 文本与版本；仅重新排序不使成果失效。旧文本接口发生无法匹配的替换时，保留旧条件并归档，新建新身份，不猜测旧验收应该移到哪一项。

## 接口

沿用宿主 RPC 信封和认证。

- `delivery-read {projectId}`：返回 initialized、revision、sourceToken、goal、criteria、packages、artifacts、acceptances、gaps、summary、events、graph。
- `delivery-update {projectId,expectedRevision,sourceToken,action,data}`：同一持久队列内核对项目与依据，成功返回 revision、objectId。过期请求拒绝，不覆盖草稿对应的新状态。
- 模型工具 `project_delivery {}`：只读、有上限的缺口与工作包摘要；完整版本记录通过既有 `project_continuity(section=current)` 分页读取。模型没有交付修改或验收工具。

| action | data |
| --- | --- |
| initialize | 空对象 |
| criterion-save | id 可选、text |
| criterion-retire | id |
| package-save | id 可选、title、input、output、done、owner 可选、criterionIds、threadIds、dependsOn、decisionIds |
| artifact-save | id 可选、workId、threadId 可选、title、summary、reference、evidence |
| artifact-review | id、decision=reuse/revise、note |
| acceptance | criterionId、artifactIds、decision=accept/reject、note、confirmed=true |

引用必须属于当前项目；交付依赖拒绝环。首轮通过界面逐项创建或修改条件，不提供条件删除按钮；API 归档仍保留历史。工作包和成果保留历史，不提供清空功能。

## 适用性与人工验收

成果依据包含目标内容、相关模块约定、条件、有效决定、原线程汇报与上游成果版本。排序与运行观察时间不在内容适用性指纹中。上游缺少适用成果时，下游成果也不能直接通过验收。

人工通过要求：有负责模块；所选适用成果覆盖全部负责模块；明确核对确认；非空验收依据。记录保存条件版本和所选成果版本。新成果、约定变化或复核不会自动复活旧验收结论；须重新核对记录。

`summary.complete` 只表示当前登记条件均已通过当前版本验收，不对未登记的产品需求作保证。成果位置和证据是人工登记，首轮不自动读取路径、抓取链接或验证文件内容。

## 图与接续

图节点包含项目命名空间、对象类型、对象 ID、可用时的版本。边分 alignment、assignment、delivery-dependency、execution-dependency、output、evidence、decision。只投影已有状态，不创建会话、发送消息或改变调度。

图的 revision 与 sourceToken 绑定当前交付依据。线程节点保留 sessionId、generation 和运行观察；切换回原线程使用原身份。接续包保存交付记录及来源指纹，并携带旧 DAG nodes 引用；后续编辑不改写已有包。

项目图在工作台内实现。既有独立 `cfl-dag` 面板仍是外部适配点；本轮不复制其私有实现，也不把它声称为已联通。

## 验证

执行自动回归、构建、定向变异检查，再在已有合成项目里验证真实界面。人工验收功能使用明确标记的试验条件，不代表对原项目业务内容的接受。界面和实际写入结果单独记录。
