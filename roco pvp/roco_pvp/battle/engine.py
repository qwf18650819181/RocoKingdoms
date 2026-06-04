from __future__ import annotations

import time
from dataclasses import dataclass

import numpy as np

from roco_pvp.battle.decision import decide_skill
from roco_pvp.battle.state import BattlePhase
from roco_pvp.capture.screen import capture_window_bgr
from roco_pvp.config import AppConfig
from roco_pvp.game_data import GameData
from roco_pvp.input.driver import InputDriver
from roco_pvp.team import PvpTeam, TeamSlot
from roco_pvp.vision.template_matcher import TemplateMatcher
from roco_pvp.vision.yolo_detector import YoloDetector


@dataclass
class EngineStatus:
    phase: BattlePhase
    message: str
    last_action: str | None = None


class PvpBattleEngine:
    def __init__(
        self,
        config: AppConfig,
        game: GameData,
        team: PvpTeam,
        matcher: TemplateMatcher,
        yolo: YoloDetector | None,
        driver: InputDriver,
    ) -> None:
        self.config = config
        self.game = game
        self.team = team
        self.matcher = matcher
        self.yolo = yolo
        self.driver = driver
        self.active_slot_index = 0
        self._last_turn_action_at = 0.0

    def _detect_phase(self, frame: np.ndarray) -> BattlePhase:
        tpl = self.config.battle_templates
        if tpl.get("my_turn") and self.matcher.match_best(frame, tpl["my_turn"]):
            return BattlePhase.MY_TURN
        if tpl.get("in_battle") and self.matcher.match_best(frame, tpl["in_battle"]):
            return BattlePhase.IN_BATTLE
        return BattlePhase.IDLE

    def _current_slot(self) -> TeamSlot:
        return self.team.slots[self.active_slot_index]

    def _skill_key(self, index: int) -> str | None:
        if index < 0 or index >= len(self.config.skill_keys):
            return None
        return self.config.skill_keys[index]

    def tick(self, hwnd: int) -> EngineStatus:
        frame = capture_window_bgr(hwnd)
        phase = self._detect_phase(frame)

        if phase != BattlePhase.MY_TURN:
            return EngineStatus(phase=phase, message="等待回合")

        now = time.time()
        if now - self._last_turn_action_at < 0.6:
            return EngineStatus(phase=phase, message="冷却中")

        enemy = self.yolo.best_enemy(frame) if self.yolo else None
        decision = decide_skill(self._current_slot(), self.game, enemy)
        if not decision:
            return EngineStatus(phase=phase, message="无可用技能决策")

        key = self._skill_key(decision.skill_index)
        if not key:
            return EngineStatus(phase=phase, message="技能快捷键未配置")

        self.driver.press_key(hwnd, key)
        self._last_turn_action_at = now
        action = f"按键[{key}] {decision.skill_name} ({decision.reason})"
        return EngineStatus(phase=phase, message="已出招", last_action=action)

    def run_loop(self, hwnd: int, stop_flag: callable) -> None:
        print("[引擎] PVP 战斗循环启动，Ctrl+C 停止")
        while not stop_flag():
            status = self.tick(hwnd)
            if status.last_action:
                print(f"[{status.phase.name}] {status.message} · {status.last_action}")
            else:
                print(f"[{status.phase.name}] {status.message}")
            time.sleep(self.config.poll_interval_sec)
