#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path("/opt/cursor/artifacts")
promo = OUT / "promo-backdrop-reference-412.png"
tabs = ["plan", "recipes", "list"]
themes = ["light", "dark"]
tile_w, tile_h = 412, 915
pad = 8
label_h = 28
header_h = 40
cols = [("Promo", promo), ("Before", None), ("After", None)]
rows = [(f"{tab} · {theme}", tab, theme) for theme in themes for tab in tabs]
width = pad * 2 + len(cols) * (tile_w + pad)
height = pad + header_h + len(rows) * (label_h + tile_h + pad)
canvas = Image.new("RGB", (width, height), "white")
draw = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    font_b = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)
except OSError:
    font = font_b = ImageFont.load_default()

x0 = pad
for i, (title, _) in enumerate(cols):
    x = x0 + i * (tile_w + pad)
    draw.text((x + 4, pad + 10), title, fill="#333333", font=font_b)

y = pad + header_h
for row_title, tab, theme in rows:
    draw.text((pad, y + 4), row_title, fill="#111111", font=font)
    y += label_h
    for ci, (col_name, col_path) in enumerate(cols):
        x = pad + ci * (tile_w + pad)
        if col_name == "Promo":
            path = promo
        else:
            label = col_name.lower()
            path = OUT / f"backdrop-{label}-{tab}-{theme}-412.png"
        im = Image.open(path).convert("RGB")
        if im.size != (tile_w, tile_h):
            im = im.resize((tile_w, tile_h), Image.Resampling.LANCZOS)
        canvas.paste(im, (x, y))
    y += tile_h + pad

out = OUT / "backdrop-comparison-412.png"
canvas.save(out, optimize=True)
print("wrote", out)
