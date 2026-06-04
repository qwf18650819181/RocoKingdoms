#!/usr/bin/env python3
"""从 roco calculator 同步 JSON 数据到本地 data/ 目录（可选）。"""

from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parent / "roco calculator" / "public" / "data"
DST = ROOT / "data"

FILES = (
    "spirits.json",
    "skills.json",
    "spirit_skills.json",
    "type_effectiveness.json",
)


def main() -> None:
    if not SRC.exists():
        print(f"源目录不存在: {SRC}")
        print("请先在 roco calculator 中运行 npm run import-data")
        return

    DST.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        shutil.copy2(SRC / name, DST / name)
        print(f"copied {name}")

    print(f"完成 -> {DST}")
    print("可在 user_prefs.yaml 中设置 calculator_data_dir: \"data\"")


if __name__ == "__main__":
    main()
