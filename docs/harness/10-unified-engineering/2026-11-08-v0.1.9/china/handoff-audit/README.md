# C10：责任接管与负担连续性审查

先读 [REVIEW.md](REVIEW.md)。原 5 个有限配置及最短反例已复现；新增事件历史账本检查未发现原保守方案的预算不变量反例。需保留的边界是：**跨预算只适用于允许未结算费用重归属的政策额度；授权检查只覆盖终态观察；R12 尚未表示非零收尾预留。**

本目录属于研究审查，不是已实现的接管插件、一般证明或宿主验收。源模型不修改、不提交、不推送；无产品、网络或模型调用。

主要材料：

- [完整审查与精确位置](REVIEW.md)
- [可打印轨迹](TRACES.md)
- [独立编写的历史观察器](audit_handoff.py) 与 [结构化结果](audit-results.json)
- [输入指纹](inputs.json)、[执行回执](execution_receipt.json)、[校验回执](validation_receipt.json)
- [范围判断矩阵](findings.json)

在本目录复跑（Python 3.9+ 标准库）：

```sh
PYTHONDONTWRITEBYTECODE=1 python3 rerun/check_handoff.py
PYTHONDONTWRITEBYTECODE=1 python3 rerun/verify_handoff.py
PYTHONDONTWRITEBYTECODE=1 python3 audit_handoff.py
PYTHONDONTWRITEBYTECODE=1 python3 validate_audit.py
```

命令会覆盖本目录的生成结果/回执；若需保留旧时间戳，先复制整个目录。`inputs/` 是冻结输入，`rerun/` 是原程序的本地复跑副本。审查脚本共享原 `successors`，以事件历史独立记账、逐边检查和反向 BFS 核最短反例；不能叫独立转移实现。5 个原配置共 5076 状态/14172 边，2 个占位过期扩展另计 3276 状态/9342 边；不是生产测试覆盖率。

在原工作树布局内可加 `python3 validate_audit.py --source-root ../../../../../../` 同时核对作者源文件。当前回执核对了 11 个原源文件均未变化、31 条打印路径可回放及 18 个读者本地链接；原模型和原第二检查器输出与冻结结果逐字一致。

原稿哈希 `905ba62b10901fe4c9925165d7fb8fb575b2dbf3e9f4389a09497e1a97114b75`。没有新增外部文献或读取来源正文的数量。`inputs/inputs.json` 是带原本机路径的原样证据副本；最终公开包是否保留它由根代理决定，其余读者入口使用相对路径。
