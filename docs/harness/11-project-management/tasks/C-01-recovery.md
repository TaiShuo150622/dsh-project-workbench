depends: none
verify: node --test tests/*.test.mjs

# C-01-recovery

目标：观察并核对原任务运行状态；保留结果/会话/工作树，未知不等于失败，默认不重跑。

类别：写代码。分支 codex/harness-remote-recovery，基线 634ebb440a9cee2e0c0aa305dbcd4166c570dfbb。

只许改/新增：server/recovery.js、client/recovery.js、tests/recovery.test.mjs；最小修改 server/native.js、server/projects.js、index.js、client/app.js、scripts/build.mjs、tests/desktop-contract.test.mjs（明确路由集合）；docs/harness/11-project-management/remote-recovery-discussion-v0.1.1.md、recovery-implementation.md。另经主线明确允许，tests/projects.test.mjs 补充 fake.observe/runtimeState，scripts/mutation-check.mjs 更新恢复行为锚点并纳入新测试，不删除旧断言。

审查补充授权：server/worktrees.js 仅增加创建前明确失败的证明标记，创建结果未知仍保留待人工核对；复制已核实的 tests/native-inspection.test.mjs 及当前/较旧宿主只读 inspect 适配。补充独立 retry_followup 入口、创建失败身份/权限验证、只重试当前 lead 汇报及对应行为回归；不扩展为通用任务引擎。

契约：p.recovery记录checkedAt、随机运行实例标识、线程观察running/idle/missing/unknown及原因。API核对不create/deliver/stop/retry。保留既有工作与不确定状态，不通过缺失agents内存对象推断外部任务结束。排队/恢复需新鲜可证状态；未知拒绝重复发送。UI显示连接状态和最后核对，核对与显式继续分开。只做单宿主，不实现SSH远程管理。


实现授权：2026-11-13 用户确认三个新分支分别最小实现后组合试验；旧分支保持原状。远程首轮单宿主。
验证由 root 在隔离 Linux ARM64 环境运行，执行者不在本机跑产品测试、不 SSH。测试服务数据只用合成示例。
只可写本任务的工作树；不提交（root 审核后提交推送）；不读凭据、不删文件、不触碰其他程序。
审查独立性：相同模型、不同上下文，不能称为跨模型独立审查。
新行为须有实际行为回归用例，保留原测试；不要用仅检查字符串或文件存在冒充行为验证。
文档要区分设计、实现、测试、登录、真实模型调用；公开库不含地址、用户名、绝对私有路径、登录信息或运行日志。
基线 verify 使用现有测试 glob；新增行为用例加入同一 glob，基线通过仅证明旧行为基线。

