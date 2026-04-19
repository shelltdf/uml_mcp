#!/usr/bin/env python3
"""
启动 Electron 套壳。每次启动前先执行 ``npm run build``（构建 @mvwb/core 与 @mvwb/web 的 dist），再运行 ``@mvwb/electron``。
"""
import subprocess
import sys
from pathlib import Path

from npm_util import npm_cmd

ROOT = Path(__file__).resolve().parent


def main() -> int:
    print("[run_exe] 正在生成最新 apps/web/dist ...")
    r = subprocess.run(npm_cmd("run", "build"), cwd=ROOT, check=False)
    if r.returncode != 0:
        return int(r.returncode)
    print("[run_exe] 启动 Electron ...")
    r2 = subprocess.run(npm_cmd("run", "dev", "-w", "@mvwb/electron"), cwd=ROOT, check=False)
    return int(r2.returncode)


if __name__ == "__main__":
    sys.exit(main())
