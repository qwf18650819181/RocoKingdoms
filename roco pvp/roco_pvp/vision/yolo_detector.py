from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np


@dataclass(frozen=True)
class Detection:
    class_name: str
    confidence: float
    x1: int
    y1: int
    x2: int
    y2: int

    @property
    def center(self) -> tuple[int, int]:
        return ((self.x1 + self.x2) // 2, (self.y1 + self.y2) // 2)


class YoloDetector:
    def __init__(
        self,
        model_path: Path,
        conf: float = 0.45,
        iou: float = 0.5,
    ) -> None:
        self.conf = conf
        self.iou = iou
        self._model = None
        self._model_path = model_path

    @property
    def ready(self) -> bool:
        return self._model_path.exists()

    def _load(self) -> None:
        if self._model is not None:
            return
        if not self._model_path.exists():
            raise FileNotFoundError(f"YOLO 模型不存在: {self._model_path}")
        from ultralytics import YOLO

        self._model = YOLO(str(self._model_path))

    def detect(self, frame_bgr: np.ndarray) -> list[Detection]:
        if not self.ready:
            return []
        self._load()
        assert self._model is not None

        results = self._model.predict(
            source=frame_bgr,
            conf=self.conf,
            iou=self.iou,
            verbose=False,
        )
        detections: list[Detection] = []
        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue
            names = result.names or {}
            for box in boxes:
                cls_id = int(box.cls[0])
                label = str(names.get(cls_id, cls_id))
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                detections.append(
                    Detection(
                        class_name=label,
                        confidence=float(box.conf[0]),
                        x1=int(x1),
                        y1=int(y1),
                        x2=int(x2),
                        y2=int(y2),
                    )
                )
        return detections

    def best_enemy(self, frame_bgr: np.ndarray) -> Detection | None:
        hits = self.detect(frame_bgr)
        if not hits:
            return None
        return max(hits, key=lambda d: d.confidence)
