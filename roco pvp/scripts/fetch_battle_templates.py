#!/usr/bin/env python3
"""
从 Auto-rocokingdom 下载 PVE 战斗相关 UI 小图，作为 OpenCV 模板起点。

说明：
- 这些是同行/野外战斗 UI 的小块截图，分辨率与 PVP 可能不完全一致
- 下载后需在游戏 PVP 里对照微调，或重新截取 templates/pvp/*.png
- 不能从 Wiki 直接拿到可用的 PC 战斗模板（只有攻略图，尺寸/样式不匹配）
"""

from __future__ import annotations

import shutil
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "templates" / "pvp"
REF = ROOT / "templates" / "reference"

# raw.githubusercontent.com — Auto-rocokingdom templates
AUTO_ROCO_BASE = (
    "https://raw.githubusercontent.com/yorusacri/Auto-rocokingdom/main/templates"
)

# 映射：本地 PVP 模板名 → Auto-roco 文件名
DOWNLOAD_MAP = {
    "battle_hud": "capture.png",
    "turn_indicator": "skill1.png",
    "pvp_queue": "yes.png",
}


def download(url: str, dest: Path) -> bool:
    try:
        dest.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, dest)
        return dest.exists() and dest.stat().st_size > 0
    except OSError as exc:
        print(f"  fail {dest.name}: {exc}")
        return False


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    REF.mkdir(parents=True, exist_ok=True)

    print("从 Auto-rocokingdom 拉取参考模板（PVE 战斗 UI，需 PVP 实测校准）…")
    for local_name, remote_name in DOWNLOAD_MAP.items():
        url = f"{AUTO_ROCO_BASE}/{remote_name}"
        ref_path = REF / remote_name
        out_path = OUT / f"{local_name}.png"
        if download(url, ref_path):
            shutil.copy2(ref_path, out_path)
            print(f"  OK  {local_name}.png  <-  {remote_name}")
        else:
            print(f"  SKIP {local_name}")

    print()
    print(f"模板目录: {OUT}")
    print("参考原图: templates/reference/")
    print()
    print("若匹配不准：进游戏 PVP 截屏，用画图工具裁切 50~150px 的小块 UI，")
    print("覆盖 templates/pvp/battle_hud.png 与 turn_indicator.png。")


if __name__ == "__main__":
    main()
