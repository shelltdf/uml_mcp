#!/usr/bin/env python3
"""生成可分发静态资源：npm run build，输出 dist/。"""
import os
import subprocess
import sys

from npm_util import npm_cmd

ROOT = os.path.dirname(os.path.abspath(__file__))


def main() -> int:
    os.chdir(ROOT)
    if not os.path.isdir(os.path.join(ROOT, "node_modules")):
        subprocess.run(npm_cmd("install"), check=True)
    r = subprocess.run(npm_cmd("run", "build"), check=False)
    if r.returncode == 0:
        print(f"输出目录: {os.path.join(ROOT, 'dist')}")
    return int(r.returncode)


if __name__ == "__main__":
    sys.exit(main())
