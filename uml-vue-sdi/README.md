# uml-vue-sdi

Vue 3 + Vite 的 **SDI（单窗口多标签）** UML Markdown 工作台：编辑 `*.uml.md` / `*.class.md` / `*.code.md` / `uml.sync.md`，并对 `mermaid` 块做预览。

## 命令

```bash
npm install
npm run dev
npm run build
npm run test
```

或使用同目录脚本：

| 脚本 | 说明 |
|------|------|
| `run_web.py` | 开发服务器（`npm run dev`） |
| `run_exe.py` | Electron 套壳，加载 `dist/`（无则先构建） |
| `build.py` | 构建 Web `dist/`、同步到扩展、`vscode-extension` 编译、打包 `out/uml-workbench.vsix` |
| `install.py` | 若缺 VSIX 则先 `build.py`，再 `cursor`/`code --install-extension` |
| `test.py` / `publish.py` | 测试与发布入口 |

VSIX 内含 **MCP Server**（`mcp-server.mjs`）及运行所需 `node_modules`。在 Cursor/VS Code 的 MCP 配置中使用：`node "<扩展安装目录>/mcp-server.mjs"`，或通过命令面板 **UML Workbench: Copy MCP server launch command** 复制路径。

## 规格与示例

- 见仓库 `ai-software-engineering/02-physical/uml-vue-sdi/spec.md`
- 示例文件：`examples/sync-demo/`
