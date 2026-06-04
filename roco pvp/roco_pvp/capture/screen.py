from __future__ import annotations

import ctypes

import cv2
import numpy as np
import win32con
import win32gui
import win32ui

_printwindow_failed_logged = False
_bitmap_size_mismatch_logged = False


def capture_window_bgr(hwnd: int) -> np.ndarray:
    """抓取窗口客户区 BGR 图像（参考 Auto-rocokingdom）。"""
    global _printwindow_failed_logged, _bitmap_size_mismatch_logged

    client_rect = win32gui.GetClientRect(hwnd)
    client_w = client_rect[2] - client_rect[0]
    client_h = client_rect[3] - client_rect[1]

    if client_w <= 0 or client_h <= 0:
        return np.zeros((1, 1, 3), dtype=np.uint8)

    hwnd_dc = win32gui.GetDC(hwnd)
    mfc_dc = win32ui.CreateDCFromHandle(hwnd_dc)
    save_dc = mfc_dc.CreateCompatibleDC()
    save_bitmap = win32ui.CreateBitmap()
    save_bitmap.CreateCompatibleBitmap(mfc_dc, client_w, client_h)
    save_dc.SelectObject(save_bitmap)

    try:
        result = ctypes.windll.user32.PrintWindow(hwnd, save_dc.GetSafeHdc(), 3)
        if result != 1:
            if not _printwindow_failed_logged:
                print("[诊断] PrintWindow 失败，回退 BitBlt")
                _printwindow_failed_logged = True
            save_dc.BitBlt((0, 0), (client_w, client_h), mfc_dc, (0, 0), win32con.SRCCOPY)

        signed = save_bitmap.GetBitmapBits(True)
        img = np.frombuffer(signed, dtype="uint8")
        expected = client_h * client_w * 4
        if len(img) != expected:
            img = np.zeros(expected, dtype="uint8")
        img.shape = (client_h, client_w, 4)
    finally:
        win32gui.DeleteObject(save_bitmap.GetHandle())
        save_dc.DeleteDC()
        mfc_dc.DeleteDC()
        win32gui.ReleaseDC(hwnd, hwnd_dc)

    return cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
