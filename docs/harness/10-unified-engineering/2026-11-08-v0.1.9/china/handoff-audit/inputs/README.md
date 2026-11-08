# R12 责任接管与负担连续性

阅读 [讨论稿 v0.1.0](责任接管与负担连续性讨论稿-v0.1.0.md)。这是未接入产品的研究提案，衔接 C08 的责任接纳与 P13 的未结算负担。

本目录内复跑：

```sh
python3 check_handoff.py
python3 verify_handoff.py
```

仅 Python 3.9+ 标准库。第一命令覆盖本目录 results.json/execution_receipt.json，第二命令覆盖 verification_receipt.json；保留历史回执时先复制整个目录再运行。无产品、网络或模型调用。固定输入身份见 inputs.json。

5 配置共 5076 状态、14172 边；两个保守配置无不变量违例，三个错误变体均触发指定违例。第二检查器独立编码直接不变量，但共享转移函数，且由同一研究线编写，不能称独立模型审查。未来由其他线复核。没有新增 Lean/TLC 运行或一般证明。

HTML 是离线阅读视图，Mermaid 以源码显示；未做浏览器视觉验收。
