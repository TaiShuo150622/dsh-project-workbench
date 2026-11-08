# Cordis 定向阅读覆盖与验证边界

2026-11-07 · Codex / mechanisms 研究线

本轮完成相关定义、关键恢复证明与固定实现的定向阅读，未完成 92 页论文的全篇证明审计。下列“读完整证明”只表示逐段阅读该项原文及检查主要推理，不表示对所有引用引理完成递归审计或机械验证。

## 来源固定

- 原论文：Yifan Shi、Wei Zhang、Tianyi Cui，A Programming Paradigm for Spatiotemporal Composability，arXiv:2608.25512v1，2026-08-26；[原 PDF](https://arxiv.org/pdf/2608.25512v1)。
- PDF 共 92 页；本次读取字节的 SHA-256：`390775dbc9debdcf2ed1b076eed013387ca057630be3cb594617b2b742e48cf0`。
- 本文页码统一为 PDF 显示的 1-based 页码；web 工具的 P58 是 PDF 第 59 页。
- DSH：`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`；commit 日期 2026-11-04T08:40:00Z；vendored Cordis package version 4.1.0。
- 所有在线访问均为 2026-11-08 UTC。研究材料署名日期按 America/Los_Angeles 为 2026-11-07。

## 论文覆盖

| 部分 | 阅读深度 | 具体内容与保留项 |
| --- | --- | --- |
| 首页、摘要、目录 | 已读 | 核对三位作者及对应单位、版本与章节结构；不依据摘要的宽泛描述直接推工程保证 |
| §2 基础背景 | 未系统读 | 没有复核整段 monad、effect/coeffect 文献介绍及全部历史归属 |
| §3.1，pp. 9–16 | 相关定义及证明已读 | Def. 1–3、6、8–9、17–18；Thm. 4/5/7/15/16 的证明逐段读；不是该节所有定义、推论完整审计 |
| §3.2，pp. 17–21 | 定义已读、部分延伸读 | Def. 19–22 完整；isolation/interception 的相关定义和语义段落阅读；没有证明全部实现场景 |
| §3.3，pp. 21–25 | 指定定义与一个引理证明已读 | Def. 29–34；Lemma 32 证明；没有完整递归核验 Def. 35–39 与全部后续引用关系 |
| §3.4，pp. 26–30 | 本轮核心 | Def. 40/42/44/46；Lemma 41、Thm. 43/45/47 完整证明已读；核对 cross forward/inverse、outcome/continuation 条件及有序链反例 |
| §4.1，pp. 31–34 | 部分定义定位 | 状态/registry 单源规则用于理解后续规则；未逐项审计所有约束 |
| §4.2，pp. 35–39 | 指定规则及证明已读 | Def. 52–58、L-Begin/L-Iter/L-Finish/L-Divert/L-Leave/L-Unload；Lemma 57 完整证明已读 |
| §4.3.1，pp. 40–44 | 部分 | Table 1、Lemma 59 完整证明；Lemma 60 只读开头，未完整审计 60–64 |
| §4.3.2，pp. 44–47 | 本轮核心 | Def. 65、Lemma 66/67、Thm. 68、Cor. 69 的声明与完整证明已读；核对比较域和 child-instantiation 的限定 |
| §4.3.3，pp. 47–48 | 本轮核心 | Thm. 70/71 声明与完整证明已读；核对 provider 绑定持续期与 landing 后回收 |
| §4.3.4，pp. 49–50 | 声明与完整证明已读 | Def. 72、Thm. 73；核对有限名字、迭代上界、无环和生命周期规则限定；未推出墙钟终止 |
| §4.3.5，pp. 50–55 | 未完整审计 | 只读开头主张和 Thm. 80 证明结尾/边界；未核完 Lemma 74–79 与 Thm. 80，不能声称验证合流 |
| §4.4，pp. 55–57 | 相关扩展段落已读 | Asynchrony 与 Failure 完整；Isolation/Configuration 局部；没有证明任意异常、清理失败或永久 pending 均在模型内 |
| §5.1，pp. 57–64 | 相关实现映射已读 | Table 2、§5.1.1–5.1.3 及 Algorithms 1–5；§5.1.4 部分；固定源码对照不是机械精化证明 |
| §5.2 loader、§5.3 case study | 未系统读 | 仅定位案例与 threats-to-validity 段落；不报告性能、生产质量或跨生态验证 |
| §6.1–6.3，pp. 70–73 | 本轮核心，相关全文已读 | system boundary、service broker/in-flight wait、access control/sandbox 边界 |
| §6.4–6.7 | 少量上下文 | 检索结果带出的部分段落；不作为本稿主要论据，不称系统审计 |
| §7 related work、§8 conclusion、bibliography | 指定补读，其余未系统读 | 按 root 提示补读 §7.3 Stateful forward migration（pp. 79–80）与 §8 自进化 harness future validation（p. 83）；不作完整优先权/新颖性评价 |
| Sagas，原 ACM 论文 pp. 250、254–255 | 指定段落已读 | compensation 的语义与观察历史；§6 清理失败和人工修复；不移植全部 DBMS 保证 |

## PDF 与公式核查方式

主要通过 arXiv PDF 的文字提取及本机 PyMuPDF 的内存解析阅读。web screenshot 接口返回不可用，因此没有把它当成视觉证据。

为了排除组合符号被文字提取颠倒，对 **PDF 第 59 页 Algorithm 1 与相邻组合约定**进行了内存裁切渲染，并实际查看返回图片。该局部图确认第 6 行为 value∘inverse，而相邻文字采用先右后左的组合约定。仅这一局部做了视觉核验；未声称全部公式经过逐页图像检查。没有落盘保存论文 PDF 或图片。

Algorithm 1 的局部方向疑点以最小数值例独立核对，保留“待作者确认”。它不替代主要定理的审计，也不作为固定 DSH 的已运行缺陷报告。

## 源码覆盖与验证状态

| 路径 | 覆盖 | 验证方式 |
| --- | --- | --- |
| vendor/cordis/src/fiber.ts | effect runner、setup/dispose、epoch、reload/unload、committed、await | 静态调用链与异常路径 |
| vendor/cordis/src/events.ts | snapshot、serial/bail/waterfall、register/unregister/on | 静态次序与函数引用分析 |
| vendor/cordis/src/reflect.ts | provide、部分 service resolution、bind | 静态读取；未全代理安全审计 |
| vendor/cordis/src/utils.ts | DisposableList、基础 tracing 入口 | 静态读取 |
| vendor/cordis/src/context.ts、registry.ts | 背景读取 | 未用于宣称完整 loader/HMR 验证 |
| vendor/cordis/package.json | 包名、版本、作者、license | 元数据核对 |
| docs/cordis-tutorial/02-lifecycle-and-effects.md | 全文 | 与实现清理顺序对照 |
| docs/tool-execution-pipeline.md | 全文 | 只作定位，主要取消主张进一步核到源码 |
| packages/core/tools/src/pipeline.ts | prepare、dispatchToolBody、dispatch、complete、finish | 静态；不是每个策略插件的审计 |
| packages/core/tools/src/contracts.ts、events.ts | cancellation/timeout/wrapper 契约 | 区分 API 义务和实现强制能力 |
| packages/core/tools/src/index.ts | register、admitted tool view、guard | 静态身份重检路径 |
| scripts/cordis-core-lifecycle.spec.ts | 26–100 行完整，其他测试名扫描 | 只读断言，未运行 |
| scripts/cordis-core-api.spec.ts | 只读 | API 文档生成测试，不作资源释放证明 |
| 本工作树 record/README.md | 全文 | 重新确认 S1 模型/集成边界 |

GitHub connector 传输失败后，使用 GitHub 官方 raw URL 与 API 读取固定提交。没有从不明镜像取代码，没有运行下载的仓库代码，没有安装第三方依赖，没有提交或推送。

## 本文反例的证据级别

- P1 是带明确条件的本文代数示例。
- P2/P3 是从指定控制流读出的正例，不是本轮集成测试结果。
- C2/C4/C5/C9 是固定源码的静态执行轨迹；仍需后续最小运行验收。
- C1/C3/C6/C7/C8 是本文用于检查契约边界的短场景，没有指控真实系统已发生事故。
- 数值例仅核对组合方向，不构成整个 calculus 的反驳。
- root 仍须重新打开关键来源，决定哪些结论可进入统一 Harness 总稿。

