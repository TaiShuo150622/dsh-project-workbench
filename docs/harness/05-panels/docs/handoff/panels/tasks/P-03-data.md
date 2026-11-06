depends: P-02-spec
verify: node docs/handoff/panels/tools/count-tests.mjs tests/data.test.mjs 16 && npm test && node scripts/mutation-check.mjs && npm run build && npm run e2e -- data

# P-03-data

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

把声明过的数据文件安全、快速地读到宿主页面。

## 类别

写代码

## 只许改 / 新建的文件

- `server/data.js`
- `server/paths.js`
- `shared/parse.js`
- `client/data.js`
- `index.js`
- `config/hyperparams.yaml`
- `scripts/build.mjs`
- `scripts/mutation-check.mjs`
- `tests/data.test.mjs`
- `tests/e2e/data.mjs`

## 步骤

1. 按契约第 4 节实现 `/api/dsh-panels/data`。`server/paths.js` 只做路径判定，写成能单测的函数。
2. `client/data.js`：不超 `directReadMaxBytes` 走 `remote.workspaceFiles.readBytes`，注意返回值在 `.value` 里；更大的分块走插件接口，带版本比对，变了从头读。全程受 `AbortSignal` 控制。
3. `shared/parse.js`：CSV、TSV、JSON、GeoJSON。CSV 处理引号、转义、多行字段。
4. `e2e` 场景：真 HTTP 下断言响应头有 `cache-control: no-transform`，读 64 MiB 文件内容和磁盘字节完全一致。

## 默认值（没有人回答问题时按这个做）

- `.panel.json` 里的 `data` 是内联时不走这条路。
- 超过 `jsonMaxBytes` 的 JSON 报错，建议改 CSV 或写渲染器。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- 符号链接逃出、相似前缀、未声明路径、会话不存在、`panelPath` 不是 `.panel.json`，都拒绝。
- 读到一半文件被改，能发现并重读，不混版本。
- 关闭面板后在途请求被取消。
- 去掉 `no-transform` 后 e2e 要红，这条写成变异。

## 不要做

- 不提交，提交由人做
- 不改上面清单之外的文件
- 不做渲染
- 不提供任意路径读取
