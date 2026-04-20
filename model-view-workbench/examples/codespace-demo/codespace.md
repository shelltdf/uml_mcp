# 示例：mv-model-codespace（模块 + 命名空间 + Classifier）

用于验证 **UML 风格代码空间** JSON：`modules[].namespaces` 递归、`classes`、`bases`、`associations`（字段含义见 `md-mv-core/spec.md`）。

```mv-model-codespace
{
  "id": "demo_codespace",
  "title": "示例代码空间",
  "workspaceRoot": ".",
  "modules": [
    {
      "id": "mod-demo",
      "name": "DemoModule",
      "role": "lib",
      "namespaces": [
        {
          "id": "ns-app",
          "name": "App",
          "namespaces": [
            {
              "id": "ns-ui",
              "name": "UI",
              "classes": [
                {
                  "id": "cls-widget",
                  "name": "Widget",
                  "kind": "class",
                  "member": [],
                  "method": [
                    { "name": "draw", "visibility": "public", "virtual": true, "signature": "void draw()" }
                  ]
                },
                {
                  "id": "cls-button",
                  "name": "Button",
                  "kind": "class",
                  "bases": [{ "targetId": "cls-widget", "relation": "generalization" }],
                  "member": [],
                  "method": [
                    { "name": "onClick", "visibility": "public", "signature": "void onClick()" }
                  ]
                }
              ],
              "associations": [
                {
                  "id": "assoc-uses",
                  "kind": "dependency",
                  "fromClassifierId": "cls-button",
                  "toClassifierId": "cls-widget",
                  "notes": "Button depends on Widget API"
                }
              ]
            }
          ],
          "functions": [{ "id": "fn-run", "name": "runApp", "signature": "void runApp()", "notes": "entry" }],
          "macros": [{ "id": "mac-log", "name": "LOG", "params": "msg", "definitionSnippet": "/* log */" }]
        }
      ]
    }
  ]
}
```
