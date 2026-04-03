#!/usr/bin/env python3
"""
同时构建：
1. Web 静态资源 dist/（Vite）
2. 同步到 vscode-extension/media/app 并编译、打包 VSIX → out/uml-workbench.vsix
Electron 套壳无单独编译步骤，直接使用 dist/。
"""
import os
import subprocess
import sys

from npm_util import npm_cmd

ROOT = os.path.dirname(os.path.abspath(__file__))


def main() -> int:
    os.chdir(ROOT)
    if not os.path.isdir(os.path.join(ROOT, "node_modules")):
        subprocess.run(npm_cmd("install"), check=True)
    # 1) Vue 应用
    r = subprocess.run(npm_cmd("run", "build"), check=False)
    if r.returncode != 0:
        return int(r.returncode)
    # 2) 扩展 + VSIX（Node 脚本）
    r2 = subprocess.run(npm_cmd("run", "build:all"), check=False)
    return int(r2.returncode)


if __name__ == "__main__":
    sys.exit(main())
