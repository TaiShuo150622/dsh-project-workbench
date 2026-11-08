# C12 导入边界

根代理仅导入以下精简证据文件；不要复制整个本目录。

| 建议导入 | 用途 |
| --- | --- |
| REVIEW.md | 结论、范围、启动问题与未运行项 |
| IMPORT_SCOPE.md | 当前导入边界 |
| input-manifest.json | 148 个复制输入与 DERIVATION 原/派生身份，不含源码正文 |
| execution-receipt.json | 13 条命令、时间、退出码及输出指纹，工具路径为占位符 |
| launch-receipt.json | screen 启动失败及经授权恢复的记录，不当作模型失败 |
| tool-versions.json | 实际运行版本、架构及工具指纹 |
| comparison.json | 184 条比较条件、两份 Lean、六份结果及 14 个 TLC 配置 |
| final-validation.json | 原导出未变、输入身份和精简材料检查 |
| IMPORT_SHA256SUMS | 上述导入文件的冻结指纹 |

以下仅留本机工作树，不导入最终阅读包：

- `execution-copy/`：全部复制研究目录、原始 stdout/stderr、TLC 状态目录、临时文件、运行进度、baseline 结果和完成标记。包含本机执行路径；没有向外发送。
- 顶层 `DERIVATION.json`、`REPRODUCE.md`、`EVIDENCE.md`：本次读取的冻结导出输入副本，原件已有独立阅读入口，不重复打包。
- `launch_screen.py`、`run_reproduction.py`、`compare_results.py`：本地执行/比较辅助代码，依赖上述未导入执行树；代码指纹进入回执。不要把本地启动器当作解包后的通用命令。

读者若要复跑模型，应使用最终研究包原 REPRODUCE 中的模型入口，并把写同目录的模型复制到新位置。C12 不引入新工具安装要求；没有产品测试或 API 凭据要求。需审查本次辅助代码时，可在原工作树按对应回执 SHA 读取，或另行提供明确范围的辅助包。
