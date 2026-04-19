# 示例：同文件多张表（多个 mv-model）与视图

每个 `` ```mv-model `` = 一张 **固定列** 表；下面 `person` 与 `order` 为两张表。

```mv-model
{
  "id": "person",
  "title": "人员表",
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

```mv-model
{
  "id": "order",
  "title": "订单表",
  "columns": [
    { "name": "orderId", "type": "string" },
    { "name": "personId", "type": "string" },
    { "name": "amount", "type": "number" }
  ],
  "rows": [
    { "orderId": "o1", "personId": "p1", "amount": 100 },
    { "orderId": "o2", "personId": "p2", "amount": 200 }
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

```mv-view
{
  "id": "person_mindmap",
  "kind": "mindmap-ui",
  "title": "关系脑图（示例）",
  "modelRefs": ["person"],
  "payload": "{\"format\":\"mv-mindmap-v0\",\"nodes\":[{\"id\":\"root\",\"label\":\"人员\"}]}"
}
```

```mv-view
{
  "id": "order_uml",
  "kind": "uml-diagram",
  "title": "订单领域（示例）",
  "modelRefs": ["order"],
  "payload": "@startuml\nentity order\n@enduml"
}
```

```mv-view
{
  "id": "order_class_puml",
  "kind": "uml-class",
  "title": "订单类图（专用画布）",
  "modelRefs": ["order"],
  "payload": "@startuml\nclass Order {\n  +String orderId\n}\n@enduml"
}
```

```mv-view
{
  "id": "seq_checkout",
  "kind": "uml-sequence",
  "title": "下单序列（示例）",
  "modelRefs": ["person"],
  "payload": "@startuml\nparticipant User\nparticipant API\nUser -> API: POST /orders\n@enduml"
}
```

```mv-view
{
  "id": "act_review",
  "kind": "uml-activity",
  "title": "评审活动图（示例）",
  "modelRefs": ["person"],
  "payload": "@startuml\nstart\n:起草;\n:评审;\nstop\n@enduml"
}
```

```mv-view
{
  "id": "ui_screen_board",
  "kind": "ui-design",
  "title": "列表页线框",
  "modelRefs": ["person"],
  "payload": "{ \"screens\": [ { \"id\": \"list\", \"title\": \"订单列表\" } ] }"
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
