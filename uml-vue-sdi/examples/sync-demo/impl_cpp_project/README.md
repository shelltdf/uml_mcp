# impl_cpp_project

默认 `code_impls` 中 `cpp` 类型的**源码与头文件根**（`.cpp` / `.h` 等）。

`*.code.md` **不**放在此目录；非类片段的 Markdown 契约放在各 `namespace_root`（如 `namespace/`）下，与 `*.class.md` 同树。

---

## 本目录与契约的对应关系（示例）

| 契约来源 | 生成/维护的代码 |
|----------|----------------|
| `diagrams/order-domain-class.uml.md` | `include/acme/{base_entity,item,customer,discount_rule,order}.hpp` + `src/order.cpp`、`src/discount_rule.cpp` |
| `namespace/helloworld.class.md` | `include/acme/helloworld.hpp`、`src/helloworld.cpp` |
| `namespace/globals.code.md` | `include/acme/globals.hpp`（`log_debug`、`VERSION_MAJOR`、`ACME_VERSION_MAJOR`） |

以上为 **AI/脚手架按 strict 规则生成的骨架**，业务逻辑（计价、折扣规则等）需自行补全。

## 构建（可选）

```bash
cmake -S . -B build
cmake --build build
./build/acme_demo    # Windows: build\Debug\acme_demo.exe 或 build\acme_demo.exe
```
