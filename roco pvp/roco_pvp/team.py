from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class TeamSlot:
    spirit_id: int | None
    skills: list[str | None]


@dataclass
class PvpTeam:
    slots: list[TeamSlot]

    def active_spirits(self) -> list[int]:
        return [s.spirit_id for s in self.slots if s.spirit_id is not None]


def parse_team_file(raw: str) -> PvpTeam | None:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None

    slots_raw: list[Any] | None
    if isinstance(data, list):
        slots_raw = data
    elif isinstance(data, dict) and isinstance(data.get("slots"), list):
        slots_raw = data["slots"]
    else:
        return None

    if len(slots_raw) != 6:
        return None

    slots: list[TeamSlot] = []
    for item in slots_raw:
        if not isinstance(item, dict):
            return None
        spirit_id = item.get("spiritId")
        skills = item.get("skills")
        if spirit_id is not None and not isinstance(spirit_id, int):
            return None
        if not isinstance(skills, list) or len(skills) != 4:
            return None
        slots.append(
            TeamSlot(
                spirit_id=spirit_id,
                skills=[s if isinstance(s, str) else None for s in skills],
            )
        )
    return PvpTeam(slots=slots)


def load_team(path: Path) -> PvpTeam:
    if not path.exists():
        return PvpTeam(slots=[TeamSlot(None, [None] * 4) for _ in range(6)])
    return parse_team_file(path.read_text(encoding="utf-8")) or PvpTeam(
        slots=[TeamSlot(None, [None] * 4) for _ in range(6)]
    )
