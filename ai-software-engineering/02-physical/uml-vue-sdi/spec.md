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
namespace_dirs:
  - include/MyProj
  - src/MyProj
uml_root: diagrams
code_roots:
  - src
  - include
sync_profile: strict
---
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `namespace_dirs` | string[] | 与命名空间对应的磁盘目录（相对工作区根） |
| `uml_root` | string | UML `*.uml.md` 默认根（相对工作区根） |
| `code_roots` | string[] | 代码同步搜索根 |
| `sync_profile` | string | 预留：`strict` / `relaxed` |

正文 Markdown：自由文本，描述 **规则**（评审顺序、谁改谁、PR 检查项）。

## `*.uml.md`

- UTF-8；零个或多个 `##` 节；每节内零个或多个 fenced 块。
- UML 块语言标识：`mermaid`（默认）；若使用纯文本占位，语言可为 `text` 且不参与渲染。

## `*.class.md`

- 推荐结构：

```markdown
# Classes

### MyClass

| Kind | Name | Type | Note |
|------|------|------|------|
| field | x | int | ... |
```

## `*.code.md`

- 分节标题 + fenced code；语言标签与下游工具链一致（如 `cpp`）。

## 应用行为（MVP）

- **主窗口顶区（页内）**：DOM 上 **标题条**（`#title-strip`，含 favicon + 产品名）与 **菜单栏**（`nav#menu-bar`，`role="menubar"`）为**纵向两行**。顶层菜单顺序：**文件 → 语言 → 主题 → 帮助**。**语言**子菜单默认仅 **中文、英文** 两项；**主题**为独立顶层菜单（系统/浅/深分项）；**帮助**首项为帮助信息（F1），含文件格式说明与关于对话框。**Log** 窗口正文区最小高度约 240px，无日志时显示占位文案。
- 打开内置示例文件列表（或未来 File System Access）。
- 编辑区为受控文本域；预览调用 Mermaid 将最近一次有效内容渲染为 SVG。
- 解析失败：预览区显示错误信息字符串，不抛未捕获异常。

## 错误与边界

- 超大文件（>2MB）：仅提示性能警告（可选实现）。
- Mermaid 语法错误：预览区展示 Mermaid 返回的错误文本。
