#pragma once

#include <string>

namespace acme {

/// 对应类图 `BaseEntity`（`*.uml.md` 订单域）。
class BaseEntity {
 public:
  std::string id;
  std::string createdAt;
  virtual ~BaseEntity() = default;
};

}  // namespace acme
