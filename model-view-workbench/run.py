#!/usr/bin/env python3
"""默认启动 Web 开发服务器。"""
import subprocess
import sys
from pathlib import Path

from npm_util import ensure_node_modules, npm_cmd

ROOT = Path(__file__).resolve().parent


def main() -> int:
    code = ensure_node_modules(ROOT)
    if code != 0:
        return code
    r = subprocess.run(npm_cmd("run", "dev:web"), cwd=ROOT)
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
