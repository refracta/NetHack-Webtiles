cmake_minimum_required(VERSION 3.10)
project(pseudo-c-server C)

set(CMAKE_C_STANDARD 99)

add_executable(pseudo-c-server main.c)
target_link_libraries(pseudo-c-server json-c)

