#!/usr/bin/env python3
"""根据 calculator 数据自动推荐 6 人 PVP 队伍（每只精灵最多 1 个血脉技能）。"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT.parent / "roco calculator" / "public" / "data"
OUT = ROOT / "teams" / "main_team.json"

SOURCES = ("默认", "血脉", "技能石")
ATTACK_CATS = {"物攻", "魔攻"}
SKILL_COUNT = 4
TEAM_SIZE = 6


def load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def spirit_skills(spirit_id: int, skill_map: dict, catalog: dict) -> list[dict]:
    entry = skill_map.get(str(spirit_id), {})
    out: list[dict] = []
    seen: set[str] = set()
    for src in SOURCES:
        for row in entry.get(src) or []:
            name = row.get("name")
            if not name or name in seen:
                continue
            meta = catalog.get(name) or {}
            seen.add(name)
            out.append(
                {
                    "name": name,
                    "source": src,
                    "category": meta.get("category"),
                    "attr": meta.get("attr"),
                }
            )
    return out


def attack_coverage(attr: str, matchups: dict) -> set[str]:
    row = matchups.get(attr) or {}
    return {t for t, m in row.items() if m >= 2.0}


def _score_skill(sk: dict, covered: set[str], matchups: dict) -> float:
    targets = attack_coverage(sk["attr"], matchups)
    new_hits = len(targets - covered)
    return new_hits * 10.0 + len(targets)


def pick_four_skills(
    skills: list[dict],
    matchups: dict,
    already_covered: set[str],
) -> list[str]:
    attack_skills = [
        s
        for s in skills
        if s.get("category") in ATTACK_CATS and s.get("attr")
    ]
    if len(attack_skills) < SKILL_COUNT:
        return []

    chosen: list[str] = []
    covered = set(already_covered)
    bloodline_used = False

    for _ in range(SKILL_COUNT):
        best_name = None
        best_score = -1.0
        for sk in attack_skills:
            if sk["name"] in chosen:
                continue
            if sk["source"] == "血脉" and bloodline_used:
                continue
            score = _score_skill(sk, covered, matchups)
            if score > best_score:
                best_score = score
                best_name = sk["name"]

        if not best_name:
            for sk in attack_skills:
                if sk["name"] in chosen:
                    continue
                if sk["source"] == "血脉" and bloodline_used:
                    continue
                best_name = sk["name"]
                break

        if not best_name:
            break

        chosen.append(best_name)
        picked = next(s for s in attack_skills if s["name"] == best_name)
        if picked["source"] == "血脉":
            bloodline_used = True
        covered |= attack_coverage(picked["attr"], matchups)

    if len(chosen) < SKILL_COUNT:
        return []
    return chosen


def count_bloodline_in_pick(skills: list[str], spirit_id: int, skill_map: dict) -> int:
    entry = skill_map.get(str(spirit_id), {})
    bloodline_names = {row.get("name") for row in entry.get("血脉") or []}
    return sum(1 for n in skills if n in bloodline_names)


def team_coverage(slots: list[dict], catalog: dict, matchups: dict) -> set[str]:
    covered: set[str] = set()
    for slot in slots:
        for name in slot["skills"]:
            meta = catalog.get(name) or {}
            attr = meta.get("attr")
            if meta.get("category") in ATTACK_CATS and attr:
                covered |= attack_coverage(attr, matchups)
    return covered


def is_skill_slot_restricted(spirit: dict) -> bool:
    desc = spirit.get("特性描述") or ""
    trait = spirit.get("特性") or ""
    text = desc + trait
    if "仅可" in text or "仅可以" in text or "只能" in text:
        return True
    if "1号位" in text and "2号" not in text and "3号" not in text and "4号" not in text:
        return True
    return False


def build_team() -> dict:
    spirits = [s for s in load("spirits.json") if s.get("精灵阶段") == "最终阶段"]
    spirits = [s for s in spirits if not is_skill_slot_restricted(s)]
    skill_map = load("spirit_skills.json")
    catalog = load("skills.json")
    type_eff = load("type_effectiveness.json")
    matchups = type_eff["matchups"]
    all_attrs = type_eff["attributes"]

    candidates: list[dict] = []
    for s in spirits:
        sid = int(s["id"])
        skills = spirit_skills(sid, skill_map, catalog)
        non_blood = [
            x
            for x in skills
            if x.get("category") in ATTACK_CATS
            and x.get("attr")
            and x.get("source") != "血脉"
        ]
        blood = [
            x
            for x in skills
            if x.get("category") in ATTACK_CATS
            and x.get("attr")
            and x.get("source") == "血脉"
        ]
        if len(non_blood) + (1 if blood else 0) < SKILL_COUNT:
            continue
        candidates.append(
            {
                "id": sid,
                "name": s["名称"],
                "bst": s.get("种族值总和") or 0,
                "primary": s["主属性"],
                "secondary": s.get("副属性"),
                "skills": skills,
            }
        )

    candidates.sort(key=lambda c: c["bst"], reverse=True)

    team_slots: list[dict] = []
    covered: set[str] = set()
    used_ids: set[int] = set()
    used_primary: set[str] = set()

    for _ in range(TEAM_SIZE):
        best = None
        best_key = (-1, -1, -1, -1)
        for c in candidates:
            if c["id"] in used_ids:
                continue
            diversity = 0 if c["primary"] not in used_primary else -3
            skills4 = pick_four_skills(c["skills"], matchups, covered)
            if len(skills4) < 4:
                continue
            if count_bloodline_in_pick(skills4, c["id"], skill_map) > 1:
                continue
            trial = team_slots + [{"spiritId": c["id"], "skills": skills4}]
            new_cov = team_coverage(trial, catalog, matchups)
            marginal = len(new_cov - covered)
            key = (marginal, len(new_cov), c["bst"] + diversity * 50, c["bst"])
            if key > best_key:
                best_key = key
                best = (c, skills4, new_cov)

        if not best:
            break
        c, skills4, new_cov = best
        used_ids.add(c["id"])
        used_primary.add(c["primary"])
        covered = new_cov
        team_slots.append({"spiritId": c["id"], "skills": skills4})

    while len(team_slots) < TEAM_SIZE:
        for c in candidates:
            if c["id"] in used_ids:
                continue
            skills4 = pick_four_skills(c["skills"], matchups, covered)
            if len(skills4) < 4:
                continue
            used_ids.add(c["id"])
            team_slots.append({"spiritId": c["id"], "skills": skills4})
            covered = team_coverage(team_slots, catalog, matchups)
            break
        else:
            break

    missing = [a for a in all_attrs if a not in covered]
    return {
        "version": 1,
        "slots": team_slots,
        "_meta": {
            "covered": sorted(covered),
            "missing": missing,
            "coverage_rate": f"{len(covered)}/{len(all_attrs)}",
        },
    }


def skill_source_label(name: str, spirit_id: int, skill_map: dict) -> str:
    entry = skill_map.get(str(spirit_id), {})
    for src in SOURCES:
        for row in entry.get(src) or []:
            if row.get("name") == name:
                return src
    return "?"


def main() -> None:
    skill_map = load("spirit_skills.json")
    team = build_team()
    meta = team.pop("_meta", {})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(team, ensure_ascii=False, indent=2), encoding="utf-8")

    spirits = {int(s["id"]): s for s in load("spirits.json")}
    print(f"已写入 {OUT}")
    print(f"打击面: {meta.get('coverage_rate')}  缺失: {meta.get('missing')}")
    print()
    for i, slot in enumerate(team["slots"], 1):
        sid = slot["spiritId"]
        s = spirits.get(sid, {})
        name = s.get("名称", "?")
        attrs = s.get("主属性", "")
        if s.get("副属性"):
            attrs += f"/{s['副属性']}"
        blood = count_bloodline_in_pick(slot["skills"], sid, skill_map)
        print(f"{i}. {name} ({attrs}) BST={s.get('种族值总和')}  血脉={blood}")
        for sk in slot["skills"]:
            src = skill_source_label(sk, sid, skill_map)
            print(f"   - [{src}] {sk}")


if __name__ == "__main__":
    main()
