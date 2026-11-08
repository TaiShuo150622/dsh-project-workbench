# W10 · 可信入口落地前的路径清点

先读 [MAP.md](MAP.md)，再用 [entry-map.json](entry-map.json) 定位具体入口、身份来源与待实施合同。[sources.json](sources.json) 固定工作台 `7264be10387963f4d575d8688ed8573f4c16c8c4` 及 DSH `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` 的文件、读取范围和哈希；[validation.json](validation.json) 只检查静态映射材料。

**关键结论：插件 HTTP callback 没有显式取得请求主体，不等于标准宿主入口未认证。** 固定 DSH 的 `/api` 链先认证 Peer，再将精确 fetch 路由限制为 owner；工作台工具另有真实 agent 对象检查和项目成员限制。它们均未与 Record 的 history incarnation、actor 和当前角色策略完成接线。

本轮产出是 D01 决策材料，未替用户选择身份方案。I01 仍是私有内核、受限命令与正确状态呈现；没有启动宿主、发送项目请求、运行测试、实现认证或外部写入。固定上游实现不证明实际安装版本，也不覆盖任意 carrier 或恶意同进程插件。

`source-inputs/dsh/` 是定向核读的公开源码快照；读取的是实现代码，未读取实际 cookie、token、profile、凭据记录或会话内容。主稿继续以 [W07 七片任务书](../implementation-taskbook/README.md) 为顺序，本包不增加默认切片。
