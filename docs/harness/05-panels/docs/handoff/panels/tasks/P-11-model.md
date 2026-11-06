depends: P-05-table, P-09-sandbox
verify: node docs/handoff/panels/tools/count-tests.mjs tests/model.test.mjs 12 && npm test && node scripts/mutation-check.mjs && npm run build && npm run e2e -- model

# P-11-model

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

模型能查写法、能点亮要素，用户的选中能回到对话。

## 类别

写代码

## 只许改 / 新建的文件

- `server/tools.js`
- `server/selection.js`
- `client/quote.js`
- `client/shell.js`
- `client/sandbox.js`
- `index.js`
- `config/hyperparams.yaml`
- `scripts/build.mjs`
- `scripts/mutation-check.mjs`
- `tests/model.test.mjs`
- `tests/e2e/model.mjs`
- `docs/handoff/panels/CONTRACT.md`

## 步骤

1. 注册 `panel_check`、`panel_point`、`panel_selection`。工具的注册方式看 `${PROJECTS_ROOT}/dsh-project-workbench/index.js`。
2. `panel_check` 不带 `path` 时返回精简的写法说明和 schema，放在工具结果里，不改系统提示。
3. 选中写服务端状态，点亮状态同样。桌面可见时轮询，不可见时不轮询。
4. 查实从标签正文拿到保活 Session 作用域的办法，引用 `${PROJECTS_ROOT}/deepseek-harness` 的文件和行号，写进契约第 9 节。
5. 实现「引用到对话」，草稿非空时不覆盖。

## 默认值（没有人回答问题时按这个做）

- 拿不到作用域时退回复制到剪贴板，并在收尾说明里写清。
- 状态只在内存，上限登记超参，重启清空。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- `panel_point` 不改文件。
- 跨会话读不到别人的选中。
- 草稿里有内容和引用胶囊时，点「引用到对话」不丢任何东西。

## 不要做

- 不提交，提交由人做
- 不改上面清单之外的文件
- 不做写回数据
- 不新增模型交付工具，交付用原生 `present`
