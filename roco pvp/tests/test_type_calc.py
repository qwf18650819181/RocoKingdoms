"""类型克制选招单元测试。"""

from roco_pvp.type_calc import pick_best_skill_index, type_multiplier


def test_type_multiplier_double_weak():
    matchups = {"火": {"草": 2.0, "水": 0.5}}
    assert type_multiplier("火", "草", "草", matchups) == 4.0


def test_pick_best_skill():
    matchups = {"火": {"草": 2.0}, "水": {"草": 0.5}}
    idx = pick_best_skill_index(
        ["水枪", "火花", None, None],
        ["水", "火", None, None],
        "草",
        None,
        matchups,
    )
    assert idx == 1
