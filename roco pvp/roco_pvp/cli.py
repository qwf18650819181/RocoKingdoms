from __future__ import annotations

import argparse
import signal
import sys
import threading

from roco_pvp.battle.decision import decide_skill
from roco_pvp.battle.engine import PvpBattleEngine
from roco_pvp.capture.window import find_window_by_keyword, list_windows_by_keyword
from roco_pvp.config import load_config
from roco_pvp.game_data import load_game_data
from roco_pvp.input.driver import create_driver
from roco_pvp.team import load_team
from roco_pvp.vision.template_matcher import TemplateMatcher
from roco_pvp.vision.yolo_detector import YoloDetector


def _build_engine(dry_run: bool) -> PvpBattleEngine:
    config = load_config()
    if dry_run:
        config.input_driver = "dry_run"

    data_dir = config.data_dir
    if not data_dir.exists():
        print(f"[错误] 数据目录不存在: {data_dir}")
        print("请先运行: python scripts/sync_calculator_data.py")
        sys.exit(1)

    game = load_game_data(data_dir)
    team = load_team(config.team_path)
    matcher = TemplateMatcher(config.templates_path, config.match_threshold)

    yolo = None
    if config.yolo.enabled:
        yolo = YoloDetector(
            config.yolo_model_path,
            conf=config.yolo.conf,
            iou=config.yolo.iou,
        )
        if not yolo.ready:
            print(f"[警告] YOLO 模型未找到: {config.yolo_model_path}")
            print("可先运行 yolo/export_dataset.py 与 yolo/train.py，或关闭 config 中 yolo.enabled")

    driver = create_driver(config.input_driver)
    return PvpBattleEngine(config, game, team, matcher, yolo, driver)


def cmd_list_windows(args: argparse.Namespace) -> None:
    config = load_config()
    rows = list_windows_by_keyword(config.window_title_keyword)
    if not rows:
        print("未找到匹配窗口")
        return
    for hwnd, title, rect in rows:
        print(f"hwnd={hwnd}  title={title}  rect={rect}")


def cmd_run(args: argparse.Namespace) -> None:
    config = load_config()
    engine = _build_engine(dry_run=args.dry_run)

    hwnd = args.hwnd
    if hwnd is None:
        hwnd = find_window_by_keyword(config.window_title_keyword)
    if not hwnd:
        print(f"未找到标题含「{config.window_title_keyword}」的窗口")
        sys.exit(1)

    stop = threading.Event()

    def _handle_sigint(_sig: int, _frame: object) -> None:
        stop.set()

    signal.signal(signal.SIGINT, _handle_sigint)

    engine.run_loop(hwnd, stop.is_set)


def cmd_test_decision(args: argparse.Namespace) -> None:
    config = load_config()
    engine = _build_engine(dry_run=True)
    slot = engine.team.slots[args.slot]
    spirit = (
        engine.game.spirits_by_id.get(slot.spirit_id) if slot.spirit_id else None
    )
    print(f"槽位 {args.slot + 1}: {spirit.name if spirit else '空'}")
    print(f"技能: {slot.skills}")
    result = decide_skill(
        slot,
        engine.game,
        None,
        fallback_enemy_attr=(args.enemy_attr, args.enemy_attr2),
    )
    print(result)


def main() -> None:
    parser = argparse.ArgumentParser(prog="roco-pvp", description="洛克 PVP 自动战斗")
    sub = parser.add_subparsers(dest="command")

    p_run = sub.add_parser("run", help="启动战斗循环")
    p_run.add_argument("--hwnd", type=int, default=None, help="指定窗口句柄")
    p_run.add_argument(
        "--dry-run", action="store_true", help="不发送真实输入，仅打印决策"
    )
    p_run.set_defaults(func=cmd_run)

    p_list = sub.add_parser("windows", help="列出匹配的游戏窗口")
    p_list.set_defaults(func=cmd_list_windows)

    p_dec = sub.add_parser("test-decision", help="测试属性克制选招")
    p_dec.add_argument("--slot", type=int, default=0, help="队伍槽位 0~5")
    p_dec.add_argument("--enemy-attr", default="草")
    p_dec.add_argument("--enemy-attr2", default=None)
    p_dec.set_defaults(func=cmd_test_decision)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)
    args.func(args)


if __name__ == "__main__":
    main()
