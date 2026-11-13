depends: none
verify: node --test tests/*.test.mjs

# A-01-coordination

目标：维护项目目标、验收条件、统一线程排序；队列遵守依赖并保留在跑工作。

类别：写代码。分支 codex/harness-coordination，基线 634ebb440a9cee2e0c0aa305dbcd4166c570dfbb。

只许改/新增：server/coordination.js、client/coordination.js、tests/coordination.test.mjs；最小修改 index.js、server/projects.js、client/app.js、scripts/build.mjs、tests/desktop-contract.test.mjs（用明确路由集合替代固定数量）；docs/harness/11-project-management/coordination-discussion-v0.1.1.md、coordination-implementation.md。

契约：p.coordination={revision,goal,criteria,order}，expectedRevision在Store事务内比对，拒绝越界/重复ID。worker本轮采用版本及目标验收快照；普通变更仅下次自然启动采用，不调用stop，不扩大权限。模型只读上下文，UI维护。


实现授权：2026-11-13 用户确认三个新分支分别最小实现后组合试验；旧分支保持原状。远程首轮单宿主。
验证由 root 在隔离 Linux ARM64 环境运行，执行者不在本机跑产品测试、不 SSH。测试服务数据只用合成示例。
只可写本任务的工作树；不提交（root 审核后提交推送）；不读凭据、不删文件、不触碰其他程序。
审查独立性：相同模型、不同上下文，不能称为跨模型独立审查。
新行为须有实际行为回归用例，保留原测试；不要用仅检查字符串或文件存在冒充行为验证。
文档要区分设计、实现、测试、登录、真实模型调用；公开库不含地址、用户名、绝对私有路径、登录信息或运行日志。
基线 verify 使用现有测试 glob；新增行为用例加入同一 glob，基线通过仅证明旧行为基线。

