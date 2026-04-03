#pragma once

namespace acme {

class Order;

/// 对应类图 `DiscountRule`（Order --> DiscountRule : pricing）。
class DiscountRule {
 public:
  bool appliesTo(const Order& order) const;
};

}  // namespace acme
