#!/usr/bin/env python3
"""训练 PVP 敌方精灵检测 YOLO 模型（需先标注数据集）。"""

from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA = ROOT / "yolo" / "dataset" / "data.yaml"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--model", default="yolov8n.pt", help="预训练权重")
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--imgsz", type=int, default=640)
    args = parser.parse_args()

    if not args.data.exists():
        print(f"数据集配置不存在: {args.data}")
        print("请先运行: python yolo/export_dataset.py 并标注图片")
        return

    from ultralytics import YOLO

    model = YOLO(args.model)
    model.train(
        data=str(args.data),
        epochs=args.epochs,
        imgsz=args.imgsz,
        project=str(ROOT / "yolo" / "runs"),
        name="pvp-spirits",
    )
    print("训练完成，请将 config/default.yaml 中 yolo.model_path 指向 best.pt")


if __name__ == "__main__":
    main()
