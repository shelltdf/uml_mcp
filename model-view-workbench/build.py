#!/usr/bin/env python3
"""构建：npm install（若需）+ core + web + 复制到 vscode-extension + 编译扩展。"""
import subprocess
import sys
from pathlib import Path

from npm_util import npm_cmd

ROOT = Path(__file__).resolve().parent


def main() -> int:
    subprocess.run(npm_cmd("install"), cwd=ROOT, check=False)
    r = subprocess.run(npm_cmd("run", "build:vscode"), cwd=ROOT)
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
