#!/usr/bin/env python3
"""LIVE /store/ (redesign, went live Oct 22 2026) -> store/index.html + store/p/<slug>/index.html.
Product data is parsed from src/store-legacy/index.html (snapshot of the old live store; edit products there, then re-run).
Keeps store/covers, store/media, track.js, og images. Run apply-site-nav.py / seo-meta.py are not needed: chrome + SEO are stamped here."""
import json, re, html, os, importlib.util
from bs4 import BeautifulSoup
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("sn", f"{R}/scripts/site-nav.py"); sn = importlib.util.module_from_spec(spec); spec.loader.exec_module(sn)
s = BeautifulSoup(open(f"{R}/src/store-legacy/index.html", encoding="utf8").read(), "html.parser")
EXCLUDE = re.compile(r"easy tracker", re.I)
LABEL = {"featured":"Featured","freelance":"Freelance","focus":"Focus & life","ai":"AI tools","apps":"Apps","bundles":"Bundles","books":"Books & stories","free":"Free downloads"}
secs, seen = [], set()
for sec in s.select("section[id]"):
    if sec["id"] not in LABEL: continue
    items = []
    for c in sec.select(".card"):
        a = c if c.name == "a" else (c.select_one("a.info") or c.select_one("a"))
        n, p, b = c.select_one("strong"), c.select_one(".price"), c.select_one(".blurb")
        img, v = c.select_one("img"), c.select_one("video")
        if not (a and n and p): continue
        name = n.get_text(strip=True)
        if EXCLUDE.search(name) or not ("gumroad.com" in a["href"] or a["href"].startswith("https://digitalundergroundstore.com/tools/")): continue  # Gumroad products + DU-hosted free web tools
        cover = img["src"] if img else v["poster"]
        items.append(dict(name=name, price=p.get_text(strip=True), blurb=b.get_text(strip=True) if b else "", href=a["href"], cover="/store/" + cover))
    if items: secs.append((sec["id"], items))
E = html.escape
def slug(name): return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
for _, its in secs:
    for d in its: d["slug"] = slug(d["name"])
# Wave AC: CTA overrides ported from Wave AB static patches. Legacy source keeps Gumroad prices;
# these products are offered free on-site, so cards must say so and link to the free path.
CTA = {
  "Humanity X: Off the Ground": dict(price="Free with signup", href="/free-book/", ext=False, cta="Get free", aria="Get Humanity X: Off the Ground free with email signup"),
  "Pantry Week": dict(price="Free beta", href=None, ext=True, cta="Get free", aria="Get the Pantry Week free beta on Gumroad (opens in a new tab)"),
}
def cta(d):
    o = CTA.get(d["name"])
    if o: return dict(price=o["price"], href=o["href"] or d["href"], ext=o["ext"], cta=o["cta"], aria=o["aria"])
    free = d["price"] == "Free"
    return dict(price=d["price"], href=d["href"], ext=True, cta="Get it free" if free else "Buy",
                aria=f'{"Get" if free else "Buy"} {d["name"]} {"on Gumroad" if "gumroad.com" in d["href"] else "(free web app)"} (opens in a new tab)')
def card(d, feat=False):
    # Whole card links to the preview detail page (stretched title link); the pill goes to checkout or the free path (see CTA).
    c = cta(d); tgt = ' target="_blank" rel="noopener"' if c["ext"] else ""
    return (f'<div class="pc{" pc-f" if feat else ""} rv">'
      f'<span class="pc-cv"><img src="{E(d["cover"])}" alt="{E(d["name"])} cover" loading="lazy" decoding="async"></span>'
      f'<span class="pc-b"><strong><a class="pc-a" href="/store/p/{d["slug"]}/">{E(d["name"])}</a></strong><span class="pc-d">{E(d["blurb"])}</span>'
      f'<span class="pc-r"><span class="pc-p">{E(c["price"])}</span><a class="pc-c" href="{E(c["href"])}"{tgt} aria-label="{E(c["aria"])}">{E(c["cta"])} <i>→</i></a></span></span></div>')
HEAD = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{t}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:site_name" content="Digital Underground">
<meta property="og:title" content="{ogt}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="{ogtype}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{img}">
<meta property="og:image:secure_url" content="{img}">
<meta property="og:image:alt" content="{imgalt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{ogt}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{img}">
<meta name="twitter:image:alt" content="{imgalt}">
<meta name="theme-color" content="#11141a">
<link rel="icon" type="image/svg+xml" href="/assets/logo/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/logo/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/logo/favicon-180.png">
<link rel="manifest" href="/site.webmanifest">
{ld}
<style>
:root{--bg:#11141a;--v1:#9a97e8;--v2:#9a97e8;--cy:#9a97e8;--tx:#e6e8ec;--mu:#a8acb5;--ln:rgba(79,70,229,0.14);--card:rgba(230,232,236,0.04)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.55 Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}img{max-width:100%;display:block}
.w{max-width:1200px;margin:0 auto;padding:0 20px}
.gt{background:none;-webkit-background-clip: border-box;background-clip: border-box;color:#e6e8ec}
.glow{position:absolute;inset:-20% -10% auto;height:620px;pointer-events:none;background:transparent;filter:blur(10px);animation:drift 16s ease-in-out infinite alternate;z-index:0}
@keyframes drift{to{transform:translate3d(0,30px,0) scale(1.05)}}
.hero{position:relative;padding:84px 0 40px;overflow:hidden}.hero .w{position:relative;z-index:1}
.eyb{display:inline-flex;gap:8px;align-items:center;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--v2);padding:6px 12px;border:1px solid var(--ln);border-radius:99px;background:rgba(79,70,229,0.08)}
.eyb b{width:6px;height:6px;border-radius:50%;background:var(--du-accent-fill,#4f46e5);box-shadow: 0 0 10px var(--cy)}
h1{font-size:clamp(38px,6.4vw,72px);line-height:1.02;letter-spacing:-.035em;font-weight:800;margin:20px 0 16px;max-width:14ch}
.lead{font-size:clamp(16px,2vw,19px);color:var(--mu);max-width:56ch;margin:0 0 28px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:13px 22px;border-radius:12px;font-weight:600;font-size:15px;transition:transform .2s,box-shadow .2s,background .2s}
.btn-p{background:var(--du-accent-fill,#4f46e5);color:#e6e8ec;box-shadow: none}.btn-p:hover{transform:translateY(-2px);box-shadow: none}
.btn-g{border:1px solid var(--ln);background:rgba(230,232,236,0.03)}.btn-g:hover{border-color:rgba(230,232,236,0.27)}
.row{display:flex;gap:12px;flex-wrap:wrap}
.stats{display:flex;gap:28px;flex-wrap:wrap;margin-top:36px;color:var(--mu);font-size:14px}.stats strong{display:block;color:var(--tx);font-size:22px;font-weight:700}
.tabs{position:sticky;top:0;z-index:20;background:rgba(17,20,26,0.82);backdrop-filter:blur(14px);border-bottom:1px solid var(--ln)}
.tabs .w{display:flex;gap:6px;overflow-x:auto;padding-top:10px;padding-bottom:10px;scrollbar-width:none}.tabs a{white-space:nowrap;font-size:14px;font-weight:500;color:var(--mu);padding:7px 14px;border-radius:99px;border:1px solid transparent;transition:.2s}
.tabs a:hover,.tabs a.on{color:var(--tx);border-color:var(--ln);background:rgba(79,70,229,0.12)}
section.s{padding:56px 0 8px;scroll-margin-top:60px}.sh{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:22px}
.sh h2{font-size:clamp(24px,3vw,32px);letter-spacing:-.02em;margin:0;font-weight:700}.sh span{color:var(--mu);font-size:14px}
.g{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.gf{display:grid;gap:18px;grid-template-columns:repeat(6,1fr)}.gf .pc{grid-column:span 2}.gf .pc:nth-child(-n+2){grid-column:span 3}
.pc{position:relative;display:flex;flex-direction:column;border-radius:18px;background:var(--card);border:1px solid var(--ln);overflow:hidden;transition:transform .35s cubic-bezier(.2,.8,.2,1),border-color .3s,box-shadow .35s}
.pc::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;background:transparent;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;transition:opacity .3s;pointer-events:none}
.pc:hover{transform:translateY(-5px);box-shadow: none}.pc:hover::before{opacity:1}
.pc-cv{aspect-ratio:16/10;overflow:hidden;background:#1a1e26}.pc-cv img{width:100%;height:100%;object-fit:cover;transition:transform .6s cubic-bezier(.2,.8,.2,1)}.pc:hover .pc-cv img{transform:scale(1.05)}
.pc-b{display:flex;flex-direction:column;gap:6px;padding:16px 18px 18px;flex:1}.pc-b strong{font-size:17px;font-weight:650;letter-spacing:-.01em}
.pc-d{color:var(--mu);font-size:14px;line-height:1.5;flex:1}.pc-r{display:flex;justify-content:space-between;align-items:center;margin-top:10px}
.pc-p{font-weight:700;font-size:16px}.pc-c{font-size:13px;font-weight:600;color:var(--cy);padding:6px 12px;border-radius:99px;background:rgba(79,70,229,0.08);border:1px solid rgba(230,232,236,0.2);transition:.2s}
.pc-c i{font-style:normal;display:inline-block;transition:transform .2s}.pc:hover .pc-c{background:rgba(79,70,229,0.16)}.pc:hover .pc-c i{transform:translateX(3px)}
.pc-f .pc-b strong{font-size:20px}
.pc{cursor:pointer}.pc-a::after{content:"";position:absolute;inset:0;z-index:1;border-radius:inherit}.pc-c{position:relative;z-index:2}.pc-a:focus-visible{outline:none}.pc:has(.pc-a:focus-visible){outline:2px solid var(--cy);outline-offset:3px}
.rv{opacity:0;transform:translateY(18px)}.rv.in{opacity:1;transform:none;transition:opacity .7s ease,transform .7s cubic-bezier(.2,.8,.2,1)}
.trust{margin:64px 0 72px;display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.trust div{padding:22px;border:1px solid var(--ln);border-radius:16px;background:var(--card)}.trust b{display:block;margin-bottom:4px}.trust span{color:var(--mu);font-size:14px}
/* detail */
.dt{display:grid;gap:40px;grid-template-columns:1.15fr 1fr;align-items:start;padding:40px 0 30px}
.dt-m{border-radius:22px;overflow:hidden;border:1px solid var(--ln);background:#161a21;box-shadow: none}.dt-m img{width:100%}
.crumb{font-size:13px;color:var(--mu);margin-bottom:14px}.crumb a:hover{color:var(--tx)}
.dt h1{font-size:clamp(34px,5vw,54px);margin:10px 0 12px}.price{font-size:34px;font-weight:800;margin:6px 0 20px}
.buy{position:relative;width:100%;justify-content:center;font-size:17px;padding:16px}
.feat{list-style:none;padding:0;margin:26px 0 0;display:grid;gap:10px}.feat li{display:flex;gap:10px;color:var(--mu);font-size:15px}.feat li::before{content:"";flex:none;width:18px;height:18px;margin-top:2px;border-radius:50%;background:transparent}
.note{font-size:13px;color:var(--mu);margin-top:12px;text-align:center}
.sticky-buy{display:none}
@media(max-width:860px){.gf{grid-template-columns:1fr 1fr}.gf .pc,.gf .pc:nth-child(-n+2){grid-column:span 1}.gf .pc:first-child{grid-column:span 2}.dt{grid-template-columns:1fr;gap:24px;padding-top:20px}
.sticky-buy{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:40;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:#11141a;backdrop-filter:blur(12px);border-top:1px solid var(--ln);align-items:center;justify-content:space-between;gap:12px}.sticky-buy .btn{padding:11px 20px}.has-sb .duf{padding-bottom:84px}}
@media(max-width:520px){.hero{padding:56px 0 24px}.g{grid-template-columns:1fr 1fr;gap:12px}.gf{gap:12px}.pc-b{padding:12px}.pc-b strong{font-size:15px}.pc-d{display:none}.pc-f .pc-d{display:block}.pc-r{flex-direction:column;align-items:flex-start;gap:8px}.pc-c{padding:5px 10px}.stats{gap:20px}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.rv{opacity:1;transform:none}}
</style></head><body{bc}>
'''
JS = '''<script>const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -6% 0px'});
document.querySelectorAll('.rv').forEach((el,i)=>{el.style.transitionDelay=(i%4)*70+'ms';io.observe(el)});
const tabs=[...document.querySelectorAll('.tabs a')];if(tabs.length){const so=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)tabs.forEach(t=>t.classList.toggle('on',t.hash==='#'+e.target.id))}),{rootMargin:'-40% 0px -55% 0px'});document.querySelectorAll('section.s').forEach(s=>so.observe(s))}</script>
<script src="/store/track.js?v=3" defer></script>{extra}
</body></html>'''
paid = sum(len(i) for _, i in secs)
B = "https://digitalundergroundstore.com"
ORG = {"@type":"Organization","@id":f"{B}/#org","name":"Digital Underground","url":f"{B}/","logo":{"@type":"ImageObject","url":f"{B}/assets/logo/du-mark.png","width":1024,"height":1024},"sameAs":["https://x.com/DigitalUG_Store"]}
SITE = {"@type":"WebSite","@id":f"{B}/#website","name":"Digital Underground","url":f"{B}/","publisher":{"@id":f"{B}/#org"}}
def ld(graph): return '<script type="application/ld+json" id="du-ld">' + json.dumps({"@context":"https://schema.org","@graph":graph}, ensure_ascii=False).replace("</", "<\\/") + '</script>'
def head(t, desc, url, img, imgalt, ogt, ogtype, graph, bc=""):
    h = HEAD
    for k, v in (("{t}", t), ("{desc}", E(desc)), ("{url}", url), ("{img}", img), ("{imgalt}", E(imgalt)), ("{ogt}", E(ogt)), ("{ogtype}", ogtype), ("{bc}", bc)):
        h = h.replace(k, v)
    return h.replace("{ld}", ld(graph))
def js(extra=""): return JS.replace("{extra}", extra)
def price_num(pr):
    if pr == "Free": return "0"
    m = re.search(r"[\d.]+", pr); return m.group(0) if m else None
STORE_URL = f"{B}/store/"
SD = "Digital products designed around you: Apps, Guides & AI tools. Pay once."
items_ld = []; seen_ld = set()
for _, its in secs:
    for d in its:
        if d["slug"] in seen_ld: continue
        seen_ld.add(d["slug"]); items_ld.append({"@type":"ListItem","position":len(items_ld)+1,"url":f"{B}/store/p/{d['slug']}/","name":d["name"]})
body = [head("Digital Underground: Apps, AI Tools, Books &amp; Dev Marketplace", SD, STORE_URL, f"{B}/store/og-v2.jpg",
             "Digital Underground. Digital products designed around you: Apps, Guides and AI tools. Pay once.", "Digital Underground", "website",
             [ORG, SITE, {"@type":"CollectionPage","@id":f"{STORE_URL}#page","url":STORE_URL,"name":"Digital Underground store","description":SD,"isPartOf":{"@id":f"{B}/#website"},"publisher":{"@id":f"{B}/#org"},"mainEntity":{"@type":"ItemList","numberOfItems":len(items_ld),"itemListElement":items_ld}}]),
 '<main id="main"><div class="hero"><div class="glow"></div><div class="w">',
 '<span class="eyb"><b></b>Digital Underground store</span>',
 '<h1>Tools, apps &amp; stories, <span class="gt">built to own.</span></h1>',
 '<p class="lead">Offline-first software, prompt packs, bundles and books from independent makers. Pay once, keep it forever.</p>',
 '<div class="row"><a class="btn btn-p" href="#featured">Browse the collection</a><a class="btn btn-g" href="#free">Free downloads</a></div>',
 f'<div class="stats"><div><strong>{paid}</strong>products</div><div><strong>{len(secs)}</strong>collections</div><div><strong>One-time</strong>pricing in CAD</div></div>',
 '</div></div><nav class="tabs" aria-label="Collections"><div class="w">' + "".join(f'<a href="#{i}">{E(LABEL[i])}</a>' for i, _ in secs) + '</div></nav><div class="w">']
for sid, items in secs:
    feat = sid == "featured"
    body.append(f'<section class="s" id="{sid}"><div class="sh"><h2>{E(LABEL[sid])}</h2><span>{len(items)} item{"s"*(len(items)!=1)}</span></div><div class="{"gf" if feat else "g"}">' + "".join(card(d, feat) for d in items) + '</div></section>')
body.append('<div class="trust"><div><b>Secure checkout</b><span>Payments handled by Gumroad.</span></div><div><b>Instant delivery</b><span>Download right after purchase.</span></div><div><b>Yours to keep</b><span>One-time price, no subscription.</span></div></div>')
body.append('</div></main>' + js('\n<script src="/assets/signup.js?v=20261026au" defer></script>'))
out = os.environ.get("DU_STORE_OUT", f"{R}/store")
# Wave AC guard (kept in Wave AD as belt-and-braces; regen is now byte-identical thanks to src/store-overrides/):
# richer blurbs, site-nav v10) that src/store-legacy does not hold. Writing to live store/ would regress them.
# Dry-run: DU_STORE_OUT=/tmp/dry python3 scripts/gen-store.py, then diff -r store /tmp/dry. Use --force-live only after porting.
import sys
if os.path.realpath(out) == os.path.realpath(f"{R}/store") and "--force-live" not in sys.argv:
    sys.exit("gen-store: refusing to overwrite live store/ (hand edits would regress). Set DU_STORE_OUT for a dry run, or pass --force-live.")
os.makedirs(out, exist_ok=True)
open(f"{out}/index.html", "w", encoding="utf8").write(sn.apply("".join(body)))
pw = next(d for _, i in secs for d in i if d["name"] == "Pantry Week")
assert pw["price"] == "CA$24"
def page_head(d, sec):
    url = f"{B}/store/p/{d['slug']}/"
    img = B + d["cover"].split("?")[0]
    desc = (d["blurb"] + " " if d["blurb"] else "") + ("Free download" if d["price"] == "Free" else f"{d['price']} one-time") + " from the Digital Underground store."
    prod = {"@type":"Product","name":d["name"],"image":img,"description":d["blurb"] or d["name"],"url":url,"brand":{"@type":"Brand","name":"Digital Underground"}}
    pn = price_num(d["price"])
    if pn is not None: prod["offers"] = {"@type":"Offer","price":pn,"priceCurrency":"CAD","url":d["href"],"availability":"https://schema.org/InStock"}
    crumbs = {"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Store","item":STORE_URL},{"@type":"ListItem","position":2,"name":LABEL[sec],"item":f"{STORE_URL}#{sec}"},{"@type":"ListItem","position":3,"name":d["name"],"item":url}]}
    return head(f'{E(d["name"])} — Digital Underground Store', desc, url, img, f'{d["name"]} cover', f'{d["name"]} — Digital Underground', "product", [ORG, SITE, prod, crumbs], ' class="has-sb"')
def detail(d, sec):
    if d is pw:
        return "".join([page_head(d, sec), '<main class="w" id="main">',
         f'<div class="dt"><div class="dt-m rv"><img src="/store/media/jhagho.jpg?v=20261012pw3101" alt="Pantry Week"></div><div class="rv">',
         f'<div class="crumb"><a href="/store/">Store</a> / {E(LABEL[sec])}</div><span class="eyb"><b></b>Offline app</span>',
         f'<h1>{E(pw["name"])}</h1><p class="lead">{E(pw["blurb"])}</p><div class="price">{E(pw["price"])}</div>',
         f'<a class="btn btn-p buy" href="{E(pw["href"])}" target="_blank" rel="noopener">Buy on Gumroad →</a><p class="note">Secure checkout via Gumroad · instant download</p>',
         '<ul class="feat"><li>1,000+ hand-checked recipes that work offline</li><li>Plan your week in minutes</li><li>Shopping list sorted by aisle</li><li>Step-by-step cooking mode</li></ul>',
         '</div></div><section class="s"><div class="sh"><h2>More from Featured</h2></div><div class="g">' + "".join(card(x) for x in secs[0][1] if x is not pw) + '</div></section><div style="height:60px"></div></main>',
         f'<div class="sticky-buy"><div><strong>Pantry Week</strong><div style="color:var(--mu);font-size:14px">{E(pw["price"])}</div></div><a class="btn btn-p" href="{E(pw["href"])}" target="_blank" rel="noopener">Buy now</a></div>', js()])
    more = [x for x in dict(secs)[sec] if x is not d][:8]
    return "".join([page_head(d, sec), '<main class="w" id="main">',
     f'<div class="dt"><div class="dt-m rv"><img src="{E(d["cover"])}" alt="{E(d["name"])}"></div><div class="rv">',
     f'<div class="crumb"><a href="/store/">Store</a> / {E(LABEL[sec])}</div><span class="eyb"><b></b>{E(LABEL[sec])}</span>',
     f'<h1>{E(d["name"])}</h1><p class="lead">{E(d["blurb"])}</p><div class="price">{E(d["price"])}</div>',
     f'<a class="btn btn-p buy" href="{E(d["href"])}" target="_blank" rel="noopener">{"Get it free" if d["price"]=="Free" else "Buy on Gumroad"} →</a><p class="note">{"Secure checkout via Gumroad · instant download" if "gumroad.com" in d["href"] else "Free web app · runs in your browser, no sign-up"}</p>',
     '</div></div>' + (f'<section class="s"><div class="sh"><h2>More from {E(LABEL[sec])}</h2></div><div class="g">' + "".join(card(x) for x in more) + '</div></section>' if more else '') + '<div style="height:60px"></div></main>',
     f'<div class="sticky-buy"><div><strong>{E(d["name"])}</strong><div style="color:var(--mu);font-size:14px">{E(d["price"])}</div></div><a class="btn btn-p" href="{E(d["href"])}" target="_blank" rel="noopener">{"Get it" if d["price"]=="Free" else "Buy now"}</a></div>', js()])
# Wave AC: these detail pages were hand-edited in Waves Z/AA (free-with-signup / free-beta heroes); never overwrite them.
HAND = {"humanity-x-off-the-ground", "pantry-week"}
import shutil
if os.path.isdir(f"{out}/p"):
    for x in os.listdir(f"{out}/p"):
        if x not in HAND: shutil.rmtree(f"{out}/p/{x}", ignore_errors=True)
n = 0; slugs = []; done = set()
for sid, its in secs:
    for d in its:
        dd = f"{out}/p/{d['slug']}"
        if d["slug"] in done or d["slug"] in HAND: continue  # first section wins for items listed twice; HAND pages kept
        done.add(d["slug"])
        os.makedirs(dd, exist_ok=True); open(f"{dd}/index.html", "w", encoding="utf8").write(sn.apply(detail(d, sid))); n += 1; slugs.append(d["slug"])
print("ok", paid, "detail pages", n)
# Wave AD: live store HTML diverged from these templates on every page (Waves W–AB). src/store-overrides/ holds the
# authoritative live HTML (index + p/<slug>/); it is overlaid last so a regen preserves it byte-for-byte.
# Edit a page's override to change it; products with no override fall back to the template above.
OV = f"{R}/src/store-overrides"
for root, _, files in os.walk(OV):
    for f in files:
        rel = os.path.relpath(os.path.join(root, f), OV); dst = os.path.join(out, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copyfile(os.path.join(root, f), dst)
