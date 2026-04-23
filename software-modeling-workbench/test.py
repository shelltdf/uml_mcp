#!/usr/bin/env python3
"""运行单元测试（@mvwb/core）。"""
import subprocess
import sys
from pathlib import Path

from npm_util import npm_cmd

ROOT = Path(__file__).resolve().parent


def main() -> int:
    r = subprocess.run(npm_cmd("run", "test"), cwd=ROOT)
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
