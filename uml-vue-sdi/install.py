#!/usr/bin/env python3
"""
生成 VSIX（若尚未构建则先执行 build.py），并尝试用 VS Code / Cursor CLI 安装。
用法：python install.py
环境：需已安装 `code` 或 `cursor` 命令（可选 PATH）。
"""
import glob
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


def main() -> int:
    os.chdir(ROOT)
    vsix = os.path.join(ROOT, "out", "uml-workbench.vsix")
    if not os.path.isfile(vsix):
        print("VSIX 不存在，正在运行 build.py ...")
        r = subprocess.run([sys.executable, os.path.join(ROOT, "build.py")], check=False)
        if r.returncode != 0:
            return int(r.returncode)
    if not os.path.isfile(vsix):
        print("error: 仍未找到 out/uml-workbench.vsix", file=sys.stderr)
        return 1
    cli = shutil.which("cursor") or shutil.which("code")
    if not cli:
        print(
            "未在 PATH 中找到 cursor 或 code。请手动安装扩展：",
            vsix,
            file=sys.stderr,
        )
        return 0
    r = subprocess.run([cli, "--install-extension", vsix, "--force"], check=False)
    return int(r.returncode)


if __name__ == "__main__":
    sys.exit(main())
