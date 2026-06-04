from __future__ import annotations

import random
import time
import traceback
from abc import ABC, abstractmethod

import win32gui


class InputDriver(ABC):
    @abstractmethod
    def click_at(self, hwnd: int, x: int, y: int) -> bool:
        ...

    @abstractmethod
    def press_key(self, hwnd: int, key: str) -> None:
        ...


class DryRunDriver(InputDriver):
    def click_at(self, hwnd: int, x: int, y: int) -> bool:
        print(f"[dry_run] click hwnd={hwnd} client=({x},{y})")
        return True

    def press_key(self, hwnd: int, key: str) -> None:
        print(f"[dry_run] key '{key}' hwnd={hwnd}")


class InterceptionDriver(InputDriver):
    def __init__(self) -> None:
        self._ready = False
        self._failed_logged = False

    def _ensure(self) -> None:
        if self._ready:
            return
        import interception

        interception.auto_capture_devices()
        self._ready = True
        self._interception = interception

    def click_at(self, hwnd: int, x: int, y: int) -> bool:
        try:
            self._ensure()
            sx, sy = win32gui.ClientToScreen(hwnd, (x, y))
            self._interception.click(
                sx + random.randint(-2, 2),
                sy + random.randint(-2, 2),
                delay=random.uniform(0.05, 0.12),
            )
            return True
        except Exception as exc:
            if not self._failed_logged:
                print(f"[错误] Interception 点击失败: {exc}")
                print(traceback.format_exc())
                self._failed_logged = True
            return False

    def press_key(self, hwnd: int, key: str) -> None:
        if not key:
            return
        try:
            self._ensure()
            self._interception.key_down(key, delay=0)
            time.sleep(random.uniform(0.04, 0.10))
            self._interception.key_up(key, delay=0)
        except Exception as exc:
            if not self._failed_logged:
                print(f"[错误] Interception 按键失败: {exc}")
                self._failed_logged = True


def create_driver(name: str) -> InputDriver:
    if name == "dry_run":
        return DryRunDriver()
    return InterceptionDriver()
