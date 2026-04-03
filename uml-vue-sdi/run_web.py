#!/usr/bin/env python3
"""启动 Vite 开发服务器（Web 版）。"""
import os
import subprocess
import sys

from npm_util import npm_cmd

ROOT = os.path.dirname(os.path.abspath(__file__))


def main() -> int:
    os.chdir(ROOT)
    if not os.path.isdir(os.path.join(ROOT, "node_modules")):
        subprocess.run(npm_cmd("install"), check=True)
    r = subprocess.run(npm_cmd("run", "dev"), check=False)
    return int(r.returncode)


if __name__ == "__main__":
    sys.exit(main())
