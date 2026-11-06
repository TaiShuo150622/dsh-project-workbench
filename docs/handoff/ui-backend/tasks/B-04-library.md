depends: B-01-phase-history
verify: node --test tests/library.test.mjs && npm test && node scripts/mutation-check.mjs && npm run build

# B-04-library

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

实现 `library`、`library-changes`，列出连接的文件夹、线程工作区和改动。

## 类别

写代码

## 只许改 / 新建的文件

- `server/library.js`（新建）
- `server/worktrees.js`
- `index.js`
- `config/hyperparams.yaml`
- `scripts/build.mjs`、`scripts/mutation-check.mjs`
- `tests/library.test.mjs`（新建）

## 步骤

1. 顶层 `roots` 来自 `project.repos`、线程 `worktree`、产出。
2. 列目录一次一层，按上限截断并标 `truncated`。
3. 改动用 `git status --porcelain` 和 `--numstat`，沿用 `gitTimeoutMs`、`gitOutputBytes`。
4. 路径先 `realpath`，再判断是否落在 root 内。

## 默认值（没有人回答问题时按这个做）

- 单次最多列 500 项，登记超参。
- 跳过 `.git`、`node_modules`。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- `../` 和指向外部的符号链接都被拒绝，有用例。
- 用真实 Git 仓库测改动标记。

## 不要做

- 不提交（调度器提交）
- 不改上面清单之外的文件
- 不返回文件内容，预览走 DSH 现有的工作区文件接口
