#!/usr/bin/env python3
"""
启动 Vite 开发服务器。**每次启动前先** ``npm run build`` 生成最新 ``dist/``（与 Electron/扩展产物一致），再 ``npm run dev``。
说明：dev 仍编辑源码即生效；前置 build 用于保证 dist 与类型检查最新，耗时略增。
"""
import os
import subprocess
import sys

from npm_util import npm_cmd
from project_build import run_npm_build

ROOT = os.path.dirname(os.path.abspath(__file__))


def main() -> int:
    os.chdir(ROOT)
    print("[run_web] 正在生成最新 dist/ ...")
    r = run_npm_build()
    if r != 0:
        return r
    r2 = subprocess.run(npm_cmd("run", "dev"), check=False)
    return int(r2.returncode)


if __name__ == "__main__":
    sys.exit(main())
