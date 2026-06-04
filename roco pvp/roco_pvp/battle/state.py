from __future__ import annotations

from enum import Enum, auto


class BattlePhase(Enum):
    IDLE = auto()
    IN_BATTLE = auto()
    MY_TURN = auto()
    UNKNOWN = auto()
