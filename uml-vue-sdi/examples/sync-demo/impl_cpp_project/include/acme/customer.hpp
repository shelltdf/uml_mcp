#pragma once

#include <string>

namespace acme {

/// 对应类图 `Customer`（Order ..> Customer : placedBy）。
class Customer {
 public:
  std::string name;
};

}  // namespace acme
