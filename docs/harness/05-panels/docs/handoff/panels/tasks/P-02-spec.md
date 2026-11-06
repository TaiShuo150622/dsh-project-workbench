depends: P-01-skeleton
verify: node docs/handoff/panels/tools/count-tests.mjs tests/spec.test.mjs 24 && npm test && node scripts/mutation-check.mjs && npm run build

# P-02-spec

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

实现 `validate`，配置错了能说清哪一行、哪里错、怎么改。

## 类别

写代码

## 只许改 / 新建的文件

- `shared/spec.js`
- `schema/panel.schema.json`
- `tests/spec.test.mjs`
- `tests/fixtures/specs/**`
- `scripts/build.mjs`
- `scripts/mutation-check.mjs`
- `config/hyperparams.yaml`

## 步骤

1. 按契约第 2、3 节写 `validate(text)`，手写，不用校验库。JSON 语法错误从错误位置算行列。
2. 写 `schema/panel.schema.json`。
3. `tests/fixtures/specs/` 放至少 30 份样例，有效和无效都有，覆盖全部类型。测试用 ajv 跑 schema，断言它和 `validate` 对每一份的判定一致。
4. 查跨字段规则：`graph` 边的两端、`timeline` 的起止、`table` 的列数、`compose` 的 `key` 唯一和不嵌套、`custom` 必须有 `renderer`。
5. 路径规则：绝对路径、`..`、反斜杠写法都报错。

## 默认值（没有人回答问题时按这个做）

- `start`、`end` 可以是数字或 ISO 字符串，同一份数据混用报错。
- 未知字段报警告。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 报错文字是中文，带修法。
- `issueMax` 生效，超了只报前几条。
- 超过 `specMaxBytes` 不解析，直接报错。

## 不要做

- 不提交，提交由人做
- 不改上面清单之外的文件
- 不读文件，纯函数
- 不引入运行时依赖
