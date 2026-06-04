from __future__ import annotations

from dataclasses import dataclass

from roco_pvp.game_data import GameData
from roco_pvp.team import TeamSlot
from roco_pvp.type_calc import pick_best_skill_index
from roco_pvp.vision.yolo_detector import Detection


@dataclass(frozen=True)
class BattleDecision:
    skill_index: int
    skill_name: str
    reason: str


def decide_skill(
    slot: TeamSlot,
    game: GameData,
    enemy: Detection | None,
    fallback_enemy_attr: tuple[str, str | None] = ("普通", None),
) -> BattleDecision | None:
    if slot.spirit_id is None:
        return None

    skill_names = slot.skills
    if not any(skill_names):
        return None

    skill_attrs: list[str | None] = []
    for name in skill_names:
        if not name:
            skill_attrs.append(None)
            continue
        meta = game.skills.get(name)
        skill_attrs.append(meta.attr if meta else None)

    if enemy:
        primary, secondary = game.spirit_attrs(enemy.class_name)
        reason = f"YOLO:{enemy.class_name} conf={enemy.confidence:.2f}"
    else:
        primary, secondary = fallback_enemy_attr
        reason = "默认属性"

    idx = pick_best_skill_index(
        skill_names, skill_attrs, primary, secondary, game.type_matchups
    )
    chosen = skill_names[idx]
    if not chosen:
        return None

    return BattleDecision(skill_index=idx, skill_name=chosen, reason=reason)
