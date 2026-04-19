#!/usr/bin/env python3
"""开发态：与 run.py 相同，启动 Vite dev。"""
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
