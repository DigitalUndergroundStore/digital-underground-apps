#!/usr/bin/env python3
"""Generate /p/<slug>/ share pages, OG images, and index.json from store catalog."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
STORE = ROOT / "store"
OUT = ROOT / "p"
OG_DIR = OUT / "og"
BASE = "https://digitalundergroundstore.com"

PRODUCTS = [
    {"slug": "invoice-desk", "code": "nvmvyx", "name": "Invoice Desk", "price": "CA$19", "pitch": ["Offline invoices for freelancers."], "cover": "media/nvmvyx.jpg"},
    {"slug": "streak-kit", "code": "idasqr", "name": "Streak Kit", "price": "CA$9", "pitch": ["Daily streaks, kept on your phone.", "No account."], "cover": "media/idasqr.jpg"},
    {"slug": "scope-lock", "code": "omzql", "name": "Scope Lock", "price": "CA$12", "pitch": ["A client brief that holds the scope."], "cover": "media/omzql.jpg"},
    {"slug": "pantry-week", "code": "jhagho", "name": "Pantry Week 2.0", "price": "CA$24", "pitch": ["A week of meals, planned in one place."], "cover": "media/jhagho.jpg"},
    {"slug": "winston", "code": "jkpty", "name": "Winston — Hands-Free Kitchen Voice Assistant", "price": "CA$19", "pitch": ["A kitchen voice that reads the steps while your hands are busy."], "cover": "media/jkpty.jpg"},
    {"slug": "planetview", "code": "oxnfvy", "name": "PlanetView Live", "price": "CA$24", "pitch": ["Photoreal Earth and a solar system you can fly, in the browser."], "cover": "covers/oxnfvy.webp"},
    {"slug": "session-forge", "code": "wcvgxo", "name": "Session Forge", "price": "CA$14.99+", "pitch": ["An offline toolkit for running game sessions."], "cover": "covers/wcvgxo.webp"},
    {"slug": "grokmate", "code": "ozzrh", "name": "GrokMate", "price": "CA$39", "pitch": ["A voice assistant for questions while you work."], "cover": "covers/ozzrh.webp"},
    {"slug": "reply-forge", "code": "nlwvb", "name": "Reply Forge", "price": "CA$9", "pitch": ["Customer replies you can send offline."], "cover": "covers/nlwvb.webp"},
    {"slug": "chatgpt-prompt-pack", "code": "lqynfs", "name": "ChatGPT Prompt Pack", "price": "CA$9", "pitch": ["30 prompts to create and sell digital products."], "cover": "covers/lqynfs.webp"},
    {"slug": "rate-wire", "code": "ppnorh", "name": "Rate Wire", "price": "CA$9", "pitch": ["Hourly and day rates, figured before you quote."], "cover": "covers/ppnorh.webp"},
    {"slug": "offer-desk", "code": "bhrrtz", "name": "Offer Desk", "price": "CA$19", "pitch": ["A one-page offer you can send to a client."], "cover": "covers/bhrrtz.webp"},
    {"slug": "launch-ledger", "code": "iacbv", "name": "Launch Ledger", "price": "CA$29", "pitch": ["Income, kept in one ledger."], "cover": "covers/iacbv.webp"},
    {"slug": "focus-gate", "code": "tckoc", "name": "Focus Gate", "price": "CA$7", "pitch": ["A deep-work timer for one session at a time."], "cover": "covers/tckoc.webp"},
    {"slug": "bored-blocks", "code": "bxacp", "name": "Bored Blocks", "price": "CA$9", "pitch": ["An offline block puzzle."], "cover": "covers/bxacp.webp"},
    {"slug": "box-and-go", "code": "hfyam", "name": "Box & Go", "price": "CA$12", "pitch": ["A moving planner for the boxes and the list."], "cover": "covers/hfyam.webp"},
    {"slug": "packlane", "code": "lchlou", "name": "Packlane", "price": "CA$7", "pitch": ["Packing lists for the trip you are taking."], "cover": "covers/lchlou.webp"},
    {"slug": "grok-prompt-pack", "code": "jsdrug", "name": "Grok Prompt Pack", "price": "CA$29", "pitch": ["Prompts for writing, planning, and shipping work."], "cover": "covers/jsdrug.webp"},
    {"slug": "ai-audience-growth-toolkit", "code": "pgkgdc", "name": "AI Audience Growth Toolkit", "price": "CA$29", "pitch": ["A playbook, a workbook, and a prompt pack."], "cover": "covers/pgkgdc.webp"},
    {"slug": "airhand", "code": "fifcuh", "name": "Airhand (Early Access)", "price": "CA$15", "pitch": ["Live radio, your music, and a timer, controlled from the camera."], "cover": "covers/fifcuh.webp"},
    {"slug": "cork", "code": "fjmmi", "name": "Cork — Offline Darts Scoreboard", "price": "CA$25", "pitch": ["Score for two sides.", "Pay once. No subscription."], "cover": "covers/fjmmi.webp"},
    {"slug": "focus-habits-pack", "code": "wgjffu", "name": "Focus & Habits Pack", "price": "CA$19", "pitch": ["Habit tracker, focus gate, and an offline block puzzle.", "Three products, one price."], "cover": "covers/wgjffu.webp"},
    {"slug": "ai-creator-bundle", "code": "lgvubv", "name": "AI Creator Bundle", "price": "CA$79", "pitch": ["Prompt packs, a companion, and an audience growth toolkit."], "cover": "covers/lgvubv.webp"},
    {"slug": "complete-freelance-suite", "code": "vvtib", "name": "Complete Freelance Suite", "price": "CA$79", "pitch": ["Proposals, pricing, scope, invoicing, and client tools in one package."], "cover": "covers/vvtib.webp"},
    {"slug": "freelance-admin-stack", "code": "lggigy", "name": "Freelance Admin Stack", "price": "CA$35", "pitch": ["Invoicing, replies, scope protection, and rate confidence."], "cover": "covers/lggigy.webp"},
    {"slug": "null-harbor", "code": "jcazp", "name": "Null Harbor", "price": "CA$4.99", "pitch": ["A near-future thriller."], "cover": "covers/jcazp.webp"},
    {"slug": "he-came-home-without-her", "code": "ygwhif", "name": "He Came Home Without Her", "price": "CA$4.99", "pitch": ["A domestic thriller."], "cover": "covers/ygwhif.webp"},
    {"slug": "humanity-x-into-the-stars", "code": "sgrnpe", "name": "Humanity X: Into The Stars", "price": "CA$9.99", "pitch": ["A science-fiction story."], "cover": "covers/sgrnpe.webp"},
    {"slug": "humanity-x-off-the-ground", "code": "umndpu", "name": "Humanity X: Off the Ground", "price": "CA$9.99", "pitch": ["A science-fiction story."], "cover": "covers/umndpu.webp"},
    {"slug": "brave-little-beaver", "code": "bukwxo", "name": "The Brave Little Beaver", "price": "Free", "pitch": ["A short story for children."], "cover": None},
    {"slug": "ethan-chose-kindness", "code": "efouck", "name": "The Day Ethan Chose Kindness", "price": "Free", "pitch": ["A short story for children."], "cover": None},
    {"slug": "tillys-big-cleanup", "code": "vlaqmh", "name": "Tilly's Big Cleanup", "price": "Free", "pitch": ["A short story for children."], "cover": None},
    {"slug": "a-new-friend-brighter-day", "code": "vzfysf", "name": "A New Friend – A Brighter Day", "price": "Free", "pitch": ["A short story for children."], "cover": None},
    {"slug": "due-desk", "code": "gfbgve", "name": "Due Desk", "price": "Free", "pitch": ["An assignment tracker for what is due."], "cover": "covers/gfbgve.webp"},
    {"slug": "exam-desk", "code": "zpqpto", "name": "Exam Desk", "price": "Free", "pitch": ["A toolkit for finals week."], "cover": "covers/zpqpto.webp"},
    {"slug": "hook-bank", "code": "vusus", "name": "Hook Bank", "price": "Free", "pitch": ["Hooks for posts, ready to adapt."], "cover": "covers/vusus.webp"},
    {"slug": "promo-lane", "code": "mlrnfq", "name": "Promo Lane", "price": "Free", "pitch": ["A promo kit for a launch."], "cover": "covers/mlrnfq.webp"},
]


def checkout_url(code: str) -> str:
    return f"https://kerzy.gumroad.com/l/{code}"


def load_cover_image(product: dict) -> Image.Image:
    rel = product.get("cover")
    if rel:
        path = STORE / rel
        if path.is_file():
            im = Image.open(path).convert("RGB")
            return im
    return None


def make_og_image(product: dict, dest: Path) -> None:
    w, h = 1200, 630
    canvas = Image.new("RGB", (w, h), (7, 6, 15))
    draw = ImageDraw.Draw(canvas)
    for y in range(h):
        t = y / h
        r = int(30 + 20 * (1 - t))
        g = int(12 + 8 * (1 - t))
        b = int(45 + 35 * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    cover = load_cover_image(product)
    if cover:
        cw, ch = cover.size
        scale = max(w / cw, h / ch)
        nw, nh = int(cw * scale), int(ch * scale)
        resized = cover.resize((nw, nh), Image.Resampling.LANCZOS)
        left = (nw - w) // 2
        top = (nh - h) // 2
        cropped = resized.crop((left, top, left + w, top + h))
        canvas = Image.blend(canvas, cropped, alpha=0.92)
        draw = ImageDraw.Draw(canvas)
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.rectangle((0, h - 220, w, h), fill=(7, 6, 15, 200))
        canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(canvas)

    title = product["name"]
    if len(title) > 48:
        title = title[:45] + "…"
    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 44)
        font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except OSError:
        font_title = ImageFont.load_default()
        font_sub = font_title

    draw.text((48, h - 160), "Digital Underground", fill=(191, 232, 255), font=font_sub)
    draw.text((48, h - 120), title, fill=(245, 243, 255), font=font_title)
    draw.text((48, h - 62), product["price"], fill=(196, 181, 253), font=font_sub)
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest, "JPEG", quality=88, optimize=True)


def cta_label(price: str) -> str:
    if price.strip().lower() == "free":
        return "Get it free"
    return f"Get for {price}"


def render_page(product: dict) -> str:
    slug = product["slug"]
    name = product["name"]
    price = product["price"]
    pitch_lines = product["pitch"]
    checkout = checkout_url(product["code"])
    page_url = f"{BASE}/p/{slug}/"
    og_image = f"{BASE}/p/og/{slug}.jpg"
    desc = " ".join(pitch_lines)
    if len(desc) > 200:
        desc = desc[:197] + "…"
    title = f"{name} — Digital Underground"
    pitch_html = "\n".join(f'      <p class="pitch-line">{html.escape(line)}</p>' for line in pitch_lines)
    esc = html.escape

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{page_url}">
<meta property="og:title" content="{esc(name)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="product">
<meta property="og:url" content="{page_url}">
<meta property="og:image" content="{og_image}">
<meta property="og:image:secure_url" content="{og_image}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(name)} — {esc(price)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(name)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{og_image}">
<meta name="theme-color" content="#07060f">
<link rel="stylesheet" href="/p/share.css">
</head>
<body>
<main class="page">
  <header class="top">
    <a class="brand" href="/store/">Digital Underground</a>
  </header>
  <article class="card">
    <div class="cover-wrap">
      <img class="cover" src="/p/og/{slug}.jpg" width="1200" height="630" alt="">
    </div>
    <div class="body">
      <p class="eyebrow">Digital product</p>
      <h1>{esc(name)}</h1>
      <p class="price">{esc(price)}</p>
      <div class="pitch">
{pitch_html}
      </div>
      <a class="cta" href="{esc(checkout)}" rel="noopener">{esc(cta_label(price))}</a>
      <p class="back"><a href="/store/">See all products</a></p>
    </div>
  </article>
</main>
</body>
</html>
"""


def main() -> None:
    OG_DIR.mkdir(parents=True, exist_ok=True)
    index: dict[str, dict] = {}
    for p in PRODUCTS:
        code = p["code"]
        slug = p["slug"]
        checkout = checkout_url(code)
        og_path = OG_DIR / f"{slug}.jpg"
        make_og_image(p, og_path)
        page_dir = OUT / slug
        page_dir.mkdir(parents=True, exist_ok=True)
        (page_dir / "index.html").write_text(render_page(p), encoding="utf-8")
        index[slug] = {
            "name": p["name"],
            "price": p["price"],
            "checkoutUrl": checkout,
            "gumroadCode": code,
            "shareUrl": f"{BASE}/p/{slug}/",
            "ogImage": f"{BASE}/p/og/{slug}.jpg",
        }
    (OUT / "index.json").write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(PRODUCTS)} share pages under {OUT}")


if __name__ == "__main__":
    main()
