# 软件设计

## 子系统

1. **Shell（Vue 应用根）**：布局、主题、语言、路由（若仅单页可弱化）。
2. **Workspace**：打开的工程根路径（演示可为内存虚拟根）、活动标签、脏状态。
3. **Format layer**：按扩展名/内容识别 `uml.md` / `class.md` / `code.md` / `uml.sync.md`，提供解析与序列化（MVP 可为轻量解析）。
4. **UML 渲染**：Mermaid 将图表块渲染为 SVG（浏览器内）。
5. **Sync 配置**：读取 `uml.sync.md` 中的 YAML 前置块或约定小节，暴露给 UI 与后续同步引擎。

## 与构建目标对应

- 可交付物：`uml-vue-sdi`（见 `02-physical/README.md`）。

## 技术栈

- Vue 3、TypeScript、Vite；Markdown 编辑可用 `textarea` + 后续替换为 Monaco（MVP 保持简单）。
