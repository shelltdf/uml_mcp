cmake_minimum_required(VERSION 3.16)
project(acme_sync_demo LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
if(MSVC)
  add_compile_options(/utf-8)
endif()

add_library(acme_sync STATIC
  src/order.cpp
  src/discount_rule.cpp
  src/helloworld.cpp
)
target_include_directories(acme_sync PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}/include
)

add_executable(acme_demo src/main.cpp)
target_link_libraries(acme_demo PRIVATE acme_sync)
