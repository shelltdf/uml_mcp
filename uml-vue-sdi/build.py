#!/usr/bin/env python3
"""
同时构建：
1. Web 静态资源 dist/（Vite）
2. 同步到 vscode-extension/media/app 并编译、打包 VSIX → out/uml-workbench.vsix
Electron 套壳无单独编译步骤，直接使用 dist/。

实现见 project_build.run_full_build。
"""
import sys

from project_build import run_full_build

if __name__ == "__main__":
    sys.exit(run_full_build())
