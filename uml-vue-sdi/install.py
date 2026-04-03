#!/usr/bin/env python3
"""
每次安装前**始终**执行完整构建（最新 dist + VSIX），再尝试用 VS Code / Cursor CLI 安装。
用法：python install.py
环境：需已安装 `code` 或 `cursor` 命令（可选 PATH）。
"""
import os
import shutil
import subprocess
import sys

from project_build import run_full_build

ROOT = os.path.dirname(os.path.abspath(__file__))


def main() -> int:
    os.chdir(ROOT)
    print("[install] 正在生成最新构建（dist + VSIX）...")
    r = run_full_build()
    if r != 0:
        return r
    vsix = os.path.join(ROOT, "out", "uml-workbench.vsix")
    if not os.path.isfile(vsix):
        print("error: 构建后仍未找到 out/uml-workbench.vsix", file=sys.stderr)
        return 1
    cli = shutil.which("cursor") or shutil.which("code")
    if not cli:
        print(
            "未在 PATH 中找到 cursor 或 code。请手动安装扩展：",
            vsix,
            file=sys.stderr,
        )
        return 0
    r2 = subprocess.run([cli, "--install-extension", vsix, "--force"], check=False)
    return int(r2.returncode)


if __name__ == "__main__":
    sys.exit(main())
