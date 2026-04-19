# Model-View Workbench（MD-centric）

以 **Markdown 为唯一落盘格式**，用围栏块表达 **model / view / map**，支持浏览器 SPA、Electron、VS Code Webview 三壳共用 `packages/core` 与 `apps/web` 构建产物。其中 **Model 围栏**含 **`mv-model`**（固定列表）、**`mv-model-kv`**（文档型集合，MongoDB 类比）、**`mv-model-struct`**（层次组/数据集，HDF5 类比）；**`mv-view`** 在契约上视为 **视图基类**，由 JSON 字段 **`kind`** 区分具体子类型；Workbench 为 **每个 kind 约定独立画布窗口**（表视图画布、各 `mermaid-*` 图源画布、脑图、通用/分类 PlantUML、UI 设计等）。详见 `packages/core` 的 `MV_VIEW_KINDS`、`MV_VIEW_KIND_METADATA` 与 `02-physical/md-mv-core/spec.md`。

## 结构

| 路径 | 说明 |
|------|------|
| `packages/core` | 解析 `mv-model` / `mv-model-kv` / `mv-model-struct` / `mv-view` / `mv-map`、块回写、引用工具（纯 TS） |
| `apps/web` | Vue3 + Vite 工作区 UI |
| `apps/electron` | Electron 壳（磁盘工作区、独立块窗口） |
| `vscode-extension` | VS Code/Cursor 扩展（加载 `media/app` 静态资源） |

## 命令

```bash
npm install
npm test
npm run build
npm run dev:web          # 开发 http://localhost:5174
npm run dev:electron     # 先 build web 再以 Electron 打开 dist
python run_exe.py        # 同上：先 npm run build 再启动 Electron 套壳
npm run build:vscode     # build + 复制 dist 到扩展 + tsc 编译扩展
```

物理规格与块语法见仓库 [`ai-software-engineering/02-physical/md-mv-core/spec.md`](../ai-software-engineering/02-physical/md-mv-core/spec.md)。

## 许可证

运行时依赖见根目录 [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md)（若与仓库根汇总合并，可在此 README 注明）。
