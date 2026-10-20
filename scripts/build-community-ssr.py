#!/usr/bin/env python3
"""Server-render the /community listing cards from community/listings.json into community/index.html
(between <!--ssr:start--> and <!--ssr:end-->) so listings are crawlable and paint before JS.
Markup mirrors cardHTML() in community/wolf.js. Live API listings are merged in client-side."""
import json, re, html, pathlib, sys, urllib.request
from urllib.parse import quote
R = pathlib.Path(__file__).resolve().parent.parent
rows = json.load(open(R / "community/listings.json"))
# Merge approved live listings (public GET) the same way the page does: static first, API overrides by id.
# Usage: build-community-ssr.py [--api FILE|URL]; default https://digitalundergroundstore.com/api/community/listings
src = sys.argv[sys.argv.index("--api") + 1] if "--api" in sys.argv else "https://digitalundergroundstore.com/api/community/listings"
try:
    api = json.load(open(src)) if not src.startswith("http") else json.load(urllib.request.urlopen(src, timeout=20))
    by = {r["id"]: r for r in rows}
    for r in api.get("listings", []): by[r["id"]] = r
    rows = list(by.values())
except Exception as ex:
    print("API merge skipped:", ex)
pinned = json.load(open(R / "community/pinned.json"))
GM = re.compile(r'[^\s@<>"]+@gmail\.com', re.I)
def e(s): return html.escape(GM.sub("", str(s or "")), quote=True)
for r in rows:
    if r["id"].startswith("cm_kerzy_") or "kerzy" in (r.get("makerName") or "").lower(): r["makerName"] = "Kerzy Labs"; r["curated"] = False
    if r["id"] == "cm_kerzy_neonbastion": r["stage"] = "In development / testing"
    r.setdefault("curated", False)
rows = [r for r in rows if r.get("status", "approved") in ("approved", "live", "published")]
rows.sort(key=lambda r: ((r.get("makerName") or "").lower() != "wolfitway", pinned.index(r["id"]) if r["id"] in pinned else 1e9, bool(r.get("curated")), (r.get("name") or "").lower()))
out = []
for i, r in enumerate(rows):
    href = "/community/p/?id=" + quote(r["id"]); n = e(r["name"]); rid = e(r["id"])
    st = r.get("stage") if r.get("stage") and r.get("stage") != "Released" else ""
    badge = f'<span class="badge stage">{e(st)}</span>' if st else ('<span class="badge" title="Curated by Digital Underground">★ Featured pick</span>' if r.get("curated") else "")
    img = r.get("imageUrl")
    load = 'eager" fetchpriority="high' if i == 0 else "lazy"
    med = (f'<div class="media"><img src="{e(img)}" alt="{n} cover image" width="640" height="360" loading="{load}" decoding="async"></div>' if img
           else f'<div class="media grad" style="background:linear-gradient(135deg,#7c3aed,#4f46e5)"><span aria-hidden="true">{n[:2]}</span></div>')
    x = (f' · <a href="https://x.com/{e(r["xHandle"])}" target="_blank" rel="noopener" aria-label="@{e(r["xHandle"])} on X (opens in a new tab)">@{e(r["xHandle"])}</a>' if r.get("xHandle") else "")
    contact = (f'<a class="pill pill-o" href="{href}#contact" aria-label="Contact the developer of {n}">Contact</a>' if r.get("contactable") else "")
    v = r.get("video") or {}
    if v.get("kind") == "file" and v.get("src"):
        med = f'<div class="media"><video class="card-vid" muted loop playsinline preload="none"' + (f' poster="{e(img)}"' if img else "") + f' src="{e(v["src"])}' + ("" if img else "#t=0.1") + f'" aria-label="{n} preview video"></video></div>'
    visit = e(r.get("visitUrl") or r.get("projectUrl"))
    out.append(f'<li class="card reveal" data-id="{rid}" data-globe-ignore style="animation-delay:{i*0.06:.2f}s"><article class="card-inner" aria-labelledby="t-{rid}">{med}'
               f'<div class="body"><div class="top"><div class="tt"><h3 id="t-{rid}"><a href="{href}">{n}</a></h3><p class="maker">{e(r.get("makerName"))}{x}</p></div>{badge}</div>'
               f'<p class="desc">{e(r.get("pitchShort"))}</p><div class="foot-row"><span class="price">{e(r.get("priceLabel") or "See site")}</span><div class="acts">{contact}'
               f'<a class="pill pill-v" data-out="{rid}" href="{visit}" target="_blank" rel="noopener" aria-label="Visit {n} (opens in a new tab)">Visit</a></div></div></div></article></li>')
p = R / "community/index.html"; s = p.read_text()
s = re.sub(r"<!--ssr:start-->.*?<!--ssr:end-->", lambda m: "<!--ssr:start-->\n" + "\n".join(out) + "\n<!--ssr:end-->", s, flags=re.S)
s = re.sub(r'(<p class="count"[^>]*>).*?(</p>)', lambda m: m.group(1) + f"<!--ssr:count-->{len(out)} projects" + m.group(2), s, flags=re.S)
p.write_text(s); print(len(out), "cards rendered")
