from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Spirit:
    id: int
    name: str
    primary_attr: str
    secondary_attr: str | None
    portrait_url: str | None


@dataclass(frozen=True)
class SkillMeta:
    name: str
    category: str | None
    attr: str | None
    effect: str | None
    description: str | None


@dataclass
class GameData:
    spirits_by_id: dict[int, Spirit]
    spirits_by_name: dict[str, Spirit]
    skills: dict[str, SkillMeta]
    type_matchups: dict[str, dict[str, float]]
    spirit_skills: dict[str, dict[str, list[dict]]]

    def spirit_attrs(self, name: str) -> tuple[str, str | None]:
        spirit = self.spirits_by_name.get(name)
        if not spirit:
            return "普通", None
        return spirit.primary_attr, spirit.secondary_attr


def load_game_data(data_dir: Path) -> GameData:
    spirits_raw = json.loads((data_dir / "spirits.json").read_text(encoding="utf-8"))
    skills_raw = json.loads((data_dir / "skills.json").read_text(encoding="utf-8"))
    type_raw = json.loads((data_dir / "type_effectiveness.json").read_text(encoding="utf-8"))
    spirit_skills_raw = json.loads(
        (data_dir / "spirit_skills.json").read_text(encoding="utf-8")
    )

    spirits_by_id: dict[int, Spirit] = {}
    spirits_by_name: dict[str, Spirit] = {}
    for row in spirits_raw:
        spirit = Spirit(
            id=int(row["id"]),
            name=str(row["名称"]),
            primary_attr=str(row["主属性"]),
            secondary_attr=row.get("副属性"),
            portrait_url=row.get("立绘链接"),
        )
        spirits_by_id[spirit.id] = spirit
        spirits_by_name[spirit.name] = spirit
        title = row.get("页面标题")
        if title and title not in spirits_by_name:
            spirits_by_name[str(title)] = spirit

    skills: dict[str, SkillMeta] = {}
    for name, meta in skills_raw.items():
        skills[name] = SkillMeta(
            name=name,
            category=meta.get("category"),
            attr=meta.get("attr"),
            effect=meta.get("effect"),
            description=meta.get("description"),
        )

    return GameData(
        spirits_by_id=spirits_by_id,
        spirits_by_name=spirits_by_name,
        skills=skills,
        type_matchups=type_raw.get("matchups") or {},
        spirit_skills=spirit_skills_raw,
    )
