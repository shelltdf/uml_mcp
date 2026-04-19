# 示例：同文件多 model / view

```mv-model
{
  "id": "person",
  "columns": [
    { "name": "id", "type": "string" },
    { "name": "name", "type": "string" }
  ],
  "rows": [
    { "id": "p1", "name": "Alice" },
    { "id": "p2", "name": "Bob" }
  ]
}
```

```mv-view
{
  "id": "person_table_view",
  "kind": "table-readonly",
  "modelRefs": ["person"]
}
```

```mv-view
{
  "id": "person_class_mermaid",
  "kind": "mermaid-class",
  "modelRefs": ["person"],
  "payload": "classDiagram\n  class Person {\n    +String id\n    +String name\n  }"
}
```

```mv-map
{
  "id": "to_ts",
  "rules": [
    { "modelId": "person", "targetPath": "src/models/person.ts", "template": "interface" }
  ]
}
```
