#!/usr/bin/env python3
"""Preview-only refined Option B variants. Does not touch the live site."""
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

OUT = Path("/workspace/stripe-nov11/maker-pro-graphics")
LOGO = "du-horizontal.png"

SHARED = """
@font-face {
  font-family: InterVar;
  src: url("file:///usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf") format("truetype");
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: OutfitVar;
  src: url("file:///usr/share/fonts/truetype/sand-box/google/Outfit/Outfit-VariableFont_wght.ttf") format("truetype");
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 1200px;
  height: 630px;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: InterVar, Inter, system-ui, sans-serif;
  color: #fff;
}
.logo { display: block; height: auto; }
"""

# Consistent filled icon set, same optical weight and 24 viewBox.
ICON_STAR = '''<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.15l2.86 5.95 6.54.9-4.76 4.55 1.2 6.5L12 16.92 6.16 20.05l1.2-6.5-4.76-4.55 6.54-.9L12 2.15z"/></svg>'''
ICON_X = '''<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.85 3.4h2.98L12.7 8.95 18.4 20.6h-3.24l-3.48-6.86-3.98 6.86H4.48l4.9-6.52L3.9 3.4h3.3l3.16 6.3 3.49-6.3zm-.7 15.3h1.5L9.18 5.22H7.58l5.57 13.48z"/></svg>'''
ICON_MEGA = '''<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.25 5.05c2.35-1.28 5.15-1.42 7.85.08v13.74c-2.7 1.5-5.5 1.18-7.85-.1V5.05z"/><path d="M12.35 6.2L6.55 9.85H4.4c-.77 0-1.4.63-1.4 1.4v2.5c0 .77.63 1.4 1.4 1.4h2.15l5.8 3.65V6.2z"/><path d="M7.15 15.2v2.05a3.05 3.05 0 0 0 2.55 3.01l.15-1.54A1.55 1.55 0 0 1 8.6 17.2V15.2H7.15z"/></svg>'''

LAYOUT_CSS = """
body { display: flex; align-items: center; justify-content: center; }
.card {
  width: 1200px;
  height: 630px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 36px 56px 32px;
}
.glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.card > .stack { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; width: 100%; }
.logo { width: 400px; margin: 0 auto 18px; filter: drop-shadow(0 8px 18px rgba(0,0,0,0.35)); }
.title {
  font-family: OutfitVar, Outfit, InterVar, sans-serif;
  font-weight: 800;
  font-size: 132px;
  line-height: 0.88;
  letter-spacing: -0.055em;
  color: #fff;
}
.tag {
  margin-top: 14px;
  font-size: 30px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.price-block { margin-top: 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.big-price {
  font-family: OutfitVar, Outfit, InterVar, sans-serif;
  font-weight: 800;
  font-size: 68px;
  letter-spacing: -0.045em;
  color: #fff;
  line-height: 1;
}
.save {
  display: inline-flex;
  align-items: center;
  font-weight: 700;
  font-size: 20px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 7px 14px;
  border-radius: 999px;
  line-height: 1;
}
.features {
  display: flex;
  justify-content: center;
  gap: 22px;
  margin-top: 30px;
  width: 100%;
  max-width: 1000px;
}
.feat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.ico {
  width: 72px;
  height: 72px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ico svg { width: 32px; height: 32px; display: block; }
.feat span {
  font-size: 28px;
  font-weight: 650;
  letter-spacing: -0.03em;
  line-height: 1.15;
  white-space: nowrap;
  color: #f3f4f8;
}
"""

css_b2 = LAYOUT_CSS + """
body { background: #080810; }
.card {
  background: #080810;
}
.glow {
  background:
    radial-gradient(920px 520px at 50% 118%, rgba(104, 72, 230, 0.48), transparent 58%),
    radial-gradient(640px 380px at 50% -8%, rgba(78, 96, 220, 0.22), transparent 56%),
    radial-gradient(420px 260px at 50% 38%, rgba(120, 110, 255, 0.14), transparent 70%);
}
.title { text-shadow: 0 0 90px rgba(130, 120, 255, 0.28), 0 2px 0 rgba(0,0,0,0.15); }
.tag { color: #c5c9d4; }
.ico.star { background: linear-gradient(180deg, #6a93ff 0%, #3f72f2 100%); color: #fff; box-shadow: 0 10px 24px rgba(63, 114, 242, 0.38), inset 0 1px 0 rgba(255,255,255,0.28); }
.ico.x    { background: linear-gradient(180deg, #7a73f6 0%, #564fe0 100%); color: #fff; box-shadow: 0 10px 24px rgba(86, 79, 224, 0.40), inset 0 1px 0 rgba(255,255,255,0.28); }
.ico.mega { background: linear-gradient(180deg, #f08b4d 0%, #d96a2e 100%); color: #fff; box-shadow: 0 10px 24px rgba(217, 106, 46, 0.38), inset 0 1px 0 rgba(255,255,255,0.28); }
.save {
  color: #ece8ff;
  background: rgba(110, 96, 230, 0.28);
  border: 1px solid rgba(170, 160, 255, 0.38);
  box-shadow: 0 0 20px rgba(110, 96, 230, 0.18);
}
"""

css_b3 = LAYOUT_CSS + """
body { background: #120e18; }
.card {
  background: #120e18;
}
.glow {
  background:
    radial-gradient(980px 560px at 50% 120%, rgba(196, 82, 150, 0.36), transparent 58%),
    radial-gradient(720px 420px at 50% -12%, rgba(255, 176, 110, 0.16), transparent 55%),
    radial-gradient(520px 300px at 50% 36%, rgba(168, 96, 255, 0.20), transparent 68%);
}
.title { text-shadow: 0 0 100px rgba(255, 150, 130, 0.20), 0 0 70px rgba(180, 100, 255, 0.28), 0 2px 0 rgba(0,0,0,0.12); }
.tag { color: #d5cfd8; }
.ico.star { background: linear-gradient(180deg, #7aa0ff 0%, #4d7cff 100%); color: #fff; box-shadow: 0 10px 26px rgba(77, 124, 255, 0.42), inset 0 1px 0 rgba(255,255,255,0.32); }
.ico.x    { background: linear-gradient(180deg, #a07cff 0%, #7a52ef 100%); color: #fff; box-shadow: 0 10px 26px rgba(122, 82, 239, 0.42), inset 0 1px 0 rgba(255,255,255,0.32); }
.ico.mega { background: linear-gradient(180deg, #ff9a4d 0%, #f07028 100%); color: #fff; box-shadow: 0 10px 26px rgba(240, 112, 40, 0.42), inset 0 1px 0 rgba(255,255,255,0.32); }
.save {
  color: #fff6ea;
  background: rgba(214, 112, 64, 0.32);
  border: 1px solid rgba(255, 190, 130, 0.42);
  box-shadow: 0 0 20px rgba(214, 112, 64, 0.18);
}
"""

BODY = f"""
<div class="card">
  <div class="glow"></div>
  <div class="stack">
    <img class="logo" src="{LOGO}" alt="Digital Underground">
    <div class="title">MAKER PRO</div>
    <div class="tag">Get seen. Get promoted.</div>
    <div class="price-block">
      <div class="big-price">$9/mo · $79/yr</div>
      <div class="save">Save 27%</div>
    </div>
    <div class="features">
      <div class="feat"><div class="ico star">{ICON_STAR}</div><span>Featured slots</span></div>
      <div class="feat"><div class="ico x">{ICON_X}</div><span>DU X channels</span></div>
      <div class="feat"><div class="ico mega">{ICON_MEGA}</div><span>Promotion from DU</span></div>
    </div>
  </div>
</div>
"""

def wrap(css, body):
    return f"""<!doctype html><html><head><meta charset="utf-8">
<style>{SHARED}\n{css}</style></head><body>{body}</body></html>"""

html_b2 = wrap(css_b2, BODY)
html_b3 = wrap(css_b3, BODY)

FORBIDDEN = (
    "intro", "intros", "introductions", "introduction",
    "connect", "connected", "connections", "connection",
    "draft", "toggle", "founding",
)

def check_copy(name, html):
    low = html.lower()
    hits = [w for w in FORBIDDEN if w in low]
    if hits:
        raise SystemExit(f"{name} HTML contains forbidden terms: {hits}")

for name, html in [("option-b2", html_b2), ("option-b3", html_b3)]:
    check_copy(name, html)
    (OUT / f"{name}.html").write_text(html, encoding="utf-8")
    print("wrote", name, "html")

def render():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="/usr/bin/google-chrome",
            args=["--no-sandbox", "--disable-gpu", "--allow-file-access-from-files"],
        )
        page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=2)
        for name in ("option-b2", "option-b3"):
            page.goto((OUT / f"{name}.html").as_uri(), wait_until="networkidle")
            page.wait_for_timeout(250)
            raw = OUT / f"{name}@2x.png"
            page.screenshot(path=str(raw), type="png", omit_background=False)
            im = Image.open(raw).convert("RGB")
            print(name, "raw", im.size)
            out = im.resize((1200, 630), Image.Resampling.LANCZOS)
            dest = OUT / f"{name}.png"
            out.save(dest, "PNG", optimize=True)
            print("saved", dest, dest.stat().st_size)
            raw.unlink()
        browser.close()

if __name__ == "__main__":
    render()
