"""在 Windows 上解析 npm（通常为 npm.cmd），避免 subprocess WinError 2。"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path


def npm_executable() -> str:
    for name in ("npm", "npm.cmd"):
        p = shutil.which(name)
        if p:
            return p
    print(
        "error: 未在 PATH 中找到 npm。请安装 Node.js 并确保终端可运行 npm。",
        file=sys.stderr,
    )
    sys.exit(127)


def npm_cmd(*args: str) -> list[str]:
    return [npm_executable(), *args]


def ensure_node_modules(project_root: Path) -> int:
    """若尚未安装依赖则执行 npm install；成功返回 0。"""
    if (project_root / "node_modules").is_dir():
        return 0
    print("未检测到 node_modules，正在执行 npm install …", flush=True)
    r = subprocess.run(npm_cmd("install"), cwd=project_root)
    return r.returncode
