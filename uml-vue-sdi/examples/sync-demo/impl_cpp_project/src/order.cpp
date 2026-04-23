#include "acme/order.hpp"

namespace acme {

void Order::addItem(const std::shared_ptr<Item>& item) {
  if (item) {
    items_.push_back(item);
  }
}

}  // namespace acme
