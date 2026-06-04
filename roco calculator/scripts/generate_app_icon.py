"""从迪莫立绘生成 Tauri / Windows 应用图标（含多尺寸 ICO）。"""

from __future__ import annotations

import json
import shutil
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPIRITS_JSON = ROOT / "public" / "data" / "spirits.json"
ICON_DIR = ROOT / "src-tauri" / "icons"
OUT_SOURCE = ROOT / "src-tauri" / "app-icon.png"
PUBLIC_FAVICON = ROOT / "public" / "favicon.png"
DIMO_URL_FALLBACK = (
    "https://patchwiki.biligame.com/images/rocom/2/25/"
    "o64cvcxq1l6tlur77xjqbwx2s4imabd.png"
)
MASTER_SIZE = 1024
ICO_SIZES = (16, 24, 32, 48, 64, 128, 256)
PADDING_RATIO = 0.08


def dimo_portrait_url() -> str:
    if SPIRITS_JSON.exists():
        spirits = json.loads(SPIRITS_JSON.read_text(encoding="utf-8"))
        for spirit in spirits:
            if spirit.get("名称") == "迪莫" and spirit.get("立绘链接"):
                return spirit["立绘链接"]
    return DIMO_URL_FALLBACK


def download_image(url: str) -> Image.Image:
    with urllib.request.urlopen(url, timeout=60) as resp:
        data = resp.read()
    return Image.open(BytesIO(data)).convert("RGBA")


def to_square_icon(img: Image.Image, size: int) -> Image.Image:
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    w, h = img.size
    side = max(w, h)
    pad = int(side * PADDING_RATIO)
    canvas_side = side + pad * 2

    canvas = Image.new("RGBA", (canvas_side, canvas_side), (0, 0, 0, 0))
    offset = ((canvas_side - w) // 2, (canvas_side - h) // 2)
    canvas.paste(img, offset, img)

    resample = Image.Resampling.LANCZOS if hasattr(Image, "Resampling") else Image.LANCZOS
    return canvas.resize((size, size), resample)


def write_icon_assets(master: Image.Image) -> None:
    resample = Image.Resampling.LANCZOS if hasattr(Image, "Resampling") else Image.LANCZOS
    ICON_DIR.mkdir(parents=True, exist_ok=True)

    # sizes= 让 PIL 写入多分辨率 ICO（资源管理器小图标依赖 16/32）
    master.save(
        ICON_DIR / "icon.ico",
        format="ICO",
        sizes=[(size, size) for size in ICO_SIZES],
    )

    master.resize((32, 32), resample).save(ICON_DIR / "32x32.png")
    master.resize((128, 128), resample).save(ICON_DIR / "128x128.png")
    master.resize((256, 256), resample).save(ICON_DIR / "128x128@2x.png")
    master.resize((512, 512), resample).save(ICON_DIR / "icon.png")
    shutil.copy2(ICON_DIR / "32x32.png", PUBLIC_FAVICON)


def main() -> None:
    url = dimo_portrait_url()
    print(f"Downloading 迪莫 portrait: {url}")
    img = download_image(url)
    master = to_square_icon(img, MASTER_SIZE)

    OUT_SOURCE.parent.mkdir(parents=True, exist_ok=True)
    master.save(OUT_SOURCE, format="PNG")
    write_icon_assets(master)

    ico = Image.open(ICON_DIR / "icon.ico")
    frame_count = getattr(ico, "n_frames", 1)
    print(f"Saved {OUT_SOURCE}")
    print(f"Saved {ICON_DIR / 'icon.ico'} ({frame_count} sizes)")
    print(f"Saved {PUBLIC_FAVICON}")


if __name__ == "__main__":
    main()
