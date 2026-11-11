#!/usr/bin/env python3
"""Preview-only Maker Pro hero graphics. Does not touch the live site."""
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
  background: #0b0d14;
  color: #fff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: InterVar, Inter, system-ui, sans-serif;
}
.logo { display: block; height: auto; }
"""

ICON_STAR = '''<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.6l2.62 5.7 6.26.86-4.55 4.36 1.14 6.22L12 16.86 6.53 19.74l1.14-6.22L3.12 9.16l6.26-.86L12 2.6z"/></svg>'''
ICON_X = '''<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14.55 3.2h3.28l-5.67 6.48L18.9 20.8h-4.22l-3.7-7.28-4.22 7.28H2.5l6.08-6.95L2.35 3.2h4.3l3.36 6.68L14.55 3.2zm-1.15 15.9h1.82L8.55 4.95H6.6l6.8 14.15z"/></svg>'''
ICON_MEGAPHONE = '''<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M4.6 10.2v3.6c0 .5.4.9.9.9h1.7l4.4 3.5V6.8L7.2 10.2H5.5c-.5 0-.9.4-.9 1z"/><path d="M11.6 7.2c2.2-1.1 4.7-1.1 7.2.2v9.2c-2.5 1.3-5 .9-7.2-.2"/><path d="M7.4 15.8v1.6c0 1.4 1 2.6 2.4 2.8"/></svg>'''

def wrap(css, body):
    return f"""<!doctype html><html><head><meta charset="utf-8">
<style>{SHARED}\n{css}</style></head><body>{body}</body></html>"""

html_a = wrap("""
body {
  background:
    radial-gradient(900px 500px at 88% 70%, rgba(92, 64, 200, 0.38), transparent 60%),
    radial-gradient(700px 420px at 12% 20%, rgba(70, 90, 200, 0.22), transparent 55%),
    #0b0c16;
}
.frame {
  width: 1200px; height: 630px;
  padding: 36px 40px;
  display: flex;
  align-items: stretch;
}
.card {
  flex: 1;
  display: flex;
  gap: 36px;
  padding: 40px 44px;
  border-radius: 28px;
  background:
    radial-gradient(720px 480px at 100% 110%, rgba(108, 72, 220, 0.42), transparent 58%),
    radial-gradient(520px 340px at 0% 0%, rgba(50, 70, 180, 0.18), transparent 50%),
    linear-gradient(165deg, #141226 0%, #0c0b18 48%, #0a0916 100%);
  border: 1px solid rgba(180, 170, 255, 0.22);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
}
.left {
  flex: 1.05;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: 6px 0 2px;
}
.logo { width: 318px; }
.title {
  font-family: OutfitVar, Outfit, InterVar, sans-serif;
  font-weight: 800;
  font-size: 108px;
  line-height: 0.86;
  letter-spacing: -0.045em;
  color: #fff;
  margin-top: 22px;
}
.tag {
  margin-top: 18px;
  font-size: 28px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: #c5c8d2;
}
.pills { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 28px; }
.price {
  background: #fff;
  color: #0c0b14;
  font-weight: 700;
  font-size: 24px;
  letter-spacing: -0.02em;
  padding: 10px 18px;
  border-radius: 999px;
  line-height: 1;
}
.founding {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(20, 40, 50, 0.72);
  color: #7ef0dc;
  font-weight: 650;
  font-size: 22px;
  letter-spacing: -0.01em;
  padding: 10px 16px 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(94, 234, 212, 0.35);
  line-height: 1;
}
.founding svg { width: 16px; height: 16px; color: #7ef0dc; flex: 0 0 auto; }
.tiles {
  width: 470px;
  flex: 0 0 470px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
}
.tile {
  display: flex;
  align-items: center;
  gap: 18px;
  background: rgba(28, 27, 40, 0.82);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px;
  padding: 20px 22px;
  min-height: 88px;
}
.ico {
  width: 52px; height: 52px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  flex: 0 0 52px;
}
.ico svg { width: 26px; height: 26px; }
.ico.star { background: #4f7df5; color: #fff; }
.ico.x { background: #5b54e8; color: #fff; }
.ico.mega { background: #e07a3a; color: #fff; }
.tile span {
  font-size: 30px;
  font-weight: 650;
  letter-spacing: -0.03em;
  color: #f4f5f8;
  line-height: 1.15;
}
""", f"""
<div class="frame"><div class="card">
  <div class="left">
    <div>
      <img class="logo" src="{LOGO}" alt="Digital Underground">
      <div class="title">MAKER<br>PRO</div>
      <div class="tag">Get seen. Get promoted.</div>
    </div>
    <div class="pills">
      <div class="price">$9/mo · $79/yr</div>
      <div class="founding">{ICON_STAR}Founding 25: $59/yr</div>
    </div>
  </div>
  <div class="tiles">
    <div class="tile"><div class="ico star">{ICON_STAR}</div><span>Featured slots</span></div>
    <div class="tile"><div class="ico x">{ICON_X}</div><span>DU X channels</span></div>
    <div class="tile"><div class="ico mega">{ICON_MEGAPHONE}</div><span>Promotion from DU</span></div>
  </div>
</div></div>
""")

html_b = wrap("""
body {
  background:
    radial-gradient(900px 560px at 50% 120%, rgba(100, 70, 220, 0.45), transparent 58%),
    radial-gradient(700px 400px at 50% -10%, rgba(80, 100, 220, 0.22), transparent 55%),
    #090811;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card {
  width: 1200px; height: 630px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 36px 60px 32px;
}
.logo { width: 300px; margin: 0 auto 22px; }
.title {
  font-family: OutfitVar, Outfit, InterVar, sans-serif;
  font-weight: 800;
  font-size: 118px;
  line-height: 0.9;
  letter-spacing: -0.05em;
  color: #fff;
}
.tag {
  margin-top: 14px;
  font-size: 30px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: #c8cbd4;
}
.price-block { margin-top: 22px; }
.big-price {
  font-family: OutfitVar, Outfit, InterVar, sans-serif;
  font-weight: 800;
  font-size: 64px;
  letter-spacing: -0.04em;
  color: #fff;
  line-height: 1;
}
.founding {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  background: rgba(16, 36, 44, 0.8);
  color: #7ef0dc;
  font-weight: 650;
  font-size: 24px;
  letter-spacing: -0.01em;
  padding: 10px 18px 10px 16px;
  border-radius: 999px;
  border: 1px solid rgba(94, 234, 212, 0.38);
  line-height: 1;
}
.founding svg { width: 16px; height: 16px; color: #7ef0dc; }
.features {
  display: flex;
  justify-content: center;
  gap: 28px;
  margin-top: 32px;
  width: 100%;
  max-width: 980px;
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
  width: 64px; height: 64px;
  border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
}
.ico svg { width: 30px; height: 30px; }
.ico.star { background: #4f7df5; color: #fff; }
.ico.x { background: #5b54e8; color: #fff; }
.ico.mega { background: #e07a3a; color: #fff; }
.feat span {
  font-size: 26px;
  font-weight: 650;
  letter-spacing: -0.03em;
  color: #f2f3f7;
  line-height: 1.2;
  white-space: nowrap;
}
""", f"""
<div class="card">
  <img class="logo" src="{LOGO}" alt="Digital Underground">
  <div class="title">MAKER PRO</div>
  <div class="tag">Get seen. Get promoted.</div>
  <div class="price-block">
    <div class="big-price">$9/mo · $79/yr</div>
    <div class="founding">{ICON_STAR}Founding 25: $59/yr</div>
  </div>
  <div class="features">
    <div class="feat"><div class="ico star">{ICON_STAR}</div><span>Featured slots</span></div>
    <div class="feat"><div class="ico x">{ICON_X}</div><span>DU X channels</span></div>
    <div class="feat"><div class="ico mega">{ICON_MEGAPHONE}</div><span>Promotion from DU</span></div>
  </div>
</div>
""")

html_c = wrap("""
body {
  background: #0a0b12;
}
.frame {
  width: 1200px; height: 630px;
  padding: 0;
}
.card {
  width: 1200px; height: 630px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(900px 600px at 110% 10%, rgba(124, 92, 255, 0.38), transparent 58%),
    radial-gradient(800px 500px at -10% 110%, rgba(40, 180, 200, 0.16), transparent 50%),
    linear-gradient(115deg, #0c0d16 0%, #15122a 48%, #1a1540 78%, #2a1d62 100%);
  padding: 48px 56px 44px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}
.logo { width: 280px; }
.prices { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
.price {
  font-family: OutfitVar, Outfit, InterVar, sans-serif;
  font-weight: 750;
  font-size: 28px;
  letter-spacing: -0.03em;
  color: #fff;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.14);
  padding: 10px 16px;
  border-radius: 999px;
  line-height: 1;
}
.founding {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #7ef0dc;
  font-weight: 650;
  font-size: 22px;
  letter-spacing: -0.01em;
  padding: 9px 14px 9px 12px;
  border-radius: 999px;
  border: 1px solid rgba(94, 234, 212, 0.38);
  background: rgba(16, 36, 44, 0.45);
  line-height: 1;
}
.founding svg { width: 15px; height: 15px; color: #7ef0dc; }
.mid { margin-top: 8px; }
.title {
  font-family: OutfitVar, Outfit, InterVar, sans-serif;
  font-weight: 800;
  font-size: 120px;
  line-height: 0.9;
  letter-spacing: -0.05em;
  color: #fff;
}
.tag {
  margin-top: 16px;
  font-size: 32px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: #d0d3dc;
}
.pills { display: flex; gap: 12px; flex-wrap: nowrap; align-items: center; }
.pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 999px;
  padding: 12px 18px 12px 12px;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #f3f4f8;
  line-height: 1;
  white-space: nowrap;
}
.dot {
  width: 36px; height: 36px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex: 0 0 36px;
}
.dot svg { width: 16px; height: 16px; }
.dot.star { background: #4f7df5; color: #fff; }
.dot.x { background: #5b54e8; color: #fff; }
.dot.mega { background: #e07a3a; color: #fff; }
""", f"""
<div class="frame"><div class="card">
  <div class="top">
    <img class="logo" src="{LOGO}" alt="Digital Underground">
    <div class="prices">
      <div class="price">$9/mo · $79/yr</div>
      <div class="founding">{ICON_STAR}Founding 25: $59/yr</div>
    </div>
  </div>
  <div class="mid">
    <div class="title">MAKER PRO</div>
    <div class="tag">Get seen. Get promoted.</div>
  </div>
  <div class="pills">
    <div class="pill"><div class="dot star">{ICON_STAR}</div>Featured slots</div>
    <div class="pill"><div class="dot x">{ICON_X}</div>DU X channels</div>
    <div class="pill"><div class="dot mega">{ICON_MEGAPHONE}</div>Promotion from DU</div>
  </div>
</div></div>
""")

FORBIDDEN = (
    "intro", "intros", "introductions", "introduction",
    "connect", "connected", "connections", "connection",
    "draft", "toggle",
)

def check_copy(name, html):
    low = html.lower()
    # strip svg/css/paths noise somewhat; still scan visible text-ish
    hits = []
    for w in FORBIDDEN:
        if w in low:
            hits.append(w)
    if hits:
        raise SystemExit(f"{name} HTML contains forbidden terms: {hits}")

for name, html in [("option-a", html_a), ("option-b", html_b), ("option-c", html_c)]:
    check_copy(name, html)
    (OUT / f"{name}.html").write_text(html, encoding="utf-8")
    print("wrote", name, "html", len(html), "chars")

def render():
    paths = []
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="/usr/bin/google-chrome",
            args=["--no-sandbox", "--disable-gpu", "--allow-file-access-from-files"],
        )
        page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=2)
        for name in ("option-a", "option-b", "option-c"):
            url = (OUT / f"{name}.html").as_uri()
            page.goto(url, wait_until="networkidle")
            page.wait_for_timeout(250)
            raw = OUT / f"{name}@2x.png"
            page.screenshot(path=str(raw), type="png", omit_background=False)
            im = Image.open(raw).convert("RGB")
            print(name, "raw", im.size)
            if im.size != (2400, 1260):
                # crop or note
                print(" unexpected raw size", im.size)
            out = im.resize((1200, 630), Image.Resampling.LANCZOS)
            dest = OUT / f"{name}.png"
            out.save(dest, "PNG", optimize=True)
            print("saved", dest, dest.stat().st_size)
            paths.append(dest)
            raw.unlink()
        browser.close()
    return paths

if __name__ == "__main__":
    render()
