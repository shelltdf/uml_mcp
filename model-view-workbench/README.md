# Model-View Workbench（MD-centric）

以 **Markdown 为唯一落盘格式**，用围栏块表达 **model / view / map**，支持浏览器 SPA、Electron、VS Code Webview 三壳共用 `packages/core` 与 `apps/web` 构建产物。其中 **Model 围栏**含 **`mv-model-sql`**（一个围栏内多张 SQL 风格子表）、**`mv-model-kv`**（文档型集合，MongoDB 类比）、**`mv-model-struct`**（层次组/数据集，HDF5 类比）、**`mv-model-codespace`**（工作区、`modules[]`，及可选递归 `namespaces` 与 UML 风格 Classifier/关联等示意）、**`mv-model-interface`**（接口端点列表，接口图示意）；**`mv-view`** 在契约上视为 **视图基类**，由 JSON 字段 **`kind`** 区分具体子类型；Workbench 为 **每个 kind 约定独立画布窗口**（`mermaid-*` 图源画布、脑图、**`uml-*` 独立 JSON 记录画布**、UI 设计等；`mv-model-sql` 画布内可对当前子表做只读行集预览）。详见 `packages/core` 的 `MV_VIEW_KINDS`、`MV_VIEW_KIND_METADATA` 与 `02-physical/md-mv-core/spec.md`。

## 核心与扩展边界

- 核心层（`packages/core`）只保证 `mv-*` 围栏解析、统一 JSON 契约与 `uml-*` 独立记录格式（`mvwb-uml/v1`）。
- `mermaid` 围栏镜像与 `@startuml` 语法均视为**扩展/插件能力**：可选、可替换，不应成为核心可用性的前置依赖。
- 对 `mermaid-*`，核心支持“有镜像则同步、无镜像也可解析”的兼容策略；上层产品可按场景决定是否启用镜像增强。

## UML 记录格式

`mv-view.kind` 为 `uml-*` 时，`payload`（非空）可为 **JSON 对象**（推荐）或 **JSON 字符串**（兼容），其对象内容需满足：

- `schema = "mvwb-uml/v1"`
- `diagramType` 与 `kind` 一一对应（见下表）
- 对 `uml-class`，额外要求 `classes[]` 与 `relations[]` 的核心字段（`id/name/from/to`）合法

| `kind` | `payload.diagramType` |
|------|------------------------|
| `uml-diagram` | `generic` |
| `uml-class` | `class` |
| `uml-object` | `object` |
| `uml-package` | `package` |
| `uml-composite-structure` | `composite-structure` |
| `uml-component` | `component` |
| `uml-deployment` | `deployment` |
| `uml-profile` | `profile` |
| `uml-usecase` | `usecase` |
| `uml-sequence` | `sequence` |
| `uml-state-machine` | `state-machine` |
| `uml-communication` | `communication` |
| `uml-timing` | `timing` |
| `uml-interaction-overview` | `interaction-overview` |
| `uml-activity` | `activity` |

## Payload 写法约定

- JSON 型视图（如 `uml-*`、`mindmap-ui`、`ui-design`）推荐 `payload` 直接写 JSON 对象。
- 文本型扩展（如 `mermaid-*`）保持 `payload` 字符串语义；可搭配 `` ```mermaid `` 镜像段承载正文。
- `@startuml` 片段视为插件层文本示例，不属于 `mv-*` 核心 JSON 契约。
- 示例与详细约定见 [`examples/sample-workspace/PAYLOAD_RULES.md`](examples/sample-workspace/PAYLOAD_RULES.md)。
- 面向用户可读的 schema 文档中心见 [`schema/README.md`](schema/README.md)。
- 当前版本规范见 [`schema/versions/1-2026-04-22.md`](schema/versions/1-2026-04-22.md)。
- schema 变更记录见 [`schema/CHANGELOG.md`](schema/CHANGELOG.md)。
- 本版重点：
  - `mv-model-codespace` class 字段统一为复数：`members/methods/enums/properties`
  - `uml-class` 同步语义：`association` 为成员/属性级，`dependency` 为 class 级

## 结构

| 路径 | 说明 |
|------|------|
| `packages/core` | 解析 `mv-model-sql` / `mv-model-kv` / `mv-model-struct` / `mv-model-codespace` / `mv-model-interface` / `mv-view` / `mv-map`、块回写、引用工具（纯 TS） |
| `packages/mermaid` | Mermaid 类图（`classDiagram`）解析/序列化与布局注释能力（扩展包，与 core 解耦） |
| `apps/web` | Vue3 + Vite 工作区 UI |
| `apps/electron` | Electron 壳（磁盘工作区、独立块窗口） |
| `vscode-extension` | VS Code/Cursor 扩展（加载 `media/app` 静态资源） |
| `examples/` | **本仓库自带**示例与测试用工作区（见 [`examples/README.md`](examples/README.md)）；与仓库根其它 `examples/` 无耦合 |

## OOP 分层（进行中）

- `Domain`：领域策略与值对象（示例：`packages/core/src/domain/uml/UmlDiagramTypePolicy.ts`）。
- `Application`：用例/服务与契约接口（示例：`packages/core/src/application/services/UmlViewPayloadValidator.ts`）。
- `Infrastructure`：解析器/编解码/引用解析适配（示例：`packages/core/src/infrastructure/**`）。
- `Presentation`：Vue 组件只负责渲染与事件转发，交互规则逐步迁移到服务对象（示例：`apps/web/src/application/services/UmlCanvasInteractionService.ts`）。

## 命令

```bash
npm install
npm test
npm run build
npm run dev:web          # 先 build @mvwb/core + @mvwb/mermaid，再 Vite 开发
npm run dev:electron     # 先 build core + mermaid + web，再以 Electron 打开 dist
python run_exe.py        # 同上：先 npm run build 再启动 Electron 套壳
npm run build:vscode     # build + 复制 dist 到扩展 + tsc 编译扩展
```

### 迁移提示（Mermaid 拆包）

- `@mvwb/core` 不再导出 `slug`、`parseViewPayloadClassDiagram`、`buildClassDiagramViewPayload` 等 Mermaid 类图 API。
- 相关调用请改为从 `@mvwb/mermaid` 导入。
- 详细替换示例见 [`MIGRATION.md`](MIGRATION.md)。

物理规格与块语法见仓库 [`ai-software-engineering/02-physical/md-mv-core/spec.md`](../ai-software-engineering/02-physical/md-mv-core/spec.md)。

## 许可证

运行时依赖见根目录 [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md)（若与仓库根汇总合并，可在此 README 注明）。
