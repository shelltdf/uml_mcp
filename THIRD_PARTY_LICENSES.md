# 第三方许可证（运行时 / 交付物）

本文件汇总**进入最终前端产物**的主要依赖。开发依赖（Vite、Vitest、TypeScript 等）未列入；若需完整 `node_modules` 审计，请在发布前运行 `npm ls --prod` 并补充。

## npm 生产依赖（uml-vue-sdi）

| 包 | 许可证 | 说明 |
|----|--------|------|
| [vue](https://www.npmjs.com/package/vue) | MIT | 运行时框架 |
| [mermaid](https://www.npmjs.com/package/mermaid) | MIT | UML/图表渲染 |

## VSIX 扩展内生产依赖（`uml-vue-sdi/vscode-extension`，打包进 `out/uml-workbench.vsix`）

| 包 | 许可证 | 说明 |
|----|--------|------|
| [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) | MIT | MCP stdio 服务器（`mcp-server.mjs`） |

## Electron 桌面套壳（`npm run electron` / `run_exe.py`）

| 包 | 许可证 | 说明 |
|----|--------|------|
| [electron](https://www.npmjs.com/package/electron) | MIT | 加载 `dist/` 的桌面壳（列为 `uml-vue-sdi` 的 devDependency，随本地运行环境分发） |

## 可选：原始许可证全文

可将 `node_modules/vue/LICENSE`、`node_modules/mermaid/LICENSE` 复制到仓库 `licenses/` 并在本节索引（按需）。
