from __future__ import annotations


def type_multiplier(
    attack_attr: str | None,
    defend_primary: str,
    defend_secondary: str | None,
    matchups: dict[str, dict[str, float]],
) -> float:
    if not attack_attr:
        return 1.0
    row = matchups.get(attack_attr) or {}
    mult = float(row.get(defend_primary, 1.0))
    if defend_secondary:
        mult *= float(row.get(defend_secondary, 1.0))
    return mult


def pick_best_skill_index(
    skill_names: list[str | None],
    skill_attrs: list[str | None],
    enemy_primary: str,
    enemy_secondary: str | None,
    matchups: dict[str, dict[str, float]],
) -> int:
    best_idx = 0
    best_score = -1.0
    for idx, name in enumerate(skill_names):
        if not name:
            continue
        attr = skill_attrs[idx]
        score = type_multiplier(attr, enemy_primary, enemy_secondary, matchups)
        if score > best_score:
            best_score = score
            best_idx = idx
    return best_idx
