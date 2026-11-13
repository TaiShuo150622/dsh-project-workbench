# 多模块目标、接续与远程恢复

2026-11-13。三个新分支分别实现一项最小功能，共同服务“各模块持续开发时，整体目标和优先级仍可核对”。已确认先分别实现，再在组合分支试验。原有产品分支和 P/B 路线保持原版本。

| 方向 | 独立分支 | 已实现入口 |
| --- | --- | --- |
| A 整体方向 | [codex/harness-coordination](https://github.com/TaiShuo150622/dsh-project-workbench/tree/codex/harness-coordination) | 项目→管理项目：维护目标、验收条件、线程顺序；运行中线程保留本轮采用版本 |
| B 跨会话接续 | [codex/harness-continuity](https://github.com/TaiShuo150622/dsh-project-workbench/tree/codex/harness-continuity) | 保存有效决定与替代关系、保存接续包、新总会话接手并显式开始 |
| C 远程恢复 | [codex/harness-remote-recovery](https://github.com/TaiShuo150622/dsh-project-workbench/tree/codex/harness-remote-recovery) | 核对原任务、区分运行/空闲/未知、单独明确继续；默认不重复启动 |

三条分支都从 `634ebb440a9cee2e0c0aa305dbcd4166c570dfbb` 出发。每条独立分支包含自身功能；[组合试验分支](https://github.com/TaiShuo150622/dsh-project-workbench/tree/codex/harness-management-trial)依 A→B→C 合并。阅读时先看本页与 [试验场景](SCENES.md)，再看各线讨论稿和实现说明。具体运行证据以 [验证记录](VALIDATION.md)为准。

## 管理方法

把整体交付写成一个当前目标，配可核对的验收条件；模块工作围绕同一排序推进。业务优先级与依赖、实际运行状态分别维护。改变目标在自然工作边界被采用，运行中的任务不会因为改排序而被中断。

将有效决定与已失效决定区分，接续包保存当前事实和下一步。新协调会话先接手记录，再由用户明确开始。连接恢复先检查原任务和原消息，再决定是否继续；未知状态不能当成未执行。

本轮实现是管理流程的最小入口，不是完整 Record 平台、多云调度或自动整体验收。研究线程结果仍需用户按验收条件核对。完整理论与来源见三份 v0.1.1 讨论稿；各线可通过上表分支链接访问。

## 工作与验证边界

三个智能体各写一个独立工作树。主线负责验证、人工解决共享接入点和发布。审查为同模型、不同上下文；不称为不同模型独立审查。自动测试在独立 Linux ARM64 环境进行，真实 UI 与模型试验单列。

公开内容只含通用研究、实现、合成数据场景及脱敏结果。真实主机地址、用户路径、账号、凭据、原始会话和业务日志不进入此目录。
