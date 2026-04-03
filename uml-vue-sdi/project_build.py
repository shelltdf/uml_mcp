#!/usr/bin/env python3
"""
共享构建步骤，供 build.py / install.py / run_*.py 使用，保证「最新版」产物一致。

- ``run_npm_build``: 仅 ``npm run build`` → ``dist/``（Electron / 校验用）
- ``run_full_build``: 等价原 ``build.py`` — ``dist/`` + ``npm run build:all`` → VSIX
"""
from __future__ import annotations

import os
import subprocess

from npm_util import npm_cmd

ROOT = os.path.dirname(os.path.abspath(__file__))


def chdir_root() -> None:
    os.chdir(ROOT)


def ensure_node_modules() -> None:
    chdir_root()
    if not os.path.isdir(os.path.join(ROOT, "node_modules")):
        subprocess.run(npm_cmd("install"), check=True)


def run_npm_build() -> int:
    """生成最新 ``dist/``（Vue 生产构建）。"""
    chdir_root()
    ensure_node_modules()
    r = subprocess.run(npm_cmd("run", "build"), check=False)
    return int(r.returncode)


def run_full_build() -> int:
    """生成最新 ``dist/`` 与 ``out/uml-workbench.vsix``（与原 build.py 一致）。"""
    chdir_root()
    ensure_node_modules()
    r = subprocess.run(npm_cmd("run", "build"), check=False)
    if r.returncode != 0:
        return int(r.returncode)
    r2 = subprocess.run(npm_cmd("run", "build:all"), check=False)
    return int(r2.returncode)
