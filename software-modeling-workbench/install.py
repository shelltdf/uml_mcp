#!/usr/bin/env python3
"""构建并安装 VS Code/Cursor 插件。"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VSIX_PATH = ROOT / "dist" / "software-modeling-workbench.vsix"


def _tool(*names: str) -> str | None:
    for name in names:
        hit = shutil.which(name)
        if hit:
            return hit
    return None


def _install_with(command: str, vsix_path: Path) -> int:
    r = subprocess.run([command, "--install-extension", str(vsix_path), "--force"], cwd=ROOT, check=False)
    return int(r.returncode)


def main() -> int:
    build_code = subprocess.run([sys.executable, str(ROOT / "build.py")], cwd=ROOT, check=False).returncode
    if build_code != 0:
        return int(build_code)
    if not VSIX_PATH.is_file():
        print(f"error: 未找到 VSIX 文件: {VSIX_PATH}", file=sys.stderr)
        return 2

    cli = _tool("cursor", "cursor.cmd", "code", "code.cmd")
    if not cli:
        print("error: 未找到 cursor/code 命令，无法自动安装扩展。", file=sys.stderr)
        print(f"请手动安装: {VSIX_PATH}", file=sys.stderr)
        return 127
    return _install_with(cli, VSIX_PATH)


if __name__ == "__main__":
    sys.exit(main())
