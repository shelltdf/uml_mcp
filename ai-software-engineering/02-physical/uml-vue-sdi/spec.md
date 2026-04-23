# uml-vue-sdi 物理规格

## 识别规则

| 模式 | 种类 |
|------|------|
| `*.uml.md` | `uml` |
| `*.class.md` | `class` |
| `*.code.md` | `code` |
| `uml.sync.md`（路径名精确匹配，大小写敏感） | `sync` |

## `uml.sync.md` YAML front matter（可选但推荐）

```yaml
---
namespace_root: namespace
uml_root: diagrams
code_impls:
  - root: impl_cpp_project
    code_type: cpp
  # 可继续追加多套实现；每项 root 在契约内唯一
sync_profile: strict
---
```

**产品默认（界面展示）**：未提供 YAML、或字段解析为空时，应用侧将 **命名空间根** 视为 **`namespace`**，**代码实现** 视为一项 `{ root: impl_cpp_project, code_type: cpp }`；`uml_root` 仍为 `diagrams`，`sync_profile` 为 **`strict`**。

| 字段 | 类型 | 说明 |
|------|------|------|
| `namespace_root` | string | **命名空间根**（YAML **标量**，唯一路径）：`*.class.md`、`*.code.md` 及类图/代码图等 UML 侧契约所在树之根；**不**用于放置各 `code_impls` 下的真实源码。可与 `uml_root`、各 `code_impls.root` 同为相对或绝对路径；**默认** **`namespace`**。解析时兼容旧版 **列表**写法，仅取**首项**。旧键名 `namespace_dirs` 仍映射为首项 |
| `uml_root` | string | **UML 根**：被管理的 UML 文件（如 `*.uml.md`）根目录 |
| `code_impls` | `{ root: string; code_type: string }[]` | **代码实现**：可配置多套；每套为唯一 **代码根** `root` 与 **代码类型** `code_type`。解析时按 `root` 去重。**默认**一项：`impl_cpp_project` + `cpp`。**兼容旧版**：`code_roots` + 顶层 `code_type`。**GUI**：添加后 **不可修改** `root` 与 `code_type`（仅可删除后重加） |
| `sync_profile` | `none` \| `strict` | 同步策略；GUI 为下拉框，**默认 `strict`**；未知值在保存时规范为 `strict`（除显式 `none` 外） |

路径约定：`uml_root`、`namespace_root`、各 `code_impls.root` 可为**相对路径**（相对工作区根）或**绝对路径**。界面输入**仅写入契约文本**，不访问文件系统。

**正文（同步规则）**：面向 **AI / 自动化助手** 阅读；规则按策略分节：对 `sync_profile` 为 **`strict`** 时使用 **`## strict`**；为 **`none`** 时可无对应小节或约定空规则。产品 GUI 仅提供 **`none`** 与 **`strict`** 两种取值。

## `*.uml.md`

- UTF-8；可有 `##` 节与说明性引用；**每张图**对应**一个** fenced UML 块（默认 **一张图一个文件**；多图须在 `uml_root` 下拆成多个 `*.uml.md`，见 `uml-vue-sdi/examples/sync-demo/diagrams/`）。
- UML 块语言标识：`mermaid`（默认）；若使用纯文本占位，语言可为 `text` 且不参与渲染。

## `*.class.md`

- **一文件一类**：描述**一个类**的全部契约成员（字段、方法等）；**推荐**脚手架默认类名 **`helloworld`** / **`Helloworld`**（示例见 `uml-vue-sdi/examples/sync-demo/namespace/helloworld.class.md`）。
- 可选 **`<!-- class-md-meta: {"inherits":"…","associations":["…"]} -->`**：仅用于画布上**只读展示**父类名与关联类名（继承/关联语义仍以对应 `*.uml.md` 为准）。
- 推荐结构：

```markdown
# Classes

### MyClass

| Kind | Name | Type | Note |
|------|------|------|------|
| field | x | int | ... |
```

- **画布**（`ClassClassMdCanvas.vue`）：与类图风格一致的 **2D 视口**（中键平移、滚轮缩放、左下缩放 HUD）；主类框可拖拽；**继承 / 关联**以虚线占位类框只读展示；成员编辑以**下方表格**为准（与 `src/lib/classClassMdModel.ts` 解析一致）。

## `*.code.md`

- **放置位置**：须位于某一 **`namespace_root`** 之下（与 `*.class.md` 同命名空间树），**不**放在各 `code_impls` 的代码根目录内（后者仅放真实源码如 `.cpp` / `.h`）。
- **抽象契约**：用 **`## 函数` / `## 全局变量 / 常量` / `## 宏`** 三节 + 表格（列与 `uml-vue-sdi/examples/sync-demo/namespace/globals.code.md` 一致）；**不**要求在此书写**具体语言**源码——与实现语言的映射在 `code_impls` 侧完成。
- **布局注释**：`<!-- code-md-layout:{"v":1,"functionPositions":[],"variablePositions":[],"macroPositions":[]} -->`，各数组与对应表格**行顺序**对齐，供画布卡片坐标使用（`src/lib/codeMdModel.ts`）。
- **画布**（`CodeMdCanvas.vue`）：**2D 视口**；**左侧竖向工具栏**（仅图标）新建函数 / 变量 / 宏；卡片按类别着色，可拖拽、删除，**底部表单**编辑选中项字段并写回 Markdown。

## 应用行为（MVP）

- **主窗口顶区（页内）**：DOM 上 **标题条**（`#title-strip`，含 favicon + 产品名）与 **菜单栏**（`nav#menu-bar`，`role="menubar"`）为**纵向两行**。顶层菜单顺序：**文件 → 语言 → 主题 → 窗口 → 帮助**。**语言**子菜单默认仅 **中文、英文** 两项；**主题**为独立顶层菜单（系统/浅/深分项）；**窗口**含恢复「文本内容」「属性」停靠区；**帮助**首项为帮助信息（F1），含文件格式说明与关于对话框。**Log** 窗口正文区最小高度约 240px，无日志时显示占位文案。

## 右侧 Dock 列与分割条

- **布局**：`main.main-mdi` 为横向 flex；**中央** `section.workspace-mdi`（标签 + 画布），**竖向分割条** `div.main-dock-splitter`（`cursor: col-resize`，约 5px 宽），**右侧** `aside.dock-area--right`（**Dock View** `div.dock-view` + **Dock Button Bar** `div.dock-button-bar` 贴右缘，宽约 22px）。
- **主区 ↔ Dock 列宽度**：分割条拖拽调整 `dockWidthPx`（约 160px～主区宽度 58%）；Dock 列可 **最大化**（`dockColumnMaximized`）占更大比例。
- **Dock View 内**：`div.dock-view__stack` 纵向堆叠；**属性**（`PropertiesDock`）在上、**文本内容**（`TextContentDock`）在下（若仅展开其一则占满）。二者同时可见时，中间为 **横向分割条** `div.dock-inner-splitter`（`cursor: row-resize`，约 5px 高），拖拽调整 `dockInnerPropsShare`（属性区占堆叠高度比例，约 18%～82%）。
- **实现文件**：状态与指针逻辑在 `uml-vue-sdi/src/App.vue`；停靠窗口组件为 `PropertiesDock.vue`、`TextContentDock.vue`。
- **属性 · 图类型**：当前标签为 `*.uml.md` 时，在「类型」（文件种类）行下增加 **图类型**：与中央画布一致，取**首个** fenced `mermaid` 代码块中首条非注释行的**首 token**（如 `classDiagram`、`flowchart`、`stateDiagram-v2`）；无块或空块时显示 `—`。选中图中元素或文本选区时，若为 `*.uml.md` 亦显示同一 **图类型** 行（`src/lib/formats.ts`：`inferMermaidDiagramTypeFromMarkdown`）。
- **`uml.sync.md` 客户区**：中央画布在打开同步契约时展示 **表单式 GUI**（`SyncConfigEditor.vue`）：`uml_root` / `namespace_root` 为文本框（路径仅落盘，不访问文件系统）；`namespace_root` **唯一**、不可追加多条；`code_impls` 通过「添加代码实现」**弹窗**先选 **类型**，目录默认 **`impl_<类型>_project`**（与已有项冲突时自动加 `_2`、`_3`…），切换类型会**重算**默认目录；**确定**前校验相对路径在**当前已打开标签路径**中是否已有文件落在该目录下（绝对路径不校验）；列表以**单行**展示「目录 + 类型」；**⋯** 菜单：**修改**（只读说明）、**删除**；`sync_profile` 为 **`none` \| `strict`**（默认 **strict**）。下方为同步规则正文 Markdown（自适应高度）。修改经 `serializeUmlSyncMarkdown` 写回。
- 打开内置示例文件列表（或未来 File System Access）。
- 编辑区为受控文本域；**`*.uml.md` 预览**（`MermaidPreview.vue`）：**非** `classDiagram` 时，Mermaid 将首个 `mermaid` 块渲染为 **SVG**；视口内 **`div.canvas-inner`** 做平移/缩放（中键拖拽、滚轮以指针为锚点缩放）；其下 **`div.canvas-grid`** 为世界坐标 **背景网格**；**`div.uml-svg-scene`** 承载 SVG（`v-html`），左键命中与选中见 `src/lib/mermaidCanvas.ts`；**左下角 HUD**（`div.canvas-hud`）为 **缩放比例 + 还原**；`classDiagram` 时视口加 **`canvas-viewport--class-diagram`** 样式。
- **`classDiagram` 专用画布**（`ClassDiagramCanvas.vue`，在 `MermaidPreview` 内当首个块为 `classDiagram` 且传入 `tabId` 时启用）：**不再**用 Mermaid 静态渲染；**SVG** 绘制类框与连线（**继承 / 关联**路径绘于类框**下方**，避免被遮挡）；类内文本 **`pointer-events: none`**；**类顶圆点**拖拽到父类框以设置 **继承**。**右键菜单**：添加成员/属性/方法、**删除此类**（已无「插入子 class」「管理成员」模态）。**成员解析**（`classDiagramModel.ts`）：先剥离行首 Mermaid 可见性 / `$`（static）再区分属性与方法，**私有（`-`）/ 保护（`#`）/ 包（`~`）** 成员均显示；私有成员行 **斜体** 与略深颜色。**折叠**（类框左上）与 **显示**（右上：继承/关联边可见）及 **快捷键**（左上，默认折叠）写入布局注释 `<!-- uml-class-diagram-layout:{"v":1,"positions","folded","edgeVisibility"} -->`。**左下角 HUD**：**适应 / 原点 / 还原** 为**仅图标**按钮（`title`/`aria-label` 保留说明），以及 **− / 比例 / +**。**关联线**支持 `-->` 与 `..>`（均解析为关联边）。**标签**：未保存时标题名后加 **` ·`**（与 `Tab.isDirty` 一致）。
- 解析失败：预览区显示错误信息字符串，不抛未捕获异常。

## 错误与边界

- 超大文件（>2MB）：仅提示性能警告（可选实现）。
- Mermaid 语法错误：预览区展示 Mermaid 返回的错误文本。
