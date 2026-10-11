#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parents[1]
SCRIPTS = ROOT / "scripts"
WEBP_WORK = ROOT / "work" / "photos" / "webp"
WEBP_HOSTED = ROOT / "jhagho" / "photos"
OUT = Path("/opt/cursor/artifacts/pantry-week-v330-contact-sheet.png")

COLS = 8
CELL = 220
LABEL_H = 44
PAD = 10

_spec = importlib.util.spec_from_file_location("lar", SCRIPTS / "load-all-recipes.py")
lar = importlib.util.module_from_spec(_spec)
assert _spec and _spec.loader
_spec.loader.exec_module(lar)


def photo_path(rid: str) -> Path | None:
    for base in (WEBP_HOSTED, WEBP_WORK):
        p = base / f"{rid}.webp"
        if p.is_file():
            return p
    return None


def main() -> None:
    recipes = lar.load_all_recipes()
    rows = (len(recipes) + COLS - 1) // COLS
    w = COLS * CELL + PAD * 2
    h = rows * (CELL + LABEL_H) + PAD * 2
    sheet = Image.new("RGB", (w, h), (24, 28, 32))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
    except OSError:
        font = ImageFont.load_default()
    missing = 0
    for i, row in enumerate(recipes):
        rid = row["id"]
        name = row["name"]
        c = i % COLS
        r = i // COLS
        x0 = PAD + c * CELL
        y0 = PAD + r * (CELL + LABEL_H)
        p = photo_path(rid)
        if p:
            im = Image.open(p).convert("RGB")
            im.thumbnail((CELL - 4, CELL - 4), Image.Resampling.LANCZOS)
            ox = x0 + (CELL - im.width) // 2
            oy = y0 + (CELL - im.height) // 2
            sheet.paste(im, (ox, oy))
        else:
            missing += 1
            draw.rectangle([x0 + 2, y0 + 2, x0 + CELL - 2, y0 + CELL - 2], outline=(200, 80, 80), width=2)
            draw.text((x0 + 8, y0 + 70), "MISSING", fill=(255, 120, 120), font=font)
        label = f"{rid} {name[:32]}"
        draw.text((x0 + 2, y0 + CELL + 2), label, fill=(230, 230, 230), font=font)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT, "PNG", optimize=True)
    print("wrote", OUT, sheet.size, "recipes", len(recipes), "missing", missing)


if __name__ == "__main__":
    main()
