depends: none
verify: npm run ci

# S1-01 Record 内核与 CI

## 目标

在宿主无关的确定性模型中实现已确认的任务生命周期，并使 GitHub CI 保存固定提交的行为验证证据。

## 类别

写代码；由主会话单写，主会话执行本地验证，GitHub 执行远端验证。CI 后测试生成由 GPT-6.1-Sol max 独立上下文承担，另用工作副本，验证和采纳由主会话完成。

## 文件范围

`record/`、`tests/record-*.test.mjs`、`tests/support/record-fixture.mjs`、`scripts/ci.mjs`、`scripts/record-mutation-check.mjs`、`.github/workflows/ci.yml`、`package.json`、Record 文档和 README 入口。

## 完成判据

既有工作台测试、Record 行为测试、构建一致性和两组变异检查通过；GitHub 对固定提交实际运行；随后指定模型生成的候选经过独立复现与采纳判断，新增代码变化再次走 CI。

## 边界

不接 DSH 生产实例，不执行真实合并，不读私人运行历史，不配置模型 API 凭据，不合入默认分支。不把 S1 同步模型称为可靠持久化或真实工具拦截。输入来源由未来可信适配层保证。

## 基线

既有基线 `b9d44847d72883bf5116c72f445c31618d7cc020`：17 项测试通过、构建通过、11 个既有变异检出。新增 `npm run ci` 首次本地运行的普通测试、构建、Record 变异通过，既有变异脚本发生超时，整轮记失败；已增加目标测试过滤和超时判别，复核与远端结果另按实测登记。

超时处理修订后的本地完整复核通过：44 项测试、构建一致性、11 个工作台变异和 8 个 Record 变异。此时工作树尚未提交，最终远端提交结果以逐轮记录为准。
