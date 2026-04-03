# 接口设计（程序间）

## 范围说明

本文件**仅**描述程序间接口；**不含** GUI 菜单、快捷键、画布操作（见 `product-design.md` / `software-design.md` / `02-physical`）。

## 当前状态

- **MVP**：无对外 HTTP/gRPC 服务；预留 **MCP 工具**（未来可由 Node 封装读写工作区）时在 `02-physical` 增补 JSON 载荷形状。

## 预留

- `POST /api/sync/preview`（若未来增加本地代理）：请求体为「类 FQN + 文件路径」，响应为差异摘要。**未实现前勿在文档中写死字段**。
