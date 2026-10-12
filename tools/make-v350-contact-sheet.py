#!/usr/bin/env python3
"""Contact sheet for v3.5.0 re-curated recipe photos."""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace/pw-v322/jhagho/photos")
MANIFEST = Path("/opt/cursor/artifacts/library-v350-manifest.json")
OUT = Path("/opt/cursor/artifacts/library-v350-photo-contact-sheet.jpg")

manifest = json.loads(MANIFEST.read_text())
added = manifest["added"]
cols = 6
thumb_w, thumb_h = 320, 200
label_h = 36
rows = (len(added) + cols - 1) // cols
sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + label_h)), (245, 245, 240))
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default()

for i, item in enumerate(added):
    col = i % cols
    row = i // cols
    x = col * thumb_w
    y = row * (thumb_h + label_h)
    path = ROOT / f"{item['id']}.webp"
    if path.exists():
        img = Image.open(path).convert("RGB")
        img.thumbnail((thumb_w - 8, thumb_h - 8), Image.Resampling.LANCZOS)
        ox = x + (thumb_w - img.width) // 2
        oy = y + 4
        sheet.paste(img, (ox, oy))
    label = f"{item['id']} {item['name'][:42]}"
    draw.text((x + 6, y + thumb_h + 4), label, fill=(20, 20, 20), font=font)

sheet.save(OUT, "JPEG", quality=90)
print("wrote", OUT)
