from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np


@dataclass(frozen=True)
class MatchResult:
    name: str
    score: float
    top_left: tuple[int, int]
    bottom_right: tuple[int, int]

    @property
    def center(self) -> tuple[int, int]:
        x1, y1 = self.top_left
        x2, y2 = self.bottom_right
        return ((x1 + x2) // 2, (y1 + y2) // 2)


class TemplateMatcher:
    def __init__(self, templates_dir: Path, threshold: float = 0.55) -> None:
        self.threshold = threshold
        self._templates: dict[str, np.ndarray] = {}
        if templates_dir.exists():
            for path in templates_dir.glob("*.png"):
                img = cv2.imread(str(path), cv2.IMREAD_COLOR)
                if img is not None:
                    self._templates[path.stem] = img

    def has_template(self, name: str) -> bool:
        return name in self._templates

    def match_best(self, frame: np.ndarray, name: str) -> MatchResult | None:
        template = self._templates.get(name)
        if template is None or frame.size == 0:
            return None
        if frame.shape[0] < template.shape[0] or frame.shape[1] < template.shape[1]:
            return None

        result = cv2.matchTemplate(frame, template, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, max_loc = cv2.minMaxLoc(result)
        if max_val < self.threshold:
            return None

        h, w = template.shape[:2]
        x, y = max_loc
        return MatchResult(
            name=name,
            score=float(max_val),
            top_left=(x, y),
            bottom_right=(x + w, y + h),
        )

    def match_any(
        self, frame: np.ndarray, names: list[str]
    ) -> MatchResult | None:
        best: MatchResult | None = None
        for name in names:
            hit = self.match_best(frame, name)
            if hit and (best is None or hit.score > best.score):
                best = hit
        return best
