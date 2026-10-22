#!/usr/bin/env python3
"""Write the one shared DU header (between <!--du-site-nav--> markers) into every page and generator.
Pages with their own legacy headers (homepage, store, blog, creator pages) are converted to it.
Run after editing NAV below. Behaviour lives in /assets/site-nav/site-nav.js, styles in site-nav.css."""
import pathlib, re, sys
R = pathlib.Path(__file__).resolve().parent.parent
MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'
NAV = ('<!--du-site-nav--><header class="dun"><div class="dun-in">'
  '<a class="dun-logo" href="/store/" aria-label="Digital Underground store home"><img class="dun-full" src="/assets/logo/du-horizontal.svg" alt="Digital Underground" width="189" height="34"><img class="dun-mark" src="/assets/logo/du-mark.svg" alt="" width="32" height="32"></a>'
  '<nav class="dun-links" aria-label="Primary"><a href="/">Marketplace</a><a href="/league/">League</a></nav>'
  '<div class="dun-right"><a class="dun-cta" href="/community/submit/">List your project free</a>'
  '<div class="dun-acct" id="dunAcct"><a class="dun-signin" href="/community/dashboard/">Sign in</a></div>'
  f'<button type="button" class="dun-menu" id="dunMenu" aria-label="Open menu" aria-controls="dunDrawer" aria-expanded="false">{MENU}</button></div></div>'
  '<nav class="dun-drawer" id="dunDrawer" aria-label="Site menu"><a href="/">Marketplace</a><a href="/league/">League</a><a href="/blog/">Blog</a><hr>'
  '<a href="/store/">Store</a><a href="/makers/">Creators</a><a href="/community/dashboard/">Creator dashboard</a><button type="button" data-dun-share>Share this page</button></nav>'
  '</header><script src="/assets/site-nav/site-nav.js?v=3" defer></script><!--/du-site-nav-->')
CSS = '<link rel="stylesheet" href="/assets/site-nav/site-nav.css?v=4">'
MARK = re.compile(r"<!--du-site-nav-->.*?<!--/du-site-nav-->", re.S)
JS = re.compile(r'\s*<script src="/assets/site-nav/site-nav\.js\?v=\d+" defer></script>')
CSSRE = re.compile(r'<link rel="stylesheet" href="/assets/site-nav/site-nav\.css\?v=\d+">')

def fix(s, legacy=None):
    if legacy and "<!--du-site-nav-->" not in s:
        s, n = re.subn(legacy, "<!--du-site-nav--><!--/du-site-nav-->", s, count=1, flags=re.S)
        if not n: return None
    if "<!--du-site-nav-->" not in s: return None
    s = JS.sub("", s)  # one include only (double includes cancelled each other's toggle)
    s = MARK.sub(lambda m: NAV, s, count=1)
    if CSSRE.search(s): s = CSSRE.sub(CSS, s)
    else: s = s.replace("</head>", CSS + "\n</head>", 1)
    return s

LEGACY = {
  "index.html": r'<!-- Header -->\s*<header class="header" id="header">.*?</header>',
  "src/home-v3/index.template.html": r'<!-- Header -->\s*<header class="header" id="header">.*?</header>',
  "store/index.html": r'<header class="sx-header" id="sxHeader">.*?</header>',
  "scripts/gen-blog.py": r'<header class="nav">.*?<div id="overlay" hidden></div>',
  "blog/index.html": r'<header class="nav">.*?<div id="overlay" hidden></div>',
  "functions/makers/[[path]].js": r'<header class="nav">.*?<div id="overlay" hidden></div>',
}
files = [p for p in R.rglob("*") if p.suffix in (".html", ".py", ".js") and p.is_file() and not any(x in p.parts for x in ("node_modules", "dist", ".git", ".wrangler"))]
changed = []
for p in files:
    rel = str(p.relative_to(R))
    if rel == "scripts/apply-site-nav.py": continue
    s = p.read_text(errors="ignore")
    leg = LEGACY.get(rel) or (LEGACY["blog/index.html"] if rel.startswith("blog/") and rel.endswith(".html") else None)
    if "<!--du-site-nav-->" not in s and not leg: continue
    out = fix(s, leg)
    if out is None: print("SKIP (pattern not found):", rel); continue
    if rel == "store/index.html":  # keep the store's music toggle in the shared header
        mus = (R / "scripts/store-music-button.html").read_text().strip()
        if 'id="hero-music"' not in out.split("<!--/du-site-nav-->")[0]: out = out.replace('<div class="dun-right">', '<div class="dun-right">' + mus, 1)
    if out != s: p.write_text(out); changed.append(rel)
print(len(changed), "files updated"); print("\n".join(changed))
