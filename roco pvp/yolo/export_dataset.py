#!/usr/bin/env python3
"""
从 calculator/spider 精灵数据生成 YOLO 数据集配置与类别表。

注意：Wiki 立绘不能代替游戏内截图训练。本脚本只生成：
- yolo/dataset/data.yaml（类别名）
- yolo/dataset/classes.txt
- 空目录 images/train, labels/train 等

请在游戏中截图并用 labelImg / Roboflow 标注 bounding box 后放入对应目录。
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT.parent / "roco calculator" / "public" / "data" / "spirits.json"
OUT = ROOT / "yolo" / "dataset"


def load_final_spirit_names(path: Path) -> list[str]:
    rows = json.loads(path.read_text(encoding="utf-8"))
    names: list[str] = []
    seen: set[str] = set()
    for row in rows:
        if row.get("精灵阶段") != "最终阶段":
            continue
        name = str(row["名称"])
        if name in seen:
            continue
        seen.add(name)
        names.append(name)
    names.sort()
    return names


def main() -> None:
    if not DATA.exists():
        print(f"找不到 {DATA}，请先 sync_calculator_data 或 import-data")
        return

    classes = load_final_spirit_names(DATA)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "classes.txt").write_text("\n".join(classes), encoding="utf-8")

    for split in ("train", "val"):
        (OUT / "images" / split).mkdir(parents=True, exist_ok=True)
        (OUT / "labels" / split).mkdir(parents=True, exist_ok=True)

    yaml_text = f"""# 由 export_dataset.py 自动生成
path: {OUT.as_posix()}
train: images/train
val: images/val

nc: {len(classes)}
names:
"""
    for i, name in enumerate(classes):
        yaml_text += f"  {i}: {name}\n"

    (OUT / "data.yaml").write_text(yaml_text, encoding="utf-8")
    print(f"类别数: {len(classes)}")
    print(f"已写入 {OUT / 'data.yaml'}")
    print("下一步：往 images/train 放游戏截图，labels/train 放 YOLO 标注")


if __name__ == "__main__":
    main()
