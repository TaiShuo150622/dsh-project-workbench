# 最终增补来源导航（C11）

先读 [主题导航](SOURCE_INDEX.md)。它连接原 C07 主体来源册与后续可信入口、推进条件、证据争议、跨宿主协议、资源生命周期和旧设计沿革。原 C07 的内容、读取范围与计数不被覆盖。

本目录是**本地书目与证据关系整理**，冻结于 **2026-11-08 09:49:56 UTC**；没有重新阅读网络正文或运行产品。原来源元数据保留在研究包原位置，新索引只保留相对 catalogue 路径、原文件 SHA、JSON pointer、版本与原声明读取范围，不复制个人绝对路径。

需要逐条追溯时，使用：

- [增补记录](supplement-index.json)：14 份后续元数据文件中的 135 条出现记录；含代码、复核、设计沿革和重复镜像，不能称 135 篇文章。
- [联合地址索引](union-url-index.json)：289 个精确地址键，其中 288 个 HTTP(S) 地址、1 个原 C07 历史本地地址。相同地址只共享查找键，主张和读取观察仍分开。
- [读取关系](reading-relations.json)与[同文表示/版本关系](representation-relations.json)：保留 root 复核、精确镜像、固定文件的页面/raw 表示，以及不能合并的旧新协议版本。
- [计数口径](COUNTING.md)、[机器计数](counts.json)、[冻结输入清单](manifest.json)。
- [脱敏影响清单](redaction-impact.json)：只列原 catalogue 内将受 home/tmp 脱敏影响的字段 pointer，不复制路径值。

将**整个研究目录**保留相对结构后，在本目录运行：

```sh
PYTHONDONTWRITEBYTECODE=1 python3 build_supplement.py --frozen
PYTHONDONTWRITEBYTECODE=1 python3 validate_portable.py
```

默认研究根只由脚本所在位置推导，不尝试寻找原工作树。只有本目录而没有原 catalogue/C07 元数据时，应当失败；不会跳过缺失输入。运行会更新当前副本的生成结果与校验时间。`build_supplement.py --frozen` 用于原始字节输入；已经脱敏的分享包只运行 `validate_portable.py`，不把它重新生成成一个假装来自原始字节的新索引。

本次还从 checkout 外的临时分享副本实际运行 C07 的便携校验与 C11 生成/校验，并检验缺少 catalogue、缺少主题稿时是否正确失败。回执见 [portable-execution-receipt.json](portable-execution-receipt.json)；[validation_receipt.json](validation_receipt.json)记录原始副本的指纹、pointer、关系及本地链接检查。

另在第二个分享副本中模拟**目录元数据脱敏**，记录准确的 `DERIVATION.json files[path, original_sha256, derived_sha256]` 后运行验证，结果见 [redacted-validation-receipt.json](redacted-validation-receipt.json)。验证器不会跳过 SHA：原字节须匹配原 SHA；派生字节须同时匹配同路径的原 SHA 与实测派生 SHA，并继续比对索引中保留的主张与读取范围。缺派生记录、错误派生 SHA，以及更改读取范围后重新填写派生 SHA，均必须失败。

原始副本可携带通过、这次元数据脱敏样本通过、根代理最终分享包通过，是三个不同结果。**最终实际导出包尚未由 C11 验证**，必须在其中再运行 `python3 china/final-sources/validate_portable.py`。这不证明远端可访问性、来源为真、脱敏政策完整、派生清单独立可信或宿主验收通过。

原始 JSON 中历史上已有的绝对路径字段没有被修改；C11 新生成文件没有这些个人路径。验证器不会使用原 JSON 的绝对路径访问文件。复制出的原始证据仍需按最终分享包边界处理，不因可携带校验通过而自动成为可公开材料。
