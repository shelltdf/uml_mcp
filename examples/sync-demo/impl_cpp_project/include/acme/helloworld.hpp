#pragma once

#include "acme/base_entity.hpp"

#include <string>

namespace acme {

/// 对应 `namespace/helloworld.class.md` 中的 `Helloworld`。
/// 元数据声明继承/关联名仅作文档；此处示例让 Helloworld **公有继承** `BaseEntity` 以对应契约意图。
class Helloworld : public BaseEntity {
 public:
  std::string exampleField;

  /// 抽象签名为 void；实现可扩展参数。
  void greet();
};

}  // namespace acme
