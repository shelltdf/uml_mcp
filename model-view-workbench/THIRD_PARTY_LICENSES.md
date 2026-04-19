# 第三方许可证（Model-View Workbench）

本目录子项目 **运行时** 主要依赖（以各 `package.json` 的 `dependencies` 为准；开发依赖未逐项列出）：

| 包 | 用途 | SPDX |
|----|------|------|
| vue | 前端 UI | MIT |
| marked | Markdown → HTML（预览区） | MIT |
| dompurify | HTML 消毒（预览 `v-html`） | Apache-2.0 / MPL-2.0（以包内为准） |
| @mvwb/core（本地包） | 解析与块逻辑 | 与本仓库同许可策略 |

Electron 壳另含 **electron**（MIT）。构建工具链含 **vite**、**typescript**、**vitest** 等（多为 MIT）。
