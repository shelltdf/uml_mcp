# md-mv-core 物理规格

## 围栏块语法

- 围栏首行必须为以下之一（整行，前后无其它字符）：`` ```mv-model ``、`` ```mv-view ``、`` ```mv-map ``。
- 围栏内为 **单个 JSON 对象**（允许首尾空白）；解析前对体文本 `trim()` 后 `JSON.parse`。
- 闭合围栏：行首为换行后的 `` ``` ``（即序列 `\n` + `` ``` ``）。

## mv-model（表）

语义：**一个** `` ```mv-model `` 围栏表示 **一张表**（固定列 `columns` + 行数据 `rows`）。同一 Markdown 中可包含 **多个** `` ```mv-model `` 围栏，即 **多张表**；每张表以 `id` 标识，且在 **同一文件内** `id` 必须唯一（与其它块类型共用唯一性规则）。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 文件内唯一 |
| title | string? | 可选表标题（展示用） |
| columns | array | **至少一项**。每项为列定义：必填 `name`（非空字符串、同表内不重复），可选 `type`、`nullable` |
| rows | array | 每元素为一 **行**（JSON 对象）。**仅允许**出现在 `columns[].name` 中的键；对 `nullable !== true` 的列，每一行 **必须** 包含该键 |

校验失败时：记录错误并 **不** 收录该块；同文件其它块仍可解析。

## mv-view（视图基类 / 可扩展子类型）

语义：**一个** `` ```mv-view `` 围栏描述 **一个视图实例**。逻辑上视为 **视图基类**：公共字段为 `id`、`kind`、`modelRefs`（及可选 `title`）；**具体表现由 `kind` 区分**（类比面向对象中的派生类型）。同一 Markdown 可有多个 `mv-view` 块。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 文件内唯一 |
| kind | string | **已注册子类型**（见 `@mvwb/core` 导出 `MV_VIEW_KINDS` 与 `MV_VIEW_KIND_METADATA`）：含 `table-readonly`、`mermaid-class`、`mindmap-ui`、`uml-diagram`（通用 PlantUML）、`uml-class` / `uml-sequence` / `uml-activity`（各专用画布）、`ui-design`（UI 规格画布）等。扩展时追加 `kind`、元数据与画布实现。 |
| modelRefs | string[] | **每个 view 应绑定至少一个 Model 地址**（可为多项）：同文件写该文件内 `` ```mv-model `` 的 JSON **`id`**；其它 `.md` 内写 **`ref:相对路径.md#块id`**（`#` 后为目标文件中 model 的 `id`；相对路径相对于**当前 view 所在 .md** 的目录，见包内 `parseRefUri` / `resolveRefPath`）。工作台预览与画布在具备工作区多文件内容时可解析 `ref:`。 |
| title | string? | 可选视图标题 |
| payload | string? | **子类型相关**载荷（如 Mermaid / PlantUML 文本、脑图 JSON 快照等，由对应 `kind` 解释） |

## mv-map

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 文件内唯一 |
| rules | array | 每项含 `modelId`、`targetPath`，可选 `template` |

## 块回写

`replaceBlockInnerById(source, blockId, newInnerJson)` 仅替换 **围栏内 JSON 体**（不含围栏行），保持围栏行与闭合围栏不变。

## 错误语义

- 重复 `id`：后出现的块丢弃并记录错误。
- JSON 无效 / 校验失败：记录错误并跳过该块；同文件其它块仍可解析。
