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
rows.sort(key=lambda r: (pinned.index(r["id"]) if r["id"] in pinned else 1e9, bool(r.get("curated")), (r.get("name") or "").lower()))
def arrange(lst):
    # mirrors arrange() in community/wolf.js
    isw = lambda r: (r.get("makerName") or "").lower() == "wolfitway"
    wolf = [r for r in lst if isw(r)]; rest = [r for r in lst if not isw(r)]
    if not wolf: return lst
    def pick(rx):
        for i, r in enumerate(wolf):
            if re.search(rx, r.get("name") or "", re.I): return wolf.pop(i)
    first, second = pick("wolf sniff"), pick("wolfscent")
    rel = next((rest.pop(i) for i, r in enumerate(rest) if (r.get("name") or "").lower() == "releviq"), None)
    out = [x for x in [first, rel, rest.pop(0) if rest else None, second] if x]
    n = len(wolf); slots = len(rest) + n
    pos = [int((slots * k / (n + 1)) + 0.5) - 1 for k in range(1, n + 1)]  # JS Math.round
    w = t = 0
    for j in range(slots):
        if w < n and j == pos[w]: out.append(wolf[w]); w += 1
        elif t < len(rest): out.append(rest[t]); t += 1
        else: out.append(wolf[w]); w += 1
    return out
rows = arrange(rows)
out = []
for i, r in enumerate(rows):
    href = "/community/p/?id=" + quote(r["id"]); n = e(r["name"]); rid = e(r["id"])
    st = r.get("stage") if r.get("stage") and r.get("stage") != "Released" else ""
    badge = f'<span class="badge stage">{e(st)}</span>' if st else ('<span class="badge" title="Curated by Digital Underground">★ Featured pick</span>' if r.get("curated") else "")
    if r.get("statusLabel"): badge = f'<span class="badges">{badge}<span class="badge label">{e(str(r["statusLabel"])[:24])}</span></span>'
    img = r.get("imageUrl")
    load = 'eager" fetchpriority="high' if i == 0 else "lazy"
    med = (f'<div class="media"><img src="{e(img)}" alt="{n} cover image" width="640" height="360" loading="{load}" decoding="async"></div>' if img
           else f'<div class="media grad" style="background:linear-gradient(135deg,#7c3aed,#4f46e5)"><span aria-hidden="true">{n[:2]}</span></div>')
    ms = r.get("makerSlug") or ("kerzy-labs" if r["id"].startswith("cm_kerzy_") else "wolfitway" if (r.get("makerName") or "").lower() == "wolfitway" else "")
    mk = f'<a href="/makers/{e(ms)}/">{e(r.get("makerName"))}</a>' if re.fullmatch(r"[a-z0-9-]{1,48}", ms or "") else e(r.get("makerName"))
    x = (f' · <a href="https://x.com/{e(r["xHandle"])}" target="_blank" rel="noopener" aria-label="@{e(r["xHandle"])} on X (opens in a new tab)">@{e(r["xHandle"])}</a>' if r.get("xHandle") else "")
    contact = (f'<a class="pill pill-o" href="{href}#contact" aria-label="Contact the developer of {n}">Contact</a>' if r.get("contactable") else "")
    v = r.get("video") or {}
    if v.get("kind") == "file" and v.get("src"):
        med = f'<div class="media"><video class="card-vid" muted loop playsinline preload="none"' + (f' poster="{e(img)}"' if img else "") + f' src="{e(v["src"])}' + ("" if img else "#t=0.1") + f'" aria-label="{n} preview video"></video></div>'
    visit = e(r.get("visitUrl") or r.get("projectUrl"))
    out.append(f'<li class="card reveal" data-id="{rid}" data-globe-ignore style="animation-delay:{i*0.06:.2f}s"><article class="card-inner" aria-labelledby="t-{rid}">{med}'
               f'<div class="body"><div class="top"><div class="tt"><h3 id="t-{rid}"><a href="{href}">{n}</a></h3><p class="maker">{mk}{x}</p></div>{badge}</div>'
               f'<p class="desc">{e(r.get("pitchShort"))}</p><div class="foot-row"><span class="price">{e(r.get("priceLabel") or "See site")}</span><div class="acts">{contact}'
               f'<a class="pill pill-v" data-out="{rid}" href="{visit}" target="_blank" rel="noopener" aria-label="Visit {n} (opens in a new tab)">Visit</a></div></div></div></article></li>')
p = R / "community/index.html"; s = p.read_text()
s = re.sub(r"<!--ssr:start-->.*?<!--ssr:end-->", lambda m: "<!--ssr:start-->\n" + "\n".join(out) + "\n<!--ssr:end-->", s, flags=re.S)
s = re.sub(r'(<p class="count"[^>]*>).*?(</p>)', lambda m: m.group(1) + f"<!--ssr:count-->{len(out)} projects" + m.group(2), s, flags=re.S)
p.write_text(s); print(len(out), "cards rendered")

# Homepage = Developer Marketplace (same SSR), canonical "/". /community/ 301s to / via _redirects.
h = s.replace('href="https://digitalundergroundstore.com/"', 'href="https://digitalundergroundstore.com/"')
h = h.replace('content="https://digitalundergroundstore.com/"', 'content="https://digitalundergroundstore.com/"')
h = h.replace('<a href="/" aria-current="page">', '<a href="/" aria-current="page">')
(R / "index.html").write_text(h); print("index.html (home) written")
