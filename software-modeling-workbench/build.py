#!/usr/bin/env python3
"""构建并打包 VS Code 插件（生成 .vsix）。"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from npm_util import npm_cmd

ROOT = Path(__file__).resolve().parent
EXT_DIR = ROOT / "vscode-extension"
DIST_DIR = ROOT / "dist"


def _tool(name: str) -> str | None:
    for candidate in (name, f"{name}.cmd"):
        hit = shutil.which(candidate)
        if hit:
            return hit
    return None


def main() -> int:
    subprocess.run(npm_cmd("install"), cwd=ROOT, check=False)
    r = subprocess.run(npm_cmd("run", "build:vscode"), cwd=ROOT, check=False)
    if r.returncode != 0:
        return int(r.returncode)

    DIST_DIR.mkdir(parents=True, exist_ok=True)
    package_out = DIST_DIR / "software-modeling-workbench.vsix"
    vsce = _tool("vsce")
    package_args = ["package", "--allow-missing-repository", "--out", str(package_out)]
    if vsce:
        cmd = [vsce, *package_args]
    else:
        cmd = [*npm_cmd("exec", "--yes", "@vscode/vsce", "--", *package_args)]
    r2 = subprocess.run(cmd, cwd=EXT_DIR, check=False)
    return int(r2.returncode)


if __name__ == "__main__":
    sys.exit(main())
