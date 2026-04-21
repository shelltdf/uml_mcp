# md-mv-core 物理规格

## 围栏块语法

- 围栏首行必须为以下之一（整行，前后无其它字符）：`` ```mv-model-sql ``、`` ```mv-model-kv ``、`` ```mv-model-struct ``、`` ```mv-model-codespace ``、`` ```mv-model-interface ``、`` ```mv-view ``、`` ```mv-map ``。
- 围栏内为 **单个 JSON 对象**（允许首尾空白）；解析前对体文本 `trim()` 后 `JSON.parse`。
- 闭合围栏：行首为换行后的 `` ``` ``（即序列 `\n` + `` ``` ``）。

## mv-model-sql（Model · 多子表）

语义：**一个** `` ```mv-model-sql `` 围栏表示 **一个 Model 组**（**Model**），内含 **多张** SQL 风格子表（`tables[]`）。围栏级 `id` 在 **同一文件内** 与其它围栏块唯一。每个子表有独立的 `id`（**组内唯一**）、可选 `title`、固定列 `columns`、行 `rows`；列与行的校验规则与旧版单表一致（仅允许声明列键；非 `nullable` 列每行必须出现）。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | **Model 组** id，文件内唯一 |
| title | string? | 可选组标题 |
| tables | array | **至少一项**。每项为子表对象：必填非空 `id`（组内唯一）、可选 `title`、`columns`（非空数组，列定义同下表）、`rows`（数组，每行为对象） |

**子表 `columns[]` 列项**：必填 `name`（同子表内不重复），可选 `type`、`nullable`、`primaryKey`、`unique`、`defaultValue`（标量 JSON）、`comment`（string）。

**行与主键**：凡 `primaryKey: true` 的列，**同子表内各行**在这些列上的取值 **组合**（按 `columns[]` 中出现顺序）须 **唯一**；重复则解析失败。列名 **`id`** 在 Workbench 新建子表 / 插入 ``mv-model-sql`` 时默认 **`primaryKey` + 非可空**（画布内编辑时亦约束主键不可重复）。

**View 绑定**：`` ```mv-view `` 的 `modelRefs` 指向子表时，同文件写 **`{Model块id}#{子表id}`**；若该 Model 块仅含 **一张** 子表，可省略 `#子表id` 仅写块 id。跨文件写 **`ref:相对路径.md#块id#子表id`** 或（单子表块）**`ref:相对路径.md#块id`**（见 `parseRefUri`：`ResolvedRef.tableId`）。

校验失败时：记录错误并 **不** 收录该块；同文件其它块仍可解析。

## mv-model-kv（文档型集合 / MongoDB 类比）

语义：**一个** `` ```mv-model-kv `` 围栏表示 **无固定列 schema** 的文档数组（类比 MongoDB **collection**：每条为独立 BSON/JSON **对象**）。同一 Markdown 可有多个块；`id` 在文件内与其它围栏块唯一。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 文件内唯一 |
| title | string? | 可选标题 |
| documents | array | 每项须为 **JSON 对象**（非 `null`、非数组）；键值结构自由 |

## mv-model-struct（层次结构 / HDF5 类比）

语义：**一个** `` ```mv-model-struct `` 围栏表示 **单根树**：根节点为 **组**（Group），可递归包含子组与子 **数据集**（Dataset，类比 HDF5）。`id` 在文件内与其它围栏块唯一。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 文件内唯一 |
| title | string? | 可选标题 |
| root | object | **根组**：必填非空 `name`（string）；可选 `attributes`（object）、`groups`（`root` 同形对象数组）、`datasets`（对象数组，每项必填非空 `name`，可选 `dtype` string、`data` 任意 JSON） |

## mv-model-codespace（软件模型 / 代码空间示意）

语义：**一个** `` ```mv-model-codespace `` 围栏表示 **仓库或工作区结构的文档化示意**（逻辑模块、可选的嵌套命名空间与 UML 风格类型/关联），**不是**真实文件系统、AST 或运行时代码树。`id` 在文件内与其它围栏块唯一。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 文件内唯一 |
| title | string? | 可选标题 |
| workspaceRoot | string? | 可选工作区根路径片段（示意） |
| modules | array | **至少一项**。每项为 **模块** 对象（见下表 `modules[]`） |

### `modules[]` 模块对象

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | **本围栏 JSON 内全局唯一**（与下文所有命名空间、类、变量、函数、宏、关联的 `id` 不得重复） |
| name | string | 必填非空 |
| path | string? | 仓库内相对路径或逻辑位置（示意） |
| role | string? | 如 lib / app / tool |
| notes | string? | 说明 |
| namespaces | array? | 可选；**命名空间树根列表**，每项为 `MvCodespaceNamespaceNode` 同形对象（可递归 `namespaces`） |

### 全局 `id` 唯一与引用规则（v1）

- 下列实体的 `id` 在同一围栏对象内 **全局唯一**：各 `modules[].id`、各命名空间节点、各 `classes[]`、各 `variables[]` / `functions[]` / `macros[]`、各 `associations[]`。
- **`classes[].id`（Classifier）**：`bases[].targetId`、`associations[].fromClassifierId` / `toClassifierId`、`member[]` / `properties[]` 上的 **`associatedClassifierId`**（若存在）**必须**指向本围栏内某条 **`classes[].id`**（可跨模块下的不同命名空间，但须在同一 JSON 块内已声明）。**不**使用 `qualifiedName` 做解析。
- **宏**：`macros[]` 为文档化预处理宏示意，**不**执行。

### UML 概念映射（文档化类比，非 OMG 规范替代）

| JSON / 语义 | UML 类比 |
|-------------|----------|
| `modules[]` | 逻辑子系统 / 分包边界（不必 1:1 Package） |
| `namespaces` 递归树 | 嵌套 **Package** / **Namespace** |
| `classes[]` + `kind` | **Classifier**（`class` / `interface` / `struct` 为文档化子集） |
| `bases[]` + `generalization` | **Generalization**（继承） |
| `bases[]` + `realization` | **InterfaceRealization**（实现） |
| `associations[]` + `association` / `aggregation` / `composition` / `dependency` | **Association** / **Shared aggregation** / **Composition** / **Dependency**（仅示意，具体严格语义以团队约定为准） |
| `members[]` | 属性 / 操作 / 枚举字面量等 **StructuralFeature** 的轻量列表 |
| `variables[]` / `functions[]` | 命名空间级 **属性** / **行为** 的示意（非类成员时） |

### `namespaces[]` 节点（`MvCodespaceNamespaceNode`）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 必填；全局唯一 |
| name | string | 必填非空 |
| qualifiedName | string? | 人类可读全名，不参与引用解析 |
| notes | string? | 说明 |
| namespaces | array? | 子命名空间（同形递归） |
| classes | array? | **Classifier** 列表（见下） |
| variables | array? | 每项：`id`、`name` 必填；可选 `type`、`notes` |
| functions | array? | 每项：`id`、`name` 必填；可选 `signature`、`notes` |
| macros | array? | 每项：`id`、`name` 必填；可选 `params`、`definitionSnippet`、`notes` |
| associations | array? | **类级关联**（见下） |

### `classes[]`（Classifier）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 必填；全局唯一；可被 `bases` / `associations` 引用 |
| name | string | 必填非空 |
| kind | string? | 可选；缺省视为 `class`；允许值：`class`、`interface`、`struct` |
| qualifiedName | string? | 可选 |
| notes | string? | 可选 |
| abstract | boolean? | 可选 |
| stereotype | string? | 可选（如文档化版型名） |
| templateParams | string[]? | 可选；模板形参名列表（示意） |
| bases | array? | 每项：`targetId`（string，指向本块内 `classes[].id`）、`relation`：`generalization` \| `realization` |
| member | array? | **字段 / 普通成员变量**；每项：`name`（必填）；可选 `static`、`visibility`、`accessor`（`none` \| `get` \| `set` \| `getset`）、`type`、`associatedClassifierId`（string，指向本块内另一侧 Classifier 的 `classes[].id`，用于从类图/关联推导该成员类型）、`typeFromAssociation`、`notes` |
| method | array? | **方法**；每项：`name`（必填）；可选 `static`、`visibility`、`virtual`、`methodKind`、`operatorSymbol`、`signature`、`type`、`typeFromAssociation`、`notes` |
| enum | array? | **枚举字面量**（JSON 键名 `enum`）；每项：`name`（必填）；可选 `enumGroup`、`type`、`notes` |
| properties | array? | **属性（property）示意**；每项：`name`（必填）；可选 `backingFieldName`、`backingVisibility`、`type`、`associatedClassifierId`（语义同 `member[]`）、getter/setter 相关布尔与可见性等（见工作台实现） |
| members | array? | **已弃用**：旧版混排数组（`kind`：`field` \| `method` \| `enumLiteral`）。解析器在校验通过后**归并**为 `member` / `method` / `enum` 并移除 `members`；**不得**与上述三键同时出现；其中 **`kind` 为 `field` 时可含 `associatedClassifierId`**，其它 kind 不允许 |

### `associations[]`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 必填；全局唯一 |
| kind | string | 必填；`association` \| `aggregation` \| `composition` \| `dependency` |
| fromClassifierId | string | 必填；指向 `classes[].id` |
| toClassifierId | string | 必填；指向 `classes[].id` |
| fromEnd | object? | 可选：`role`、`multiplicity`（string）、`navigable`（boolean） |
| toEnd | object? | 同上 |
| notes | string? | 可选 |

**向后兼容**：不提供 `namespaces` 时，校验行为与仅扁平 `modules[]` 的历史版本一致。

## mv-model-interface（接口模型 / 接口图示意）

语义：**一个** `` ```mv-model-interface `` 围栏表示 **API 或模块间接口面的文档化示意**（端点列表），**不是** OpenAPI/Swagger 等正式契约文件的替代。`id` 在文件内与其它围栏块唯一。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 文件内唯一 |
| title | string? | 可选标题 |
| endpoints | array | **至少一项**。每项须为对象：必填非空 `id`（**块内唯一**）、`name`（string）；可选 `method`、`path`、`notes`（均为 string） |

## mv-view（视图基类 / 可扩展子类型）

语义：**一个** `` ```mv-view `` 围栏描述 **一个视图实例**。逻辑上视为 **视图基类**：公共字段为 `id`、`kind`、`modelRefs`（及可选 `title`）；**具体表现由 `kind` 区分**（类比面向对象中的派生类型）。同一 Markdown 可有多个 `mv-view` 块。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 文件内唯一 |
| kind | string | **已注册子类型**（见 `@mvwb/core` 导出 `MV_VIEW_KINDS` 与 `MV_VIEW_KIND_METADATA`）：含 **全部 `mermaid-*`**（各 Mermaid 图类独立 kind，payload 为对应语法）、`mindmap-ui`、`uml-diagram`（通用 PlantUML）、`uml-class` / `uml-sequence` / `uml-activity`（各专用画布）、`ui-design`（UI 规格画布）等。扩展时追加 `kind`、元数据与画布实现。 |
| modelRefs | string[] | **每个 view 应绑定至少一个 Model 子表地址**（可为多项）：同文件 **`Model块id#子表id`**（单子表块可仅写块 id）；跨文件 **`ref:相对路径.md#块id#子表id`** 或 **`ref:相对路径.md#块id`**（见 `parseRefUri` / `resolveRefPath` / `findMvModelSqlTable`）。 |
| title | string? | 可选视图标题 |
| payload | string? | **子类型相关**载荷（如 Mermaid / PlantUML 文本、脑图 JSON 快照等，由对应 `kind` 解释） |

### `mermaid-*` 与标准 `` ```mermaid`` 镜像（**必须**两段围栏）

当 `kind` 为 **`mermaid-*`** 时，**必须**在 **`` ```mv-view `` 围栏结束之后**（仅中间可隔空白）紧随一个 **标准** `` ```mermaid`` … `` ``` `` 围栏；两段为**独立**代码块。镜像**正文**与 JSON 内 `payload` 表示**同一段 Mermaid 源码**（便于 GitHub、Typora 等仅识别 `` ```mermaid`` 的环境出图）。缺省镜像围栏的 `mv-view`（`mermaid-*`）**解析失败**，该块不进入 `blocks` 列表。

- **解析**：仍只产生 **一条** `ParsedFenceBlock`（`kind: mv-view`）；设置 `mermaidMirror`（起止偏移）且扫描指针跳过镜像段，避免将 `` ```mermaid`` 当作未知围栏阻塞后续解析。若 JSON 内 `payload` 为空（或缺省）而镜像非空，则用镜像正文**填入**内存中的 `payload`；若二者均非空且不一致，**以 JSON 内 `payload` 为准**（镜像视为可由下次保存覆盖）。
- **回写**：`replaceBlockInnerById` 在替换 `` ```mv-view`` 内 JSON 后，若仍存在 `mermaidMirror` 且新 JSON 为 `mermaid-*` 且含 `payload` 字符串，则**同步替换**镜像围栏内正文，使两段保持一致。

## mv-map

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 文件内唯一 |
| rules | array | 每项含 `modelId`、`targetPath`，可选 `template` |

## 块回写

`replaceBlockInnerById(source, blockId, newInnerJson)` 替换 **目标块 id** 对应围栏的 **内层 JSON 体**（不含围栏行），保持该围栏开闭行不变。对带 **`mermaidMirror`** 的 `mv-view`（`mermaid-*`），在成功解析新 JSON 后**额外**替换紧随的标准 `` ```mermaid`` 围栏内正文，使之与新 `payload` 一致。

## 错误语义

- 重复 `id`：后出现的块丢弃并记录错误。
- JSON 无效 / 校验失败：记录错误并跳过该块；同文件其它块仍可解析。
