# 组件图（md-mv-core）

```mermaid
flowchart TB
  subgraph pkg [packages_core]
    Parse[parseMarkdownBlocks]
    Replace[replaceBlockInnerById]
    Refs[refs_resolve]
  end
  Parse --> Replace
```
