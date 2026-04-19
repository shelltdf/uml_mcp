# md-mv-core 物理规格

## 围栏块语法

- 围栏首行必须为以下之一（整行，前后无其它字符）：`` ```mv-model ``、`` ```mv-model-kv ``、`` ```mv-model-struct ``、`` ```mv-view ``、`` ```mv-map ``。
- 围栏内为 **单个 JSON 对象**（允许首尾空白）；解析前对体文本 `trim()` 后 `JSON.parse`。
- 闭合围栏：行首为换行后的 `` ``` ``（即序列 `\n` + `` ``` ``）。

## mv-model（表）

语义：**一个** `` ```mv-model `` 围栏表示 **一张表**（固定列 `columns` + 行数据 `rows`）。同一 Markdown 中可包含 **多个** `` ```mv-model `` 围栏，即 **多张表**；每张表以 `id` 标识，且在 **同一文件内** `id` 必须唯一（与其它块类型共用唯一性规则）。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 文件内唯一 |
| title | string? | 可选表标题（展示用） |
| columns | array | **至少一项**。每项为列定义：必填 `name`（非空字符串、同表内不重复），可选 `type`、`nullable`、`primaryKey`（boolean，多列 true 表示联合主键，设计用）、`unique`（boolean，设计用）、`defaultValue`（仅标量 JSON：字符串、数字、布尔、null）、`comment`（string） |
| rows | array | 每元素为一 **行**（JSON 对象）。**仅允许**出现在 `columns[].name` 中的键；对 `nullable !== true` 的列，每一行 **必须** 包含该键 |

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

## mv-view（视图基类 / 可扩展子类型）

语义：**一个** `` ```mv-view `` 围栏描述 **一个视图实例**。逻辑上视为 **视图基类**：公共字段为 `id`、`kind`、`modelRefs`（及可选 `title`）；**具体表现由 `kind` 区分**（类比面向对象中的派生类型）。同一 Markdown 可有多个 `mv-view` 块。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 文件内唯一 |
| kind | string | **已注册子类型**（见 `@mvwb/core` 导出 `MV_VIEW_KINDS` 与 `MV_VIEW_KIND_METADATA`）：含 `table-readonly`、**全部 `mermaid-*`**（各 Mermaid 图类独立 kind，payload 为对应语法）、`mindmap-ui`、`uml-diagram`（通用 PlantUML）、`uml-class` / `uml-sequence` / `uml-activity`（各专用画布）、`ui-design`（UI 规格画布）等。扩展时追加 `kind`、元数据与画布实现。 |
| modelRefs | string[] | **每个 view 应绑定至少一个 Model 地址**（可为多项）：同文件写该文件内 `` ```mv-model `` 的 JSON **`id`**；其它 `.md` 内写 **`ref:相对路径.md#块id`**（`#` 后为目标文件中 model 的 `id`；相对路径相对于**当前 view 所在 .md** 的目录，见包内 `parseRefUri` / `resolveRefPath`）。工作台预览与画布在具备工作区多文件内容时可解析 `ref:`。 |
| title | string? | 可选视图标题 |
| payload | string? | **子类型相关**载荷（如 Mermaid / PlantUML 文本、脑图 JSON 快照等，由对应 `kind` 解释） |

### `mermaid-*` 与标准 `` ```mermaid`` 镜像（普通 MD 兼容）

当 `kind` 为 **`mermaid-*`** 时，允许在 **`` ```mv-view `` 围栏结束之后**（仅中间可隔空白）紧随一个 **标准** `` ```mermaid`` … `` ``` `` 围栏，其**正文**与 JSON 内 `payload` 表示**同一段 Mermaid 源码**（便于 GitHub、Typora 等仅识别 `` ```mermaid`` 的环境出图）。

- **解析**：仍只产生 **一条** `ParsedFenceBlock`（`kind: mv-view`）；若识别到镜像围栏，则设置 `mermaidMirror`（起止偏移）且扫描指针跳过该段，避免将 `` ```mermaid`` 当作未知围栏阻塞后续解析。若 JSON 内 `payload` 为空（或缺省）而镜像非空，则用镜像正文**填入**内存中的 `payload`；若二者均非空且不一致，**以 JSON 内 `payload` 为准**（镜像视为可由下次保存覆盖）。
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
