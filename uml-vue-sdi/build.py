#!/usr/bin/env python3
"""从干净状态构建 uml-vue-sdi（调用 npm ci / npm install + npm run build）。"""
import os
import subprocess
import sys

from npm_util import npm_cmd

ROOT = os.path.dirname(os.path.abspath(__file__))


def main() -> int:
    os.chdir(ROOT)
    if os.path.isdir(os.path.join(ROOT, "node_modules")):
        r = subprocess.run(npm_cmd("run", "build"), check=False)
    else:
        subprocess.run(npm_cmd("install"), check=True)
        r = subprocess.run(npm_cmd("run", "build"), check=False)
    return int(r.returncode)


if __name__ == "__main__":
    sys.exit(main())
