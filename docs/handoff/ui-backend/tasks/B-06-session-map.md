depends: B-02-display-status, B-04-library, B-05-project-goal
verify: node --test tests/map.test.mjs && npm test && node scripts/mutation-check.mjs && npm run build

# B-06-session-map

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

实现 `map` 接口，输出会话地图的节点和边，边上带证据。

## 类别

写代码

## 只许改 / 新建的文件

- `server/map.js`（新建）
- `index.js`
- `config/hyperparams.yaml`
- `scripts/build.mjs`、`scripts/mutation-check.mjs`
- `tests/map.test.mjs`（新建）

## 步骤

1. 写纯函数 `buildMap({project, goal, statuses, lineage, changedFiles})`。
2. 根节点是目标，没有目标时是总对话。线程挂在下面，边 `member`。
3. `dependsOn` 出 `depends`。
4. 子智能体从线程会话的 `subagent/descriptor` 事件取，分支从 `forkedFrom` 和 `parentSession` 取。
5. 两条线程改动文件有交集时出 `inferred`，`evidence.files` 写交集。
6. 超过节点上限时把已解决的折叠，`truncated` 写数量和原因。

## 默认值（没有人回答问题时按这个做）

- 节点上限 200，登记超参。
- 交集只算工作树线程。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- `dependsOn` 有环时不崩。
- 状态变化前后 `nodes` 的 ID 和顺序不变。
- `inferred` 的证据文件真在两边的改动里。

## 不要做

- 不提交（调度器提交）
- 不改上面清单之外的文件
- 不算坐标，不写布局
