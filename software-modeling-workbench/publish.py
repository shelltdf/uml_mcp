#!/usr/bin/env python3
"""发布最小集：生产构建产物（web dist + core dist + 扩展 out）。"""
import subprocess
import sys
from pathlib import Path

from npm_util import npm_cmd

ROOT = Path(__file__).resolve().parent


def main() -> int:
    r = subprocess.run(npm_cmd("run", "build:vscode"), cwd=ROOT)
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
