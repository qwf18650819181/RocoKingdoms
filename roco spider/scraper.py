"""洛克王国世界 BWIKI 精灵数据爬虫。"""

from __future__ import annotations

import argparse
import re
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import pandas as pd
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://wiki.biligame.com/rocom/api.php"
WIKI_HOME = "https://wiki.biligame.com/rocom/%E9%A6%96%E9%A1%B5"

SPIRIT_ASK_QUERY = (
    "[[分类:精灵]]"
    "|?精灵编号"
    "|?精灵序号"
    "|?精灵名称"
    "|?精灵阶段"
    "|?精灵类型"
    "|?主属性"
    "|?2属性"
    "|?特性"
    "|?特性描述"
    "|?生命"
    "|?物攻"
    "|?魔攻"
    "|?物防"
    "|?魔防"
    "|?速度"
    "|?回顾"
    "|?星光"
    "|?技能"
    "|?技能解锁等级"
    "|?血脉技能"
    "|?可学技能石"
    "|?是否有异色"
    "|?精灵初阶名称"
    "|?地区形态名称"
    "|?进化条件"
    "|?体型"
    "|?重量"
    "|?分布地区"
    "|?更新版本"
)

SKILL_ASK_QUERY = (
    "[[分类:技能]]"
    "|?技能名称"
    "|?描述"
    "|?效果"
    "|?耗能"
    "|?属性"
    "|?威力"
    "|?技能类别"
    "|?技能版本"
)

STAT_FIELDS = ("生命", "物攻", "魔攻", "物防", "魔防", "速度")
INT_FIELDS_SPIRIT = STAT_FIELDS + ("种族值总和", "回顾", "星光值")
INT_FIELDS_SKILL = ("耗能",)
ATTRIBUTE_NAMES = (
    "普通", "草", "火", "水", "光", "地", "冰", "龙", "电", "毒",
    "虫", "武", "翼", "萌", "幽", "恶", "机械", "幻",
)
STAT_ICON_NAMES = ("生命", "物攻", "魔攻", "物防", "魔防", "速度", "种族")
REQUEST_INTERVAL = 0.8
MAX_RETRIES = 8

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


def create_session() -> requests.Session:
    session = requests.Session()
    session.trust_env = False
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            "Referer": "https://wiki.biligame.com/rocom/",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Accept": "application/json,text/html,*/*",
        }
    )
    return session


def api_get(session: requests.Session, params: dict[str, Any], retries: int = MAX_RETRIES) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            response = session.get(BASE_URL, params=params, timeout=60)
            if response.status_code in {429, 567, 502, 503, 504}:
                raise requests.HTTPError(f"HTTP {response.status_code}", response=response)
            response.raise_for_status()
            payload = response.json()
            if "error" in payload:
                raise RuntimeError(payload["error"].get("info", "unknown API error"))
            return payload
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            time.sleep(min(REQUEST_INTERVAL * (2 ** attempt), 20))
    raise RuntimeError(f"API 请求失败: {params}") from last_error


def first_value(values: list[Any]) -> str:
    if not values:
        return ""
    return str(values[0]).strip()


def join_values(values: list[Any], sep: str = "、") -> str:
    if not values:
        return ""
    return sep.join(str(item).strip() for item in values if str(item).strip())


def strip_wiki_text(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"''+", "", cleaned)
    cleaned = re.sub(r"<[^>]+>", "", cleaned)
    cleaned = re.sub(r"\[\[([^|\]]+)\|([^\]]+)\]\]", r"\2", cleaned)
    cleaned = re.sub(r"\[\[([^\]]+)\]\]", r"\1", cleaned)
    return cleaned.strip()


def to_int(value: Any) -> int | None:
    text = str(value).strip()
    if not text or text in {"-", "nan", "None"}:
        return None
    digits = re.sub(r"\D", "", text)
    if not digits:
        return None
    return int(digits)


def format_code(value: Any, width: int = 3) -> str:
    text = str(value).strip()
    if not text or text in {"nan", "None"}:
        return ""
    if text.endswith(".0") and text[:-2].isdigit():
        text = text[:-2]
    digits = re.sub(r"\D", "", text)
    if not digits:
        return text
    return digits.zfill(width) if width else digits


def parse_skill_pairs(skills: str, levels: str, source: str) -> list[dict[str, str]]:
    skill_list = [item.strip() for item in skills.split(",") if item.strip()]
    level_list = [item.strip() for item in levels.split(",") if item.strip()]
    rows: list[dict[str, str]] = []
    for index, skill in enumerate(skill_list):
        level = level_list[index] if index < len(level_list) else ""
        rows.append({"技能来源": source, "技能名": skill, "解锁等级": level})
    return rows


def fetch_paginated_ask(
    session: requests.Session,
    base_query: str,
    page_size: int = 50,
) -> dict[str, dict[str, Any]]:
    offset = 0
    results: dict[str, dict[str, Any]] = {}
    while True:
        query = f"{base_query}|limit={page_size}|offset={offset}"
        payload = api_get(session, {"action": "ask", "query": query, "format": "json"})
        batch = payload.get("query", {}).get("results", {})
        if not batch:
            break
        results.update(batch)
        if "query-continue-offset" not in payload:
            break
        offset = payload["query-continue-offset"]
        time.sleep(REQUEST_INTERVAL)
    return results


def fetch_all_spirits(session: requests.Session) -> dict[str, dict[str, Any]]:
    return fetch_paginated_ask(session, SPIRIT_ASK_QUERY)


def fetch_all_skills(session: requests.Session) -> dict[str, dict[str, Any]]:
    return fetch_paginated_ask(session, SKILL_ASK_QUERY)


def portrait_file_title(display_name: str) -> str:
    return f"File:页面 宠物 立绘 {display_name.strip()} 1.png"


def portrait_name_candidates(row: dict[str, Any]) -> list[str]:
    candidates = [row["页面标题"], row["名称"]]
    if row.get("地区形态"):
        candidates.insert(1, f"{row['名称']}（{row['地区形态']}）")
    default_form = f"{row['名称']}（本来的样子）"
    if default_form not in candidates:
        candidates.append(default_form)
    seen: set[str] = set()
    result: list[str] = []
    for candidate in candidates:
        candidate = candidate.strip()
        if candidate and candidate not in seen:
            seen.add(candidate)
            result.append(candidate)
    return result


def portrait_file_key(display_name: str) -> str:
    return f"页面 宠物 立绘 {display_name.strip()} 1.png"


def fetch_file_urls_batch(session: requests.Session, file_titles: list[str]) -> dict[str, str]:
    url_map: dict[str, str] = {}
    unique_titles = list(dict.fromkeys(file_titles))
    for start in range(0, len(unique_titles), 50):
        chunk = unique_titles[start : start + 50]
        payload = api_get(
            session,
            {
                "action": "query",
                "titles": "|".join(chunk),
                "prop": "imageinfo",
                "iiprop": "url",
                "format": "json",
            },
        )
        for page in payload.get("query", {}).get("pages", {}).values():
            if "missing" in page or "imageinfo" not in page:
                continue
            title = page["title"].replace("文件:", "")
            url_map[title] = page["imageinfo"][0]["url"]
        time.sleep(REQUEST_INTERVAL)
    return url_map


def normalize_image_url(url: str) -> str:
    if "/thumb/" not in url:
        return url
    prefix, remainder = url.split("/thumb/", 1)
    original_path = remainder.split("/", 1)[1]
    return f"{prefix}/{original_path}"


def parse_portrait_from_page(session: requests.Session, page_title: str) -> str:
    payload = api_get(
        session,
        {"action": "parse", "page": page_title, "format": "json"},
    )
    soup = BeautifulSoup(payload["parse"]["text"]["*"], "html.parser")
    base_name = page_title.split("（", 1)[0]
    portrait_url = ""
    fallback_url = ""

    for img in soup.select("img"):
        alt = img.get("alt", "")
        src = img.get("src", "")
        if "立绘" not in alt or not src:
            continue
        if base_name not in alt and page_title not in alt:
            continue
        normalized = normalize_image_url(src)
        if alt.startswith(f"页面 宠物 立绘 {page_title}"):
            return normalized
        if alt.startswith(f"页面 宠物 立绘 {base_name}"):
            portrait_url = normalized
        elif not fallback_url:
            fallback_url = normalized

    return portrait_url or fallback_url


def resolve_spirit_image_urls(session: requests.Session, spirits_with_id: list[dict[str, Any]]) -> int:
    primary_titles = [portrait_file_title(row["页面标题"]) for row in spirits_with_id]
    url_map = fetch_file_urls_batch(session, primary_titles)

    unresolved: list[dict[str, Any]] = []
    for row in spirits_with_id:
        url = url_map.get(portrait_file_key(row["页面标题"]), "")
        if url:
            row["立绘链接"] = url
        else:
            row["立绘链接"] = ""
            unresolved.append(row)

    fallback_titles: list[str] = []
    for row in unresolved:
        for candidate in portrait_name_candidates(row)[1:]:
            file_key = portrait_file_key(candidate)
            if file_key not in url_map:
                fallback_titles.append(portrait_file_title(candidate))

    if fallback_titles:
        url_map.update(fetch_file_urls_batch(session, fallback_titles))

    still_unresolved: list[dict[str, Any]] = []
    for row in unresolved:
        for candidate in portrait_name_candidates(row)[1:]:
            url = url_map.get(portrait_file_key(candidate), "")
            if url:
                row["立绘链接"] = url
                break
        if not row["立绘链接"]:
            still_unresolved.append(row)

    for row in still_unresolved:
        url = parse_portrait_from_page(session, row["页面标题"])
        if url:
            row["立绘链接"] = url
        time.sleep(REQUEST_INTERVAL)

    return sum(1 for row in spirits_with_id if row.get("立绘链接"))


def image_extension_from_url(url: str) -> str:
    suffix = Path(urlparse(url).path).suffix.lower()
    return suffix if suffix in {".png", ".jpg", ".jpeg", ".webp", ".gif"} else ".png"


def download_image_file(session: requests.Session, url: str, dest: Path, delay: float = 0.1) -> bool:
    if dest.exists() and dest.stat().st_size > 0:
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    response = session.get(url, timeout=60)
    response.raise_for_status()
    dest.write_bytes(response.content)
    if delay:
        time.sleep(delay)
    return True


def build_icon_definitions() -> list[dict[str, str]]:
    icons: list[dict[str, str]] = []
    for name in ATTRIBUTE_NAMES:
        icons.append(
            {
                "分类": "属性",
                "名称": name,
                "wiki文件": f"图标 宠物 属性 {name}.png",
                "相对路径": f"images/icons/attributes/{name}.png",
            }
        )
    for name in STAT_ICON_NAMES:
        icons.append(
            {
                "分类": "资质",
                "名称": name,
                "wiki文件": f"图标 宠物 资质 {name}.png",
                "相对路径": f"images/icons/stats/{name}.png",
            }
        )
    return icons


def fetch_game_icons(session: requests.Session, download_files: bool, output_dir: Path) -> list[dict[str, Any]]:
    definitions = build_icon_definitions()
    file_titles = [f"File:{item['wiki文件']}" for item in definitions]
    url_map = fetch_file_urls_batch(session, file_titles)

    rows: list[dict[str, Any]] = []
    for index, item in enumerate(definitions, start=1):
        url = url_map.get(item["wiki文件"], "")
        rel_path = item["相对路径"] if url else ""
        if url and download_files:
            dest = output_dir.parent / rel_path
            download_image_file(session, url, dest, delay=0.05)
        rows.append(
            {
                "id": index,
                "分类": item["分类"],
                "名称": item["名称"],
                "图标链接": url,
                "图标路径": rel_path.replace("\\", "/") if url else "",
            }
        )
    return rows


def download_spirit_images(
    session: requests.Session,
    spirits_with_id: list[dict[str, Any]],
    output_dir: Path,
) -> int:
    images_dir = output_dir.parent / "images" / "spirits"
    images_dir.mkdir(parents=True, exist_ok=True)
    downloaded = 0

    for row in spirits_with_id:
        url = row.get("立绘链接", "")
        if not url:
            row["立绘路径"] = ""
            continue

        extension = image_extension_from_url(url)
        filename = f"{int(row['id']):04d}{extension}"
        rel_path = f"images/spirits/{filename}"
        dest = output_dir.parent / rel_path

        if url:
            download_image_file(session, url, dest, delay=0.15)
        row["立绘路径"] = rel_path.replace("\\", "/") if url else ""
        if row["立绘路径"]:
            downloaded += 1

    return downloaded


def fetch_egg_group_rows(session: requests.Session) -> list[dict[str, str]]:
    payload = api_get(
        session,
        {"action": "parse", "page": "蛋组计算器", "format": "json"},
    )
    html = payload["parse"]["text"]["*"]
    soup = BeautifulSoup(html, "html.parser")

    rows: list[dict[str, str]] = []
    for group_block in soup.select("div.rocom_egg_cacl_result"):
        group_name = (group_block.get("data-type") or "").strip()
        if not group_name:
            continue
        for card in group_block.select("div.rocom_egg_cacl_card"):
            number_node = card.select_one("div.rocom_egg_cacl_card_num")
            name_node = card.select_one("div.rocom_egg_cacl_card_name")
            if name_node is None:
                continue
            spirit_name = name_node.get_text(strip=True)
            if not spirit_name:
                continue
            number_text = number_node.get_text(strip=True) if number_node else ""
            number = re.sub(r"\D", "", number_text)
            rows.append(
                {
                    "蛋组": group_name,
                    "编号": number.zfill(3) if number else "",
                    "精灵名称": spirit_name,
                }
            )
    return rows


TYPE_EFFECT_PAGE = "克制计算器"
TYPE_EFFECT_RELATIONS = (
    ("strong", "造成提升", "2.0"),
    ("resist", "造成降低", "0.5"),
    ("weak", "受到提升", "2.0"),
    ("vulnerable", "受到降低", "0.5"),
)
_TYPE_EFFECT_ENTRY_RE = re.compile(
    r"'([^']+)':\s*\{\s*"
    r"strong:\s*\[(.*?)\],\s*"
    r"resist:\s*\[(.*?)\],\s*"
    r"weak:\s*\[(.*?)\],\s*"
    r"vulnerable:\s*\[(.*?)\]\s*\}",
    re.S,
)


def _parse_js_string_list(raw: str) -> list[str]:
    return [item for item in re.findall(r"'([^']*)'", raw) if item]


def parse_type_effect_chart_from_html(html: str) -> dict[str, dict[str, list[str]]]:
    match = re.search(r"const typeEffectChart\s*=\s*(\{.*?\});\s*const", html, re.S)
    if not match:
        raise RuntimeError(f"页面「{TYPE_EFFECT_PAGE}」未找到 typeEffectChart 数据")
    chart: dict[str, dict[str, list[str]]] = {}
    for name, strong, resist, weak, vulnerable in _TYPE_EFFECT_ENTRY_RE.findall(match.group(1)):
        chart[name] = {
            "strong": _parse_js_string_list(strong),
            "resist": _parse_js_string_list(resist),
            "weak": _parse_js_string_list(weak),
            "vulnerable": _parse_js_string_list(vulnerable),
        }
    if not chart:
        raise RuntimeError(f"页面「{TYPE_EFFECT_PAGE}」typeEffectChart 解析结果为空")
    return chart


def fetch_type_effect_chart(session: requests.Session) -> dict[str, dict[str, list[str]]]:
    payload = api_get(
        session,
        {"action": "parse", "page": TYPE_EFFECT_PAGE, "format": "json"},
    )
    return parse_type_effect_chart_from_html(payload["parse"]["text"]["*"])


def build_type_effect_rows(chart: dict[str, dict[str, list[str]]]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for attr in sorted(chart):
        groups = chart[attr]
        for relation_key, label, multiplier in TYPE_EFFECT_RELATIONS:
            for other in groups.get(relation_key, []):
                rows.append(
                    {
                        "属性": attr,
                        "关系": label,
                        "对方属性": other,
                        "倍率": multiplier,
                    }
                )
    return rows


def build_type_matchup_rows(chart: dict[str, dict[str, list[str]]]) -> list[dict[str, str]]:
    multipliers: dict[tuple[str, str], str] = {}
    for defend, groups in chart.items():
        for attack in groups.get("weak", []):
            multipliers[(attack, defend)] = "2.0"
        for attack in groups.get("vulnerable", []):
            multipliers[(attack, defend)] = "0.5"
    return [
        {"攻击属性": attack, "防御属性": defend, "倍率": multiplier}
        for (attack, defend), multiplier in sorted(multipliers.items())
    ]


def spirit_sort_key(row: dict[str, Any]) -> tuple[int, str]:
    number = row.get("编号", "")
    digits = re.sub(r"\D", "", str(number))
    return (int(digits) if digits else 999999, str(row.get("名称", "")))


def build_spirit_aliases(page_title: str, printouts: dict[str, list[Any]], name: str) -> list[str]:
    aliases = [page_title.strip(), name.strip(), first_value(printouts.get("精灵名称", [])).strip()]
    region_name = first_value(printouts.get("地区形态名称", []))
    base_name = first_value(printouts.get("精灵名称", []))
    if base_name and region_name:
        aliases.append(f"{base_name}（{region_name}）")
    seen: set[str] = set()
    result: list[str] = []
    for alias in aliases:
        if alias and alias not in seen:
            seen.add(alias)
            result.append(alias)
    return result


def build_spirit_rows(
    spirits: dict[str, dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    spirit_rows: list[dict[str, Any]] = []
    spirit_skill_rows: list[dict[str, Any]] = []
    spirit_type_rows: list[dict[str, Any]] = []

    for page_title, item in spirits.items():
        printouts = item.get("printouts", {})
        name = join_values(printouts.get("精灵名称", [])) or page_title.strip()
        stats = {field: first_value(printouts.get(field, [])) for field in STAT_FIELDS}
        stat_values = [to_int(stats[field]) for field in STAT_FIELDS]
        stat_total = sum(value for value in stat_values if value is not None)

        spirit_row = {
            "编号": format_code(first_value(printouts.get("精灵编号", []))),
            "序号": format_code(first_value(printouts.get("精灵序号", [])), width=0),
            "名称": name,
            "页面标题": page_title.strip(),
            "精灵阶段": first_value(printouts.get("精灵阶段", [])),
            "主属性": first_value(printouts.get("主属性", [])),
            "副属性": first_value(printouts.get("2属性", [])),
            "特性": first_value(printouts.get("特性", [])),
            "特性描述": first_value(printouts.get("特性描述", [])),
            "生命": to_int(stats["生命"]),
            "物攻": to_int(stats["物攻"]),
            "魔攻": to_int(stats["魔攻"]),
            "物防": to_int(stats["物防"]),
            "魔防": to_int(stats["魔防"]),
            "速度": to_int(stats["速度"]),
            "种族值总和": stat_total if stat_values and all(v is not None for v in stat_values) else None,
            "回顾": to_int(first_value(printouts.get("回顾", []))),
            "星光值": to_int(first_value(printouts.get("星光", []))),
            "是否有异色": first_value(printouts.get("是否有异色", [])),
            "初阶名称": first_value(printouts.get("精灵初阶名称", [])),
            "地区形态": first_value(printouts.get("地区形态名称", [])),
            "进化条件": first_value(printouts.get("进化条件", [])),
            "体型": first_value(printouts.get("体型", [])),
            "重量": first_value(printouts.get("重量", [])),
            "分布地区": first_value(printouts.get("分布地区", [])),
            "更新版本": first_value(printouts.get("更新版本", [])),
            "页面链接": item.get("fullurl", ""),
        }
        spirit_rows.append(spirit_row)

        for spirit_type in printouts.get("精灵类型", []):
            type_name = str(spirit_type).strip()
            if type_name:
                spirit_type_rows.append({"页面标题": page_title.strip(), "精灵类型": type_name})

        default_skills = first_value(printouts.get("技能", []))
        default_levels = first_value(printouts.get("技能解锁等级", []))
        for skill_item in parse_skill_pairs(default_skills, default_levels, "默认"):
            spirit_skill_rows.append(
                {
                    "页面标题": page_title.strip(),
                    "技能名": skill_item["技能名"],
                    "技能来源": skill_item["技能来源"],
                    "解锁等级": to_int(skill_item["解锁等级"]),
                }
            )

        bloodline_skills = first_value(printouts.get("血脉技能", []))
        for skill_name in [part.strip() for part in bloodline_skills.split(",") if part.strip()]:
            spirit_skill_rows.append(
                {
                    "页面标题": page_title.strip(),
                    "技能名": skill_name,
                    "技能来源": "血脉",
                    "解锁等级": None,
                }
            )

        stone_skills = first_value(printouts.get("可学技能石", []))
        for skill_name in [part.strip() for part in stone_skills.split(",") if part.strip()]:
            spirit_skill_rows.append(
                {
                    "页面标题": page_title.strip(),
                    "技能名": skill_name,
                    "技能来源": "技能石",
                    "解锁等级": None,
                }
            )

    spirit_rows.sort(key=spirit_sort_key)
    spirit_skill_rows.sort(
        key=lambda row: (
            spirit_sort_key({"编号": "", "名称": row["页面标题"]}),
            row["技能来源"],
            row["技能名"],
        )
    )
    spirit_type_rows.sort(key=lambda row: (row["页面标题"], row["精灵类型"]))
    return spirit_rows, spirit_skill_rows, spirit_type_rows


def build_skill_catalog_rows(skills: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for page_title, item in skills.items():
        printouts = item.get("printouts", {})
        name = first_value(printouts.get("技能名称", [])) or page_title.strip()
        power_text = first_value(printouts.get("威力", []))
        rows.append(
            {
                "技能名称": name,
                "页面标题": page_title.strip(),
                "描述": strip_wiki_text(first_value(printouts.get("描述", []))),
                "效果": strip_wiki_text(first_value(printouts.get("效果", []))),
                "耗能": to_int(first_value(printouts.get("耗能", []))),
                "属性": first_value(printouts.get("属性", [])),
                "威力": power_text if power_text not in {"", "-"} else None,
                "技能类别": first_value(printouts.get("技能类别", [])),
                "技能版本": first_value(printouts.get("技能版本", [])),
                "页面链接": item.get("fullurl", ""),
            }
        )
    rows.sort(key=lambda row: row["技能名称"])
    return rows


def sort_egg_rows(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    group_order = {
        "无法孵蛋": 0,
        "动物组": 1,
        "拟人组": 2,
        "巨灵组": 3,
        "魔力组": 4,
        "天空组": 5,
        "两栖组": 6,
        "植物组": 7,
        "大地组": 8,
        "妖精组": 9,
        "昆虫组": 10,
        "软体组": 11,
        "机械组": 12,
        "海洋组": 13,
        "龙组": 14,
    }

    def sort_key(row: dict[str, str]) -> tuple[int, int, str]:
        group_rank = group_order.get(row["蛋组"], 99)
        number_digits = re.sub(r"\D", "", row.get("编号", ""))
        number_rank = int(number_digits) if number_digits else 999999
        return (group_rank, number_rank, row.get("精灵名称", ""))

    return sorted(rows, key=sort_key)


def normalize_stage_text(value: Any) -> str:
    if value is None:
        return ""
    text = re.sub(r"\s+", "", str(value).strip())
    if not text or text.lower() == "nan":
        return ""
    return STAGE_ALIASES.get(text, text)


def is_variant_final_serial(serial: int, all_serials: set[int]) -> bool:
    return serial % 10 == 1 and (serial // 10) in all_serials


def apply_spirit_stage_rules(spirit_rows: list[dict[str, Any]]) -> None:
    """统一阶段：三阶/最终形态→最终阶段；变体序号 base*10+1→最终阶段。"""
    serial_set: set[int] = set()
    for row in spirit_rows:
        serial = to_int(row.get("序号"))
        if serial is not None:
            serial_set.add(serial)

    for row in spirit_rows:
        stage = normalize_stage_text(row.get("精灵阶段"))
        serial = to_int(row.get("序号"))
        if serial is not None and is_variant_final_serial(serial, serial_set):
            row["精灵阶段"] = "最终阶段"
        else:
            row["精灵阶段"] = stage


def assign_spirit_ids(spirit_rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, int], dict[str, int]]:
    title_to_id: dict[str, int] = {}
    alias_to_id: dict[str, int] = {}
    numbered_rows: list[dict[str, Any]] = []

    for index, row in enumerate(spirit_rows, start=1):
        item = {"id": index, **row}
        numbered_rows.append(item)
        title_to_id[row["页面标题"]] = index
        aliases = [row["名称"], row["页面标题"]]
        if row["地区形态"] and row["名称"]:
            aliases.append(f"{row['名称']}（{row['地区形态']}）")
        for alias in aliases:
            alias = alias.strip()
            if alias:
                alias_to_id[alias] = index
    return numbered_rows, title_to_id, alias_to_id


def assign_skill_ids(skill_rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    title_to_id: dict[str, int] = {}
    name_to_id: dict[str, int] = {}
    numbered_rows: list[dict[str, Any]] = []

    for index, row in enumerate(skill_rows, start=1):
        item = {"id": index, **row}
        numbered_rows.append(item)
        title_to_id[row["页面标题"]] = index
        name_to_id[row["技能名称"]] = index
    return numbered_rows, name_to_id


def build_spirit_skill_relations(
    spirit_skill_rows: list[dict[str, Any]],
    title_to_id: dict[str, int],
    skill_name_to_id: dict[str, int],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, row in enumerate(spirit_skill_rows, start=1):
        spirit_id = title_to_id.get(row["页面标题"])
        skill_id = skill_name_to_id.get(row["技能名"])
        rows.append(
            {
                "id": index,
                "spirit_id": spirit_id,
                "skill_id": skill_id,
                "技能名": row["技能名"],
                "技能来源": row["技能来源"],
                "解锁等级": row["解锁等级"],
            }
        )
    return rows


def build_spirit_type_relations(
    spirit_type_rows: list[dict[str, Any]],
    title_to_id: dict[str, int],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, row in enumerate(spirit_type_rows, start=1):
        rows.append(
            {
                "id": index,
                "spirit_id": title_to_id.get(row["页面标题"]),
                "精灵类型": row["精灵类型"],
            }
        )
    return rows


def build_spirit_egg_group_relations(
    egg_rows: list[dict[str, str]],
    alias_to_id: dict[str, int],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, row in enumerate(egg_rows, start=1):
        rows.append(
            {
                "id": index,
                "spirit_id": alias_to_id.get(row["精灵名称"]),
                "蛋组": row["蛋组"],
                "编号": row["编号"],
                "精灵名称": row["精灵名称"],
            }
        )
    return rows


ID_COLUMNS = ("id", "spirit_id", "skill_id")
INT_COLUMNS = set(INT_FIELDS_SPIRIT + INT_FIELDS_SKILL + ("解锁等级",))


def format_csv_value(column: str, value: Any) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    if column in ID_COLUMNS or column in INT_COLUMNS:
        if value == "":
            return ""
        return str(int(float(value)))
    text = str(value).strip()
    if text.endswith(".0") and text[:-2].isdigit():
        return text[:-2]
    return text


def export_csv_tables(tables: dict[str, list[dict[str, Any]]], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for filename, rows in tables.items():
        df = pd.DataFrame(rows)
        for column in df.columns:
            df[column] = df[column].apply(lambda value, col=column: format_csv_value(col, value))
        df.to_csv(
            output_dir / filename,
            index=False,
            encoding="utf-8-sig",
            lineterminator="\n",
        )


def run(output_dir: Path, download_images: bool = True) -> dict[str, int]:
    session = create_session()

    print("正在获取蛋组数据...")
    egg_rows = sort_egg_rows(fetch_egg_group_rows(session))
    print(f"蛋组条目: {len(egg_rows)}")

    print("正在获取属性克制数据...")
    type_effect_chart = fetch_type_effect_chart(session)
    type_effect_rows = build_type_effect_rows(type_effect_chart)
    type_matchup_rows = build_type_matchup_rows(type_effect_chart)
    print(f"克制条目: {len(type_effect_rows)}，非等倍对战: {len(type_matchup_rows)}")

    print("正在获取精灵数据...")
    spirits = fetch_all_spirits(session)
    print(f"精灵总数: {len(spirits)}")

    print("正在获取技能图鉴...")
    skills = fetch_all_skills(session)
    print(f"技能总数: {len(skills)}")

    spirit_rows, spirit_skill_rows, spirit_type_rows = build_spirit_rows(spirits)
    skill_catalog_rows = build_skill_catalog_rows(skills)

    spirits_with_id, _, alias_to_id = assign_spirit_ids(spirit_rows)
    apply_spirit_stage_rules(spirits_with_id)
    skills_with_id, skill_name_to_id = assign_skill_ids(skill_catalog_rows)

    print("正在获取精灵立绘链接...")
    image_links = resolve_spirit_image_urls(session, spirits_with_id)
    print(f"立绘链接: {image_links}/{len(spirits_with_id)}")

    images_downloaded = 0
    if download_images:
        print("正在下载精灵立绘...")
        images_downloaded = download_spirit_images(session, spirits_with_id, output_dir)
        print(f"立绘文件: {images_downloaded}")
    else:
        for row in spirits_with_id:
            row["立绘路径"] = ""

    print("正在获取属性/资质图标...")
    icon_rows = fetch_game_icons(session, download_files=download_images, output_dir=output_dir)
    icons_downloaded = sum(1 for row in icon_rows if row.get("图标路径"))
    print(f"游戏图标: {icons_downloaded}/{len(icon_rows)}")

    spirit_skills = build_spirit_skill_relations(
        spirit_skill_rows,
        {row["页面标题"]: row["id"] for row in spirits_with_id},
        skill_name_to_id,
    )
    spirit_types = build_spirit_type_relations(
        spirit_type_rows,
        {row["页面标题"]: row["id"] for row in spirits_with_id},
    )
    spirit_egg_groups = build_spirit_egg_group_relations(egg_rows, alias_to_id)

    export_csv_tables(
        {
            "spirits.csv": spirits_with_id,
            "skills.csv": skills_with_id,
            "spirit_skills.csv": spirit_skills,
            "spirit_types.csv": spirit_types,
            "spirit_egg_groups.csv": spirit_egg_groups,
            "icons.csv": icon_rows,
            "type_effect_chart.csv": type_effect_rows,
            "type_matchups.csv": type_matchup_rows,
        },
        output_dir,
    )

    return {
        "spirits": len(spirits_with_id),
        "skills": len(skills_with_id),
        "spirit_skills": len(spirit_skills),
        "spirit_types": len(spirit_types),
        "spirit_egg_groups": len(spirit_egg_groups),
        "type_effect_chart": len(type_effect_rows),
        "type_matchups": len(type_matchup_rows),
        "image_links": image_links,
        "images_downloaded": images_downloaded,
        "icons": icons_downloaded,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="爬取洛克王国世界 BWIKI 精灵数据并导出 CSV")
    parser.add_argument(
        "-o",
        "--output",
        default="output/csv",
        help="CSV 输出目录",
    )
    parser.add_argument(
        "--skip-images",
        action="store_true",
        help="仅保存图片链接，不下载立绘和图标文件",
    )
    args = parser.parse_args()

    output_dir = Path(args.output)
    counts = run(output_dir, download_images=not args.skip_images)
    print(f"导出完成: {output_dir.resolve()}")
    print(
        "spirits {spirits}，skills {skills}，spirit_skills {spirit_skills}，"
        "spirit_types {spirit_types}，spirit_egg_groups {spirit_egg_groups}，"
        "type_effect_chart {type_effect_chart}，type_matchups {type_matchups}，"
        "image_links {image_links}，images_downloaded {images_downloaded}，"
        "icons {icons}".format(**counts)
    )


if __name__ == "__main__":
    main()
