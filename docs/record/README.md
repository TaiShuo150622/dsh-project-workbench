# Record 任务生命周期与持续验证

这里保存跨会话任务状态的公开设计、后续实施任务书和验证约定。

- [任务内核与持续对抗测试实施讨论稿 v0.1.0](record-s1-and-adversarial-ci-v0.1.0.md)：已确认的生命周期决定、S1 候选范围、每轮 CI 后 GPT-6.1-Sol max 对抗测试流程及尚待选择的执行位置。
- [既有 Record 与上下文设计](../harness/README.md)：此前公开讨论的阅读入口。历史稿件不代表当前实现能力。
- [本地基线摘要](baseline-2026-11-07.json)：17 项现有测试、构建和 11 个变异检出结果；不代表 GitHub CI 或新 Record 功能已验证。

本目录初始提交为设计准备，尚未增加 Record 任务内核、DSH 适配或 GitHub Actions 工作流。普通测试、模型候选生成、候选复现和真实宿主验收须分别报告。

工作分支为 `codex/record-task-lifecycle`，基线为本仓库默认分支 `codex/dsh-project-workbench`。本仓库由个人维护，向 DeepSeek 官方或其他上游提交贡献属于后续独立步骤。
