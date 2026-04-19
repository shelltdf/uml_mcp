# 示例：Model（mv-model-sql · 多子表）与 View（mv-view）

一个 `` ```mv-model-sql `` **Model** 围栏 = 一组 **SQL 风格子表**（`tables[]`）；下面用块 `sql_demo` 内含 `person` 与 `order` 两张子表。**View** 用 `` ```mv-view ``，通过 `modelRefs` 写 **`块id#子表id`** 绑定到某一子表。

```mv-model-sql
{
  "id": "sql_demo",
  "title": "演示 SQL Model 组",
  "tables": [
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
    },
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
  ]
}
```

```mv-view
{
  "id": "person_class_mermaid",
  "kind": "mermaid-class",
  "modelRefs": ["sql_demo#person"],
  "payload": "classDiagram\n  class Person {\n    +String id\n    +String name\n  }"
}
```

```mv-view
{
  "id": "person_mindmap",
  "kind": "mindmap-ui",
  "title": "关系脑图（示例）",
  "modelRefs": ["sql_demo#person"],
  "payload": "{\"format\":\"mv-mindmap-v0\",\"nodes\":[{\"id\":\"root\",\"label\":\"人员\"}]}"
}
```

```mv-view
{
  "id": "order_uml",
  "kind": "uml-diagram",
  "title": "订单领域（示例）",
  "modelRefs": ["sql_demo#order"],
  "payload": "@startuml\nentity order\n@enduml"
}
```

```mv-view
{
  "id": "order_class_puml",
  "kind": "uml-class",
  "title": "订单类图（专用画布）",
  "modelRefs": ["sql_demo#order"],
  "payload": "@startuml\nclass Order {\n  +String orderId\n}\n@enduml"
}
```

```mv-view
{
  "id": "seq_checkout",
  "kind": "uml-sequence",
  "title": "下单序列（示例）",
  "modelRefs": ["sql_demo#person"],
  "payload": "@startuml\nparticipant User\nparticipant API\nUser -> API: POST /orders\n@enduml"
}
```

```mv-view
{
  "id": "act_review",
  "kind": "uml-activity",
  "title": "评审活动图（示例）",
  "modelRefs": ["sql_demo#person"],
  "payload": "@startuml\nstart\n:起草;\n:评审;\nstop\n@enduml"
}
```

```mv-view
{
  "id": "ui_screen_board",
  "kind": "ui-design",
  "title": "列表页线框",
  "modelRefs": ["sql_demo#person"],
  "payload": "{ \"screens\": [ { \"id\": \"list\", \"title\": \"订单列表\" } ] }"
}
```

```mv-map
{
  "id": "to_ts",
  "rules": [
    { "modelId": "sql_demo#person", "targetPath": "src/models/person.ts", "template": "interface" }
  ]
}
```
