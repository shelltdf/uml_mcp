#pragma once

#include "acme/base_entity.hpp"
#include "acme/item.hpp"

#include <memory>
#include <vector>

namespace acme {

class DiscountRule;
class Customer;

/// 对应类图 `Order`（继承 BaseEntity，关联 Item / DiscountRule / Customer）。
class Order : public BaseEntity {
 public:
  void addItem(const std::shared_ptr<Item>& item);

  const std::vector<std::shared_ptr<Item>>& items() const { return items_; }

  void setPricing(DiscountRule* rule) { pricing_ = rule; }
  DiscountRule* pricing() const { return pricing_; }

  void setPlacedBy(Customer* c) { placed_by_ = c; }
  Customer* placedBy() const { return placed_by_; }

 private:
  std::vector<std::shared_ptr<Item>> items_;
  DiscountRule* pricing_{nullptr};
  Customer* placed_by_{nullptr};
};

}  // namespace acme
