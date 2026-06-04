from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]


@dataclass
class YoloConfig:
    enabled: bool = True
    model_path: str = "yolo/runs/pvp-spirits/weights/best.pt"
    conf: float = 0.45
    iou: float = 0.5


@dataclass
class AppConfig:
    window_title_keyword: str = "洛克王国"
    match_threshold: float = 0.55
    poll_interval_sec: float = 0.8
    calculator_data_dir: str = "../roco calculator/public/data"
    team_file: str = "teams/main_team.json"
    templates_dir: str = "templates/pvp"
    input_driver: str = "interception"
    yolo: YoloConfig = field(default_factory=YoloConfig)
    skill_keys: list[str] = field(default_factory=lambda: ["1", "2", "3", "4"])
    battle_templates: dict[str, str] = field(default_factory=dict)

    @property
    def data_dir(self) -> Path:
        return (ROOT / self.calculator_data_dir).resolve()

    @property
    def templates_path(self) -> Path:
        return ROOT / self.templates_dir

    @property
    def team_path(self) -> Path:
        return ROOT / self.team_file

    @property
    def yolo_model_path(self) -> Path:
        return ROOT / self.yolo.model_path


def _parse_skill_keys(raw: list[str] | None) -> list[str]:
    if not raw:
        return ["1", "2", "3", "4"]
    keys = [str(k) for k in raw[:4]]
    while len(keys) < 4:
        keys.append(str(len(keys) + 1))
    return keys


def load_config(path: Path | None = None) -> AppConfig:
    default_path = ROOT / "config" / "default.yaml"
    user_path = ROOT / "user_prefs.yaml"
    paths = [default_path]
    if user_path.exists():
        paths.append(user_path)
    if path:
        paths.append(path)

    merged: dict[str, Any] = {}
    for p in paths:
        with p.open(encoding="utf-8") as f:
            chunk = yaml.safe_load(f) or {}
        merged.update(chunk)

    yolo_raw = merged.get("yolo") or {}
    yolo = YoloConfig(
        enabled=bool(yolo_raw.get("enabled", True)),
        model_path=str(yolo_raw.get("model_path", YoloConfig.model_path)),
        conf=float(yolo_raw.get("conf", 0.45)),
        iou=float(yolo_raw.get("iou", 0.5)),
    )

    return AppConfig(
        window_title_keyword=str(merged.get("window_title_keyword", "洛克王国")),
        match_threshold=float(merged.get("match_threshold", 0.55)),
        poll_interval_sec=float(merged.get("poll_interval_sec", 0.8)),
        calculator_data_dir=str(
            merged.get("calculator_data_dir", "../roco calculator/public/data")
        ),
        team_file=str(merged.get("team_file", "teams/main_team.json")),
        templates_dir=str(merged.get("templates_dir", "templates/pvp")),
        input_driver=str(merged.get("input_driver", "interception")),
        yolo=yolo,
        skill_keys=_parse_skill_keys(merged.get("skill_keys")),
        battle_templates=dict(merged.get("battle_templates") or {}),
    )
