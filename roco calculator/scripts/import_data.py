"""从 roco spider 的 CSV 导出前端 JSON。"""

from __future__ import annotations

import json
import re
import shutil
import urllib.request
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
SPIDER_CSV = ROOT / "roco spider" / "output" / "csv"
SPIDER_IMAGES = ROOT / "roco spider" / "output" / "images" / "icons" / "attributes"
SPIDER_STAT_ICONS = ROOT / "roco spider" / "output" / "images" / "icons" / "stats"
OUT_DIR = Path(__file__).resolve().parents[1] / "public"
DATA_DIR = OUT_DIR / "data"
ICON_DIR = OUT_DIR / "icons" / "attributes"
STAT_ICON_DIR = OUT_DIR / "icons" / "stats"
SERIAL_COLUMN = "序号"
STAGE_COLUMN = "精灵阶段"

STAGE_ALIASES = {
    "I阶": "Ⅰ阶",
    "II阶": "Ⅱ阶",
    "1阶": "Ⅰ阶",
    "2阶": "Ⅱ阶",
    "一阶": "Ⅰ阶",
    "二阶": "Ⅱ阶",
    "III阶": "最终阶段",
    "3阶": "最终阶段",
    "三阶": "最终阶段",
    "Ⅲ阶": "最终阶段",
    "最终形态": "最终阶段",
    "最终阶段": "最终阶段",
}

SKILL_SOURCES = ("默认", "血脉", "技能石")
FINAL_STAGE_LABEL = "最终阶段"
DEX_COLUMN = "编号"
FORM_COLUMN = "地区形态"
STARTER_COLUMN = "初阶名称"
EVOLUTION_SERIAL_GAP = 11

ATTRIBUTE_ORDER = (
    "普通", "草", "火", "水", "光", "地", "冰", "龙", "电", "毒",
    "虫", "武", "翼", "萌", "幽", "恶", "机械", "幻",
)
RELATION_TO_KEY = {
    "造成提升": "strong",
    "造成降低": "resist",
    "受到提升": "weak",
    "受到降低": "vulnerable",
}
TYPE_EFFECT_CHART_CSV = "type_effect_chart.csv"
TYPE_MATCHUPS_CSV = "type_matchups.csv"
SPIRIT_EGG_GROUPS_CSV = "spirit_egg_groups.csv"


def merge_egg_groups(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    path = SPIDER_CSV / SPIRIT_EGG_GROUPS_CSV
    if not path.exists():
        out["蛋组"] = None
        return out

    egg_df = pd.read_csv(path)
    id_to_group: dict[int, str] = {}
    for row in egg_df.itertuples(index=False):
        spirit_id = parse_int_field(getattr(row, "spirit_id", None))
        group = normalize_text(getattr(row, "蛋组", None))
        if spirit_id is None or not group:
            continue
        id_to_group[spirit_id] = group

    out["蛋组"] = out["id"].map(lambda sid: id_to_group.get(int(sid)))
    return out


def has_valid_serial(df: pd.DataFrame) -> pd.Series:
    """精灵序号为空或无效视为脏数据。"""
    serial = pd.to_numeric(df[SERIAL_COLUMN], errors="coerce")
    return serial.notna() & (serial > 0)


def normalize_text(value: object) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = re.sub(r"\s+", "", str(value).strip())
    return text or None


def normalize_stage(value: object) -> str | None:
    text = normalize_text(value)
    if not text or text.lower() == "nan":
        return None
    return STAGE_ALIASES.get(text, text)


TITLE_COLUMN = "页面标题"
NAME_COLUMN = "名称"


def spirit_line_key(dex: object, form: object, starter: object) -> str:
    form_text = normalize_text(form) or "default"
    starter_text = normalize_text(starter)
    if starter_text:
        return f"line|{starter_text}|{form_text}"
    dex_val = int(dex) if dex is not None and not pd.isna(dex) else dex
    return f"dex|{dex_val}|{form_text}"


def same_evolution_branch(key_a: str, key_b: str) -> bool:
    return key_a == key_b


def is_superseded_final_mislabel(
    serial: int,
    name: str,
    stage: str | None,
    line_key: str,
    dex: object,
    later_rows: list[tuple[int, str, str | None, str, object]],
) -> bool:
    if stage != FINAL_STAGE_LABEL:
        return False
    for later_serial, later_name, later_stage, later_key, later_dex in later_rows:
        if later_serial <= serial:
            continue
        if later_name == name:
            continue
        if later_stage != FINAL_STAGE_LABEL:
            continue
        if not same_evolution_branch(line_key, later_key):
            continue
        if later_serial - serial > EVOLUTION_SERIAL_GAP:
            continue
        if str(dex) != str(later_dex):
            continue
        return True
    return False


def build_serial_stage_map(df: pd.DataFrame) -> dict[int, str]:
    serials = pd.to_numeric(df[SERIAL_COLUMN], errors="coerce")
    stages = df[STAGE_COLUMN].map(normalize_stage)
    mapping: dict[int, str] = {}
    for ser, stage in zip(serials, stages):
        if pd.isna(ser) or not stage:
            continue
        mapping[int(ser)] = stage
    return mapping


def is_variant_final_serial(serial: int, serial_stages: dict[int, str]) -> bool:
    """仅当 base 序号已是最终阶段时，base*10+1 变体（如圣光迪莫）才视为最终。"""
    if serial % 10 != 1:
        return False
    base = serial // 10
    return serial_stages.get(base) == FINAL_STAGE_LABEL


def resolve_row_stage(
    serial: object,
    stage: object,
    serial_stages: dict[int, str],
) -> str | None:
    normalized = normalize_stage(stage)
    if pd.isna(serial):
        return normalized

    s = int(serial)
    if is_variant_final_serial(s, serial_stages):
        return FINAL_STAGE_LABEL
    return normalized


def apply_evolution_line_stage_fix(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    serials = pd.to_numeric(out[SERIAL_COLUMN], errors="coerce")
    dex_vals = out[DEX_COLUMN]
    forms = out[FORM_COLUMN] if FORM_COLUMN in out.columns else pd.Series([None] * len(out))
    starters = (
        out[STARTER_COLUMN]
        if STARTER_COLUMN in out.columns
        else pd.Series([None] * len(out))
    )
    names = out[NAME_COLUMN]
    stages = out[STAGE_COLUMN].map(normalize_stage)

    line_buckets: dict[str, list[int]] = {}
    for idx in out.index:
        if pd.isna(serials.loc[idx]):
            continue
        key = spirit_line_key(
            dex_vals.loc[idx], forms.loc[idx], starters.loc[idx]
        )
        line_buckets.setdefault(key, []).append(idx)

    for indices in line_buckets.values():
        ordered = sorted(indices, key=lambda i: int(serials.loc[i]))
        for pos, idx in enumerate(ordered):
            serial = int(serials.loc[idx])
            name = str(names.loc[idx])
            stage = stages.loc[idx]
            line_key = spirit_line_key(
                dex_vals.loc[idx], forms.loc[idx], starters.loc[idx]
            )
            later_rows = []
            for later_idx in ordered[pos + 1 :]:
                later_rows.append(
                    (
                        int(serials.loc[later_idx]),
                        str(names.loc[later_idx]),
                        stages.loc[later_idx],
                        spirit_line_key(
                            dex_vals.loc[later_idx],
                            forms.loc[later_idx],
                            starters.loc[later_idx],
                        ),
                        dex_vals.loc[later_idx],
                    )
                )
            if is_superseded_final_mislabel(
                serial, name, stage, line_key, dex_vals.loc[idx], later_rows
            ):
                out.at[idx, STAGE_COLUMN] = "Ⅱ阶"
    return out


def normalize_spirits_df(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    serial_stages = build_serial_stage_map(out)
    serials = pd.to_numeric(out[SERIAL_COLUMN], errors="coerce")

    out[STAGE_COLUMN] = [
        resolve_row_stage(ser, stage, serial_stages)
        for ser, stage in zip(serials, out[STAGE_COLUMN])
    ]
    return apply_evolution_line_stage_fix(out)


def parse_int_field(value: object) -> int | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def df_to_records(df: pd.DataFrame) -> list[dict]:
    records = df.where(pd.notna(df), None).to_dict(orient="records")
    for row in records:
        for key, val in list(row.items()):
            if val is None:
                continue
            if isinstance(val, float):
                if pd.isna(val):
                    row[key] = None
                elif val == int(val):
                    row[key] = int(val)
    return records


def build_skill_attr_lookup(skills_df: pd.DataFrame) -> dict[int, str]:
    lookup: dict[int, str] = {}
    for row in skills_df.itertuples(index=False):
        skill_id = getattr(row, "id", None)
        attr = normalize_text(getattr(row, "属性", None))
        if skill_id is not None and attr and not pd.isna(skill_id):
            lookup[int(skill_id)] = attr
    return lookup


def sync_attribute_icons(icons_df: pd.DataFrame) -> dict[str, str]:
    """复制或下载属性图标到 public/icons/attributes。"""
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    urls: dict[str, str] = {}
    for row in icons_df.itertuples(index=False):
        if getattr(row, "分类", None) != "属性":
            continue
        name = normalize_text(getattr(row, "名称", None))
        if not name:
            continue
        link = getattr(row, "图标链接", None)
        if isinstance(link, str) and link:
            urls[name] = link

    public_paths: dict[str, str] = {}
    for name, url in urls.items():
        filename = f"{name}.png"
        dst = ICON_DIR / filename
        src = SPIDER_IMAGES / filename
        if src.exists() and src.stat().st_size > 0:
            shutil.copy2(src, dst)
        elif not dst.exists() or dst.stat().st_size == 0:
            try:
                urllib.request.urlretrieve(url, dst)
            except OSError as err:
                print(f"  warn: icon download failed {name}: {err}")
                continue
        if dst.exists() and dst.stat().st_size > 0:
            public_paths[name] = f"/icons/attributes/{filename}"
    return public_paths


def sync_stat_icons(icons_df: pd.DataFrame) -> dict[str, str]:
    """复制或下载资质图标到 public/icons/stats。"""
    STAT_ICON_DIR.mkdir(parents=True, exist_ok=True)
    urls: dict[str, str] = {}
    for row in icons_df.itertuples(index=False):
        if getattr(row, "分类", None) != "资质":
            continue
        name = normalize_text(getattr(row, "名称", None))
        if not name or name == "种族":
            continue
        link = getattr(row, "图标链接", None)
        if isinstance(link, str) and link:
            urls[name] = link

    public_paths: dict[str, str] = {}
    for name, url in urls.items():
        filename = f"{name}.png"
        dst = STAT_ICON_DIR / filename
        src = SPIDER_STAT_ICONS / filename
        if src.exists() and src.stat().st_size > 0:
            shutil.copy2(src, dst)
        elif not dst.exists() or dst.stat().st_size == 0:
            try:
                urllib.request.urlretrieve(url, dst)
            except OSError as err:
                print(f"  warn: stat icon download failed {name}: {err}")
                continue
        if dst.exists() and dst.stat().st_size > 0:
            public_paths[name] = f"/icons/stats/{filename}"
    return public_paths


def export_spirit_skills(
    df: pd.DataFrame,
    skill_attrs: dict[int, str],
) -> dict[str, dict[str, list[dict]]]:
    """按 spirit_id 聚合三种来源的技能列表。"""
    by_spirit: dict[str, dict[str, list[dict]]] = {}
    for row in df_to_records(df):
        sid = str(int(row["spirit_id"]))
        source = row["技能来源"]
        if source not in SKILL_SOURCES:
            continue
        entry: dict = {"name": row["技能名"]}
        level = row.get("解锁等级")
        if level is not None:
            entry["level"] = level
        skill_id = row.get("skill_id")
        if skill_id is not None:
            attr = skill_attrs.get(int(skill_id))
            if attr:
                entry["attr"] = attr
        buckets = by_spirit.setdefault(sid, {s: [] for s in SKILL_SOURCES})
        buckets[source].append(entry)

    for buckets in by_spirit.values():
        default = buckets["默认"]
        default.sort(
            key=lambda s: (
                s.get("level") is None,
                s.get("level") if s.get("level") is not None else 0,
                s["name"],
            )
        )
        for source in ("血脉", "技能石"):
            buckets[source].sort(key=lambda s: s["name"])
    return by_spirit


def _attribute_sort_key(name: str) -> tuple[int, str]:
    try:
        return (ATTRIBUTE_ORDER.index(name), name)
    except ValueError:
        return (len(ATTRIBUTE_ORDER), name)


def export_type_effectiveness() -> dict:
    chart_path = SPIDER_CSV / TYPE_EFFECT_CHART_CSV
    matchups_path = SPIDER_CSV / TYPE_MATCHUPS_CSV
    if not chart_path.exists() or not matchups_path.exists():
        raise FileNotFoundError(
            f"缺少属性克制 CSV，请先在 roco spider 运行爬虫："
            f"{TYPE_EFFECT_CHART_CSV} / {TYPE_MATCHUPS_CSV}"
        )

    chart: dict[str, dict[str, list[str]]] = {
        name: {key: [] for key in RELATION_TO_KEY.values()}
        for name in ATTRIBUTE_ORDER
    }
    chart_df = pd.read_csv(chart_path)
    for row in chart_df.itertuples(index=False):
        attr = normalize_text(getattr(row, "属性", None))
        relation = normalize_text(getattr(row, "关系", None))
        other = normalize_text(getattr(row, "对方属性", None))
        if not attr or not relation or not other:
            continue
        key = RELATION_TO_KEY.get(relation)
        if not key:
            continue
        groups = chart.setdefault(
            attr,
            {relation_key: [] for relation_key in RELATION_TO_KEY.values()},
        )
        groups[key].append(other)

    for groups in chart.values():
        for relation_key in groups:
            groups[relation_key] = sorted(set(groups[relation_key]))

    matchups: dict[str, dict[str, float]] = {}
    for defend, groups in chart.items():
        for attack in groups.get("weak", []):
            matchups.setdefault(attack, {})[defend] = 2.0
        for attack in groups.get("vulnerable", []):
            matchups.setdefault(attack, {})[defend] = 0.5
    for attack, groups in chart.items():
        for defend in groups.get("strong", []):
            matchups.setdefault(attack, {})[defend] = 2.0
        for defend in groups.get("resist", []):
            matchups.setdefault(attack, {})[defend] = 0.5

    attributes = sorted(chart.keys(), key=_attribute_sort_key)
    return {"attributes": attributes, "chart": chart, "matchups": matchups}


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    spirits_raw = pd.read_csv(SPIDER_CSV / "spirits.csv")
    valid_mask = has_valid_serial(spirits_raw)
    spirits = normalize_spirits_df(spirits_raw.loc[valid_mask].copy())
    spirits = merge_egg_groups(spirits)
    valid_ids = set(spirits["id"].astype(int))

    skipped = len(spirits_raw) - len(spirits)
    with (DATA_DIR / "spirits.json").open("w", encoding="utf-8") as f:
        json.dump(df_to_records(spirits), f, ensure_ascii=False)

    all_skills = pd.read_csv(SPIDER_CSV / "skills.csv")
    skill_attrs = build_skill_attr_lookup(all_skills)

    skills_raw = pd.read_csv(SPIDER_CSV / "spirit_skills.csv")
    skills = skills_raw.loc[skills_raw["spirit_id"].isin(valid_ids)]
    skill_map = export_spirit_skills(skills, skill_attrs)
    with (DATA_DIR / "spirit_skills.json").open("w", encoding="utf-8") as f:
        json.dump(skill_map, f, ensure_ascii=False)

    icons = pd.read_csv(SPIDER_CSV / "icons.csv")
    attr_icons = sync_attribute_icons(icons)
    with (DATA_DIR / "attribute_icons.json").open("w", encoding="utf-8") as f:
        json.dump(attr_icons, f, ensure_ascii=False)

    stat_icons = sync_stat_icons(icons)
    with (DATA_DIR / "stat_icons.json").open("w", encoding="utf-8") as f:
        json.dump(stat_icons, f, ensure_ascii=False)

    with (DATA_DIR / "icons.json").open("w", encoding="utf-8") as f:
        json.dump(df_to_records(icons), f, ensure_ascii=False)

    skills_catalog = pd.read_csv(SPIDER_CSV / "skills.csv")
    skill_lookup: dict[str, dict[str, str | None]] = {}
    for row in skills_catalog.itertuples(index=False):
        name = normalize_text(getattr(row, "技能名称", None))
        if not name:
            continue
        skill_lookup[name] = {
            "category": normalize_text(getattr(row, "技能类别", None)),
            "attr": normalize_text(getattr(row, "属性", None)),
            "effect": normalize_text(getattr(row, "效果", None)),
            "description": normalize_text(getattr(row, "描述", None)),
            "energy": parse_int_field(getattr(row, "耗能", None)),
            "power": parse_int_field(getattr(row, "威力", None)),
        }
    with (DATA_DIR / "skills.json").open("w", encoding="utf-8") as f:
        json.dump(skill_lookup, f, ensure_ascii=False)

    type_effectiveness = export_type_effectiveness()
    with (DATA_DIR / "type_effectiveness.json").open("w", encoding="utf-8") as f:
        json.dump(type_effectiveness, f, ensure_ascii=False)

    matchup_count = sum(len(v) for v in type_effectiveness["matchups"].values())
    print(
        f"Exported {len(spirits)} spirits "
        f"(skipped {skipped} without {SERIAL_COLUMN}) "
        f"-> {DATA_DIR / 'spirits.json'}"
    )
    print(f"Exported skills for {len(skill_map)} spirits -> {DATA_DIR / 'spirit_skills.json'}")
    print(f"Attribute icons: {len(attr_icons)} -> {ICON_DIR}")
    print(f"Stat icons: {len(stat_icons)} -> {STAT_ICON_DIR}")
    print(
        f"Type effectiveness: {len(type_effectiveness['attributes'])} attributes, "
        f"{matchup_count} matchups -> {DATA_DIR / 'type_effectiveness.json'}"
    )
    print(f"Skills catalog: {len(skill_lookup)} -> {DATA_DIR / 'skills.json'}")


if __name__ == "__main__":
    main()
