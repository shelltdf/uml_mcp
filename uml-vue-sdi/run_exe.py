#!/usr/bin/env python3
"""启动 Electron 套壳（需已构建 dist/；若缺失则先执行 npm run build）。"""
import os
import subprocess
import sys

from npm_util import npm_cmd

ROOT = os.path.dirname(os.path.abspath(__file__))


def main() -> int:
    os.chdir(ROOT)
    if not os.path.isdir(os.path.join(ROOT, "node_modules")):
        subprocess.run(npm_cmd("install"), check=True)
    dist_index = os.path.join(ROOT, "dist", "index.html")
    if not os.path.isfile(dist_index):
        subprocess.run(npm_cmd("run", "build"), check=True)
    r = subprocess.run(npm_cmd("run", "electron"), check=False)
    return int(r.returncode)


if __name__ == "__main__":
    sys.exit(main())
