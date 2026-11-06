depends: P-09-sandbox
verify: node docs/handoff/panels/tools/count-tests.mjs tests/trust.test.mjs 12 && npm test && node scripts/mutation-check.mjs && npm run build && npm run e2e -- trust

# P-10-trust

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

第二级首次运行要人点，联网要人批准。

## 类别

写代码

## 只许改 / 新建的文件

- `server/trust.js`
- `client/run-gate.js`
- `client/sandbox.js`
- `shared/frame-doc.js`
- `index.js`
- `config/hyperparams.yaml`
- `scripts/build.mjs`
- `scripts/mutation-check.mjs`
- `tests/trust.test.mjs`
- `tests/e2e/trust.mjs`

## 步骤

1. 批准记录存 `$DSH_HOME/dsh-panels/trust.json`，写临时文件再 rename，坏文件明确报错，不悄悄重置。
2. 键和重新询问的规则按契约第 7 节。
3. 外壳显示渲染器路径和联网来源，人点「运行」才挂 iframe。
4. 批准后把来源加进 CSP。来源只收 `https://host[:port]` 和 `http://localhost[:port]`。

## 默认值（没有人回答问题时按这个做）

- 不批准时显示说明，第一级的内容不受影响。
- 撤销入口放检查器。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 没批准时 DOM 里没有 iframe。
- `permissions.network` 变了要重新问，改渲染器内容不问。
- 通配符、`http://外部`、带路径的写法都拒绝。
- 模型工具里没有任何批准入口。

## 不要做

- 不提交，提交由人做
- 不改上面清单之外的文件
- 不做全局「总是允许」
- 不改 sandbox 属性
