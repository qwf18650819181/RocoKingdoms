"""检查图鉴最终形态筛选是否合理。"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data" / "spirits.json"

FINAL = "最终阶段"
GAP = 11


def norm_stage(s):
    aliases = {
        "III阶": FINAL,
        "3阶": FINAL,
        "三阶": FINAL,
        "Ⅲ阶": FINAL,
        "最终形态": FINAL,
        "最终阶段": FINAL,
    }
    return aliases.get((s or "").replace(" ", ""), s or "")


def line_key(row):
    form = (row.get("地区形态") or "").strip() or "default"
    starter = (row.get("初阶名称") or "").strip()
    if starter:
        return f"line|{starter}|{form}"
    return f"dex|{row['编号']}|{form}"


def same_branch(a, b):
    return line_key(a) == line_key(b)


NON_FINAL_MOLT = {"板板壳", "咔咔壳"}


def is_display_final(spirit, group):
    if norm_stage(spirit["精灵阶段"]) != FINAL:
        return False
    if spirit.get("地区形态") == "蜕皮时的样子" and spirit["名称"] in NON_FINAL_MOLT:
        return False
    for later in group:
        if later["序号"] <= spirit["序号"]:
            continue
        if later["名称"] == spirit["名称"]:
            continue
        if norm_stage(later["精灵阶段"]) != FINAL:
            continue
        if not same_branch(spirit, later):
            continue
        if later["序号"] - spirit["序号"] > GAP:
            continue
        return False
    return True


def main():
    rows = json.loads(DATA.read_text(encoding="utf-8"))
    buckets: dict = {}
    for r in rows:
        buckets.setdefault(line_key(r), []).append(r)

    listed = [r for r in rows if is_display_final(r, buckets[line_key(r)])]
    names = {r["页面标题"] or r["名称"] for r in listed}

    checks = [
        ("雪绒鸟（春天的样子）", False),
        ("雪绒鸟（夏天的样子）", False),
        ("冬羽雀（春天的样子）", False),
        ("岚鸟（春天的样子）", True),
        ("岚鸟（本来的样子）", True),
        ("霜翼领主", True),
        ("板板壳（蜕皮时的样子）", False),
        ("水泡壳（本来的样子）", True),
    ]
    print(f"listed finals: {len(listed)} / {len(rows)}")
    for title, expect in checks:
        ok = title in names
        mark = "OK" if ok == expect else "FAIL"
        print(f"  [{mark}] {title}: expect={expect} got={ok}")

    bad = [
        r["页面标题"]
        for r in listed
        if "雪绒鸟" in (r["页面标题"] or "")
        and "岚鸟" not in (r["页面标题"] or "")
        and r["名称"] == "雪绒鸟"
    ]
    if bad:
        print("unexpected 雪绒鸟 finals:", bad)


if __name__ == "__main__":
    main()
