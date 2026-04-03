/// 可选烟测入口：验证头文件与常量可链接。
#include "acme/globals.hpp"
#include "acme/order.hpp"

#include <iostream>

int main() {
  acme::log_debug("sync-demo smoke");
  std::cout << "VERSION_MAJOR=" << acme::VERSION_MAJOR << " ACME=" << ACME_VERSION_MAJOR << '\n';
  acme::Order o;
  o.id = "demo";
  return 0;
}
