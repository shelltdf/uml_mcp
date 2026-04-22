# 核心示例：`mv-model-*` / 核心 `mv-view` / `mv-map`

本文件只放核心契约，不包含 Mermaid 或 `@startuml` 扩展语法。

统一规则见：[`PAYLOAD_RULES.md`](PAYLOAD_RULES.md)。

## `mv-model-*` 核心对象

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

```mv-model-kv
{
  "id": "kv_demo",
  "title": "KV 文档集（示例）",
  "documents": [
    { "_id": "doc1", "title": "一条文档", "tags": ["demo"] }
  ]
}
```

```mv-model-struct
{
  "id": "struct_demo",
  "title": "层次结构（示例）",
  "root": {
    "name": "/",
    "attributes": { "format": "mv-model-struct v1" },
    "groups": [
      {
        "name": "run0",
        "datasets": [{ "name": "values", "dtype": "float64", "data": [1, 2, 3] }]
      }
    ]
  }
}
```

```mv-model-codespace
{
  "id": "cs_sample",
  "title": "代码空间（极简）",
  "workspaceRoot": ".",
  "modules": [
    {
      "id": "mod_core",
      "name": "CoreLib",
      "path": "packages/core",
      "role": "lib",
      "namespaces": [
        {
          "id": "ns_root",
          "name": "RootNs",
          "classes": [
            {
              "id": "cls_placeholder",
              "name": "Placeholder",
              "kind": "class",
              "members": [],
              "methods": []
            }
          ]
        }
      ]
    }
  ]
}
```

```mv-model-interface
{
  "id": "iface_demo",
  "title": "接口模型（示例）",
  "endpoints": [
    { "id": "health", "name": "健康检查", "method": "GET", "path": "/health", "notes": "存活探针" }
  ]
}
```

## 核心 `mv-view`（非 Mermaid、非 startuml）

```mv-view
{
  "id": "person_mindmap",
  "kind": "mindmap-ui",
  "title": "关系脑图（示例）",
  "modelRefs": ["sql_demo#person"],
  "payload": {
    "format": "mv-mindmap-v0",
    "nodes": [{ "id": "root", "label": "人员" }]
  }
}
```

```mv-view
{
  "id": "plan_mindmap",
  "kind": "mindmap-ui",
  "title": "实施计划（示例）",
  "modelRefs": ["sql_demo#order"],
  "payload": {
    "format": "mv-mindmap-v0",
    "nodes": [
      { "id": "root", "label": "发布计划" },
      { "id": "p1", "label": "需求确认", "parentId": "root" },
      { "id": "p2", "label": "开发实现", "parentId": "root" },
      { "id": "p3", "label": "回归测试", "parentId": "root" },
      { "id": "p2_1", "label": "画布交互", "parentId": "p2" }
    ]
  }
}
```

```mv-view
{
  "id": "order_uml",
  "kind": "uml-diagram",
  "title": "订单领域（示例）",
  "modelRefs": ["sql_demo#order"],
  "payload": {
    "schema": "mvwb-uml/v1",
    "diagramType": "generic",
    "elements": [{ "id": "order", "kind": "entity", "name": "order" }],
    "relations": []
  }
}
```

```mv-view
{
  "id": "order_class_puml",
  "kind": "uml-class",
  "title": "订单类图（专用画布）",
  "modelRefs": ["sql_demo#order"],
  "payload": {
    "schema": "mvwb-uml/v1",
    "diagramType": "class",
    "classes": [{ "id": "Order", "name": "Order" }],
    "relations": []
  }
}
```

```mv-view
{
  "id": "seq_checkout",
  "kind": "uml-sequence",
  "title": "下单序列（示例）",
  "modelRefs": ["sql_demo#person"],
  "payload": {
    "schema": "mvwb-uml/v1",
    "diagramType": "sequence",
    "participants": [{ "id": "User", "name": "User" }, { "id": "API", "name": "API" }],
    "messages": [{ "from": "User", "to": "API", "name": "POST /orders" }]
  }
}
```

```mv-view
{
  "id": "act_review",
  "kind": "uml-activity",
  "title": "评审活动图（示例）",
  "modelRefs": ["sql_demo#person"],
  "payload": {
    "schema": "mvwb-uml/v1",
    "diagramType": "activity",
    "nodes": [
      { "id": "start", "kind": "initial" },
      { "id": "draft", "kind": "action", "name": "起草" },
      { "id": "review", "kind": "action", "name": "评审" },
      { "id": "end", "kind": "final" }
    ],
    "relations": [{ "from": "start", "to": "draft" }, { "from": "draft", "to": "review" }, { "from": "review", "to": "end" }]
  }
}
```

```mv-view
{
  "id": "obj_order",
  "kind": "uml-object",
  "title": "订单对象图（示例）",
  "modelRefs": ["sql_demo#order"],
  "payload": {
    "schema": "mvwb-uml/v1",
    "diagramType": "object",
    "elements": [{ "id": "o1", "kind": "object", "name": "order#1" }, { "id": "o2", "kind": "object", "name": "customer#1" }],
    "relations": [{ "id": "r1", "from": "o1", "to": "o2", "type": "link" }]
  }
}
```

```mv-view
{
  "id": "pkg_arch",
  "kind": "uml-package",
  "title": "包结构（示例）",
  "modelRefs": ["sql_demo#order"],
  "payload": {
    "schema": "mvwb-uml/v1",
    "diagramType": "package",
    "elements": [{ "id": "core", "kind": "package", "name": "core" }, { "id": "api", "kind": "package", "name": "api" }],
    "relations": [{ "id": "r1", "from": "api", "to": "core", "type": "dependency" }]
  }
}
```

```mv-view
{
  "id": "cmp_struct",
  "kind": "uml-composite-structure",
  "title": "组合结构（示例）",
  "modelRefs": ["sql_demo#order"],
  "payload": {
    "schema": "mvwb-uml/v1",
    "diagramType": "composite-structure",
    "elements": [{ "id": "car", "kind": "classifier", "name": "Car" }, { "id": "engine", "kind": "part", "name": "Engine" }],
    "relations": [{ "id": "r1", "from": "car", "to": "engine", "type": "composition" }]
  }
}
```

```mv-view
{
  "id": "comp_layer",
  "kind": "uml-component",
  "title": "组件图（示例）",
  "modelRefs": ["sql_demo#order"],
  "payload": {
    "schema": "mvwb-uml/v1",
    "diagramType": "component",
    "components": [{ "id": "web", "name": "Web" }, { "id": "api", "name": "API" }, { "id": "db", "name": "DB" }],
    "relations": [{ "id": "r1", "from": "web", "to": "api", "type": "depends" }, { "id": "r2", "from": "api", "to": "db", "type": "depends" }]
  }
}
```

```mv-view
{
  "id": "dep_prod",
  "kind": "uml-deployment",
  "title": "部署图（示例）",
  "modelRefs": ["sql_demo#order"],
  "payload": {
    "schema": "mvwb-uml/v1",
    "diagramType": "deployment",
    "nodes": [{ "id": "browser", "name": "Browser" }, { "id": "server", "name": "Server" }],
    "databases": [{ "id": "db", "name": "DB" }],
    "relations": [{ "id": "r1", "from": "browser", "to": "server", "type": "http" }, { "id": "r2", "from": "server", "to": "db", "type": "sql" }]
  }
}
```

```mv-view
{
  "id": "profile_std",
  "kind": "uml-profile",
  "title": "Profile（示例）",
  "modelRefs": ["sql_demo#order"],
  "payload": {
    "schema": "mvwb-uml/v1",
    "diagramType": "profile",
    "elements": [{ "id": "Service", "kind": "metaclass", "name": "Service" }, { "id": "Controller", "kind": "metaclass", "name": "Controller" }],
    "relations": [{ "id": "r1", "from": "Controller", "to": "Service", "type": "extends" }]
  }
}
```

```mv-view
{
  "id": "uc_order",
  "kind": "uml-usecase",
  "title": "用例图（示例）",
  "modelRefs": ["sql_demo#order"],
  "payload": {
    "schema": "mvwb-uml/v1",
    "diagramType": "usecase",
    "actors": [{ "id": "user", "name": "User" }],
    "useCases": [{ "id": "createOrder", "name": "Create Order" }],
    "relations": [{ "id": "r1", "from": "user", "to": "createOrder", "type": "participates" }]
  }
}
```

```mv-view
{
  "id": "sm_order",
  "kind": "uml-state-machine",
  "title": "状态机（示例）",
  "modelRefs": ["sql_demo#order"],
  "payload": {
    "schema": "mvwb-uml/v1",
    "diagramType": "state-machine",
    "states": [{ "id": "draft", "name": "Draft" }, { "id": "paid", "name": "Paid" }],
    "transitions": [{ "from": "draft", "to": "paid", "event": "pay" }]
  }
}
```

```mv-view
{
  "id": "comm_order",
  "kind": "uml-communication",
  "title": "通信图（示例）",
  "modelRefs": ["sql_demo#order"],
  "payload": {
    "schema": "mvwb-uml/v1",
    "diagramType": "communication",
    "participants": [{ "id": "A", "name": "Client" }, { "id": "B", "name": "API" }],
    "messages": [{ "from": "A", "to": "B", "name": "1: createOrder" }]
  }
}
```

```mv-view
{
  "id": "timing_order",
  "kind": "uml-timing",
  "title": "Timing（示例）",
  "modelRefs": ["sql_demo#order"],
  "payload": {
    "schema": "mvwb-uml/v1",
    "diagramType": "timing",
    "lifelines": [{ "id": "web", "name": "Web" }, { "id": "api", "name": "API" }],
    "events": [{ "at": 0, "target": "web", "state": "Idle" }, { "at": 100, "target": "web", "state": "Busy" }]
  }
}
```

```mv-view
{
  "id": "io_order",
  "kind": "uml-interaction-overview",
  "title": "交互概览（示例）",
  "modelRefs": ["sql_demo#order"],
  "payload": {
    "schema": "mvwb-uml/v1",
    "diagramType": "interaction-overview",
    "nodes": [{ "id": "start", "kind": "initial" }, { "id": "prepare", "kind": "action", "name": "Prepare" }, { "id": "end", "kind": "final" }],
    "relations": [{ "from": "start", "to": "prepare" }, { "from": "prepare", "to": "end" }]
  }
}
```

```mv-view
{
  "id": "ui_screen_board",
  "kind": "ui-design",
  "title": "列表页线框",
  "modelRefs": ["sql_demo#person"],
  "payload": {
    "screens": [{ "id": "list", "title": "订单列表" }]
  }
}
```

## `mv-map`

```mv-map
{
  "id": "to_ts",
  "rules": [
    { "modelId": "sql_demo#person", "targetPath": "src/models/person.ts", "template": "interface" }
  ]
}
```
