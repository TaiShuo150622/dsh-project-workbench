# S1 CI 与对抗测试记录

这里按 GitHub run ID / attempt 和提交 SHA 保存每轮 GPT-6.1-Sol max 的输入、候选、独立复现与处置。没有记录不能解释为审查通过。

- [第一轮](round-01.md)：输入 `82115a4` 的 CI 通过；两路 Sol max 发现四类问题，采纳 9 项测试，保留语义复核与正向对照。
- 最新 CI 与后置审查状态同时记录在 [PR #1](https://github.com/TaiShuo150622/dsh-project-workbench/pull/1) 的描述中；未合并默认分支。

运行协议见 [ADVERSARIAL.md](../ADVERSARIAL.md)。源代码和工作流变更都须重新 CI，再进行对应版本的后置审查；文档归档与代码状态分开记录。
