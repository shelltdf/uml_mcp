---
namespace_dirs:
  - include/Acme
  - src/Acme
uml_root: diagrams
code_roots:
  - src
  - include
sync_profile: strict
---

# 同步规则

1. **类图变更**时，先更新同主题的 `*.uml.md`，再改 `*.class.md`，最后改 `include/` / `src/` 下头文件与实现。
2. **全局函数或宏**仅出现在 `*.code.md` 与对应翻译单元；不在 `*.class.md` 重复类成员。
3. **命名空间**与目录：`Acme::Net` 对应 `include/Acme/Net` 与 `src/Acme/Net`（示例）。
4. PR 前检查：`diagrams/*.uml.md` 中 Mermaid 块可被渲染；`uml.sync.md` 中路径仍存在于仓库。
