#pragma once

#include <string>

namespace acme {

/// 对应 `globals.code.md` 中 `log_debug`（接收一条文本消息，无返回值）。
inline void log_debug(const std::string& message) {
  (void)message;
  // 实现侧可接 spdlog / std::cerr 等
}

/// 对应 `VERSION_MAJOR` 常量（整数）。
inline constexpr int VERSION_MAJOR = 1;

}  // namespace acme

/// 对应 `globals.code.md` 中宏 `ACME_VERSION_MAJOR`（与 VERSION_MAJOR 对齐）。
#define ACME_VERSION_MAJOR ::acme::VERSION_MAJOR
