depends: none
verify: node --test tests/*.test.mjs

# B-01-continuity

目标：保存有效决定、替代关系和可追溯接续包；显式创建新总会话接手，保留历史和全部工作线程。

类别：写代码。分支 codex/harness-continuity，基线 634ebb440a9cee2e0c0aa305dbcd4166c570dfbb。

只许改/新增：server/continuity.js、client/continuity.js、tests/continuity.test.mjs；最小修改 index.js、server/projects.js、client/app.js、scripts/build.mjs、tests/desktop-contract.test.mjs（明确路由集合）、server/native.js（只读空闲核对及创建失败保留身份）、config/hyperparams.yaml（有界阅读预算）、scripts/mutation-check.mjs（新并发守卫对应的变异锚点）；docs/harness/11-project-management/continuity-discussion-v0.1.1.md、continuity-implementation.md。

契约：p.continuity={revision,decisions,handoffs,previousLeads,deliveryPaused}；决定只追加和supersede，事务内expectedRevision校验。接续包含快照时间、来源、当前线程状态/证据和可选p.coordination。新lead为空闲安全交接，创建与绑定之间再次核对；不自动发任务。旧lead不再具调度权，记录原lead只读历史。未发送给旧lead的汇报重路由新lead，已接纳不重复；接手后先暂存，用户显式开始接续才放行，不能清除recoveryHold。摘要和只读页有界，续页核对来源指纹。


实现授权：2026-11-13 用户确认三个新分支分别最小实现后组合试验；旧分支保持原状。远程首轮单宿主。
验证由 root 在隔离 Linux ARM64 环境运行，执行者不在本机跑产品测试、不 SSH。测试服务数据只用合成示例。
只可写本任务的工作树；不提交（root 审核后提交推送）；不读凭据、不删文件、不触碰其他程序。
审查独立性：相同模型、不同上下文，不能称为跨模型独立审查。
新行为须有实际行为回归用例，保留原测试；不要用仅检查字符串或文件存在冒充行为验证。
文档要区分设计、实现、测试、登录、真实模型调用；公开库不含地址、用户名、绝对私有路径、登录信息或运行日志。
基线 verify 使用现有测试 glob；新增行为用例加入同一 glob，基线通过仅证明旧行为基线。

