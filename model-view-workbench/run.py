#!/usr/bin/env python3
"""默认启动 Web 开发服务器。"""
import subprocess
import sys
from pathlib import Path

from npm_util import npm_cmd

ROOT = Path(__file__).resolve().parent


def main() -> int:
    r = subprocess.run(npm_cmd("run", "dev:web"), cwd=ROOT)
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
