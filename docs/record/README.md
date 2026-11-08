# Record 任务生命周期与持续验证

这里保存跨会话任务状态的公开设计、后续实施任务书和验证约定。

- [任务内核与持续对抗测试实施讨论稿 v0.1.1](record-s1-and-adversarial-ci-v0.1.1.md)：用户已确认先做 S1，由 GitHub 执行 CI、当前会话调用 GPT-6.1-Sol max；[v0.1.0](record-s1-and-adversarial-ci-v0.1.0.md) 保留为历史。
- [S1 可运行契约](../../record/README.md)：任务、证据、验收、动作和回放接口及可信输入边界。
- [CI 后置测试协议](ADVERSARIAL.md) 与 [逐轮验证记录](reviews/README.md)。
- [既有 Record 与上下文设计](../harness/README.md)：此前公开讨论的阅读入口。历史稿件不代表当前实现能力。
- [本地基线摘要](baseline-2026-11-07.json)：17 项现有测试、构建和 11 个变异检出结果；不代表 GitHub CI 或新 Record 功能已验证。

S1 内核、确定性测试、变异检查和 GitHub Actions 工作流已加入本分支，实际远端结果及对抗用例采纳见逐轮验证记录。DSH 适配仍未实现。普通测试、模型候选生成、候选复现和真实宿主验收分别报告。

工作分支为 `codex/record-task-lifecycle`，基线为本仓库默认分支 `codex/dsh-project-workbench`。本仓库由个人维护，向 DeepSeek 官方或其他上游提交贡献属于后续独立步骤。
