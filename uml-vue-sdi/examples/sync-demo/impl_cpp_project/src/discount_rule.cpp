#include "acme/discount_rule.hpp"
#include "acme/order.hpp"

namespace acme {

bool DiscountRule::appliesTo(const Order& /*order*/) const {
  return true;  // 占位：按业务规则实现
}

}  // namespace acme
