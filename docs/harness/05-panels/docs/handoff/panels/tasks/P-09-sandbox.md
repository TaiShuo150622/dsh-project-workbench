depends: P-04-shell
verify: node docs/handoff/panels/tools/count-tests.mjs tests/sandbox.test.mjs 16 && npm test && node scripts/mutation-check.mjs && npm run build && npm run e2e -- sandbox

# P-09-sandbox

> 公开整理版；源版本：未编号；整理日期：2026-11-06。保留原稿历史阶段，未重新运行或复测。内部项目实例、个人原话与私有地址不作为公开附件。


## 目标（一句话）

实现第二级：`custom` 面板在沙箱里运行，只靠协议和宿主说话。

## 类别

写代码

## 只许改 / 新建的文件

- `shared/protocol.js`
- `shared/frame-doc.js`
- `runtime/dsh-panel.js`
- `client/sandbox.js`
- `client/registry.js`
- `config/hyperparams.yaml`
- `scripts/build.mjs`
- `scripts/mutation-check.mjs`
- `tests/sandbox.test.mjs`
- `tests/e2e/sandbox.mjs`
- `tests/fixtures/renderers/**`

## 步骤

1. `frame-doc.js` 按契约第 7 节拼文档，CSP 必须是 `<head>` 第一个子元素。渲染器里写了 `</script>`、`<base>`、自带 `<head>`，都不能让 CSP 失效。
2. 相对路径的 `.js`、`.css` 读出后内联，超 `rendererAssetsMaxBytes` 报错。
3. `runtime/dsh-panel.js` 无依赖，协议名字从 `shared/protocol.js` 来。
4. 大数据攒到 `chunkBytes` 再用 transfer 发。
5. 上行校验来源、名字、大小、频率。
6. `visible` 变化下发，`maxLiveFrames` 超了卸载最久没看的，恢复时带 `save` 的状态。
7. e2e 用 `tests/fixtures/renderers/` 的小页面，在真宿主里断言：fetch 外网和本机都被拦，WebGL2、Worker、WASM 能用。

## 默认值（没有人回答问题时按这个做）

- 这张卡先不做人工批准，`custom` 直接运行，P-10 加闸。
- 渲染器崩了显示 `error`，给重试按钮。

## 完成判据

上面的 verify 过。除此之外还要成立的：

- iframe 的 `sandbox` 属性恰好是 `allow-scripts`。
- 页面跳走后 iframe 被移除，显示 `error`，不自动重载。
- 伪造 `event.source`、超大、超频的消息都被丢掉，宿主不崩。
- 去掉 CSP 后 e2e 要红，这条写成变异。

## 不要做

- 不提交，提交由人做
- 不改上面清单之外的文件
- 不给 `allow-same-origin`
- 不把 `spec` 以外的宿主信息传进沙箱
