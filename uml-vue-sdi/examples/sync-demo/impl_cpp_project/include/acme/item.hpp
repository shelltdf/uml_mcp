#pragma once

#include <string>

namespace acme {

/// 对应类图 `Item`。
class Item {
 public:
  std::string sku;
  double price{};  // 抽象契约中的 decimal → 实现侧用 double
};

}  // namespace acme
