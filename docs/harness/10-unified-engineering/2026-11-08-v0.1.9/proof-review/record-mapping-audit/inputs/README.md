# R-04 · Record S1 实现精化对照

先读 [报告](REPORT.md)，再按需要打开 [结构化矩阵](refinement-matrix.json)、[实际短轨迹](TRACES.md)、[执行回执](execution_receipt.json) 和 [输入身份清单](inputs.json)。产品冻结于 `7264be10387963f4d575d8688ed8573f4c16c8c4`；研究规格按各自内容 SHA 固定。

本轮 20 条选定现有测试通过；8 条派生探针的断言全部通过，其中 5 条明确复现了“把 S1 映射得过强”的反例，3 条确认内存边界行为。这里没有真实网络、身份认证、持久化或目标端效果测试，原 C01–C16 conformance 仍未运行。

## 复跑

在本目录运行以下命令。Node 使用本机现有版本，实际版本在回执中；无需安装依赖。探针会先验证复制源码和测试的 SHA-256，再调用这些与冻结提交逐字相同的文件。

```sh
node refinement-probes.mjs
node --test --test-name-pattern='record (same request retries|failed writes are atomic|acceptance uses immutable|old result button|wrong completion suspends|revert keeps historical|resource reservation excludes|cancellation or authorization change|unknown sent action|successful action and completion|actions are owned|journal replay retains)|R1-P1|R1-P2|R2-S' inputs/tests/record-kernel.test.mjs inputs/tests/record-adversarial-r1-protocol.test.mjs inputs/tests/record-adversarial-r1-correction.test.mjs inputs/tests/record-adversarial-r2-system.test.mjs
shasum -a 256 -c SHA256SUMS
```

第一条只输出实际结果 JSON；第二条只执行匹配名字的测试，未选测试不能计入本轮通过数。结果中的 `COUNTEREXAMPLE_REPRODUCED` 是预期发现，不能改标为真实适配器场景失败；`SCOPED_BEHAVIOR_CONFIRMED` 也不能改标为外部系统通过。

`build-matrix.py` 仅生成审阅元数据并核对引用的测试行号，不是 conformance runner。`inputs/` 中源代码和测试是审阅副本，本轮没有修改工作树原产品文件；回执附有执行前后的源文件散列匹配记录。
