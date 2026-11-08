# R10 阅读包审查的保存范围

先读 [审查报告](REVIEW.md)。它描述审查线当时的原工作目录；本整合目录保留报告、冻结输入元数据、独立转换核对、执行 stdout/stderr 与回执。

审查线的 `full-package-copy/` 和 `runnable-copy/` 是运行用副本，仍保存在本地原审查工作树，未再次嵌套复制整套旧导出包。其文件身份在 [INPUT_SNAPSHOT.json](INPUT_SNAPSHOT.json)、各执行回执及本轮根目录 NINETEENTH_PASS_MANIFEST.json 中保留。这里没有把原报告改写成最终包已修复通过；修复后的便携校验与最终身份要看后续回执。

因此，报告中的工作目录名称是历史执行位置，不是本整合阅读包保证附带的全部目录。复跑所需的当前原始模型与源码仍由研究根的 REPRODUCE.md 引导，不需要把旧包无限套入新包。
