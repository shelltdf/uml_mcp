# Model-View Workbench — 示例与测试用工作区

本目录 **`model-view-workbench/examples/`** 仅供本地/人工验证 Workbench 行为，**不是** npm 包的发布内容；与仓库根 `examples/`（若有）相互独立。

## 子目录

| 目录 | 用途 |
|------|------|
| [sample-workspace/](sample-workspace/) | 较完整的单文件演示：`mv-model-sql` 多子表、`mv-view` 多种 `kind`、`mv-map` |
| [codespace-demo/](codespace-demo/) | 最小 **`mv-model-codespace`**（含递归 `namespaces` 与 Classifier）示意 |

## 如何使用

1. 启动 Web：`npm run dev:web`（在 `model-view-workbench/` 根目录）。
2. 在 Workbench 中使用 **打开文件夹**，选中上表某一子目录（或父级 `examples/`），加载其中 `.md`。
3. Electron：`python run_exe.py` 或 `npm run dev:electron` 后同样通过 **打开工作区** 选择目录。

解析与校验规则以 `packages/core` 与 `ai-software-engineering/02-physical/md-mv-core/spec.md` 为准；若示例与规格冲突，以规格与 `packages/core/test/` 为准并应修正本目录下的 Markdown。
