#!/usr/bin/env python3
"""
启动 Electron 套壳。**每次启动前先** ``npm run build`` 生成最新 ``dist/``，再运行 electron。
"""
import os
import subprocess
import sys

from npm_util import npm_cmd
from project_build import run_npm_build

ROOT = os.path.dirname(os.path.abspath(__file__))


def main() -> int:
    os.chdir(ROOT)
    print("[run_exe] 正在生成最新 dist/ ...")
    r = run_npm_build()
    if r != 0:
        return r
    r2 = subprocess.run(npm_cmd("run", "electron"), check=False)
    return int(r2.returncode)


if __name__ == "__main__":
    sys.exit(main())
