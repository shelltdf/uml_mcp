"""在 Windows 上解析 npm（通常为 npm.cmd），避免 subprocess WinError 2。"""
from __future__ import annotations

import shutil
import sys


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
