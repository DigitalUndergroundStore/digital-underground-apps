#!/usr/bin/env python3
"""Unlisted, noindex redesign preview of /store/ -> store-preview-r8m2/. Data parsed from store/index.html."""
import json, re, html, os, importlib.util
from bs4 import BeautifulSoup
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("sn", f"{R}/scripts/site-nav.py"); sn = importlib.util.module_from_spec(spec); spec.loader.exec_module(sn)
s = BeautifulSoup(open(f"{R}/store/index.html", encoding="utf8").read(), "html.parser")
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
        if EXCLUDE.search(name) or "gumroad.com" not in a["href"]: continue
        cover = img["src"] if img else v["poster"]
        items.append(dict(name=name, price=p.get_text(strip=True), blurb=b.get_text(strip=True) if b else "", href=a["href"], cover="/store/" + cover))
    if items: secs.append((sec["id"], items))
E = html.escape
def card(d, feat=False):
    return (f'<a class="pc{" pc-f" if feat else ""} rv" href="{E(d["href"])}" target="_blank" rel="noopener">'
      f'<span class="pc-cv"><img src="{E(d["cover"])}" alt="{E(d["name"])} cover" loading="lazy" decoding="async"></span>'
      f'<span class="pc-b"><strong>{E(d["name"])}</strong><span class="pc-d">{E(d["blurb"])}</span>'
      f'<span class="pc-r"><span class="pc-p">{E(d["price"])}</span><span class="pc-c">{"Get it free" if d["price"]=="Free" else "Buy"} <i>→</i></span></span></span></a>')
HEAD = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>{t}</title><link rel="icon" href="/assets/logo/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#05040c;--v1:#7c5cff;--v2:#b9a8ff;--cy:#22d3ee;--tx:#ece9f7;--mu:#a49fbd;--ln:rgba(185,168,255,.14);--card:rgba(255,255,255,.035)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.55 Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}img{max-width:100%;display:block}
.w{max-width:1200px;margin:0 auto;padding:0 20px}
.gt{background:linear-gradient(100deg,var(--v1),var(--v2) 60%,var(--cy));-webkit-background-clip:text;background-clip:text;color:transparent}
.glow{position:absolute;inset:-20% -10% auto;height:620px;pointer-events:none;background:radial-gradient(40% 50% at 25% 30%,rgba(124,92,255,.32),transparent 70%),radial-gradient(30% 40% at 80% 20%,rgba(34,211,238,.16),transparent 70%);filter:blur(10px);animation:drift 16s ease-in-out infinite alternate;z-index:0}
@keyframes drift{to{transform:translate3d(0,30px,0) scale(1.05)}}
.hero{position:relative;padding:84px 0 40px;overflow:hidden}.hero .w{position:relative;z-index:1}
.eyb{display:inline-flex;gap:8px;align-items:center;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--v2);padding:6px 12px;border:1px solid var(--ln);border-radius:99px;background:rgba(124,92,255,.08)}
.eyb b{width:6px;height:6px;border-radius:50%;background:var(--cy);box-shadow:0 0 10px var(--cy)}
h1{font-size:clamp(38px,6.4vw,72px);line-height:1.02;letter-spacing:-.035em;font-weight:800;margin:20px 0 16px;max-width:14ch}
.lead{font-size:clamp(16px,2vw,19px);color:var(--mu);max-width:56ch;margin:0 0 28px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:13px 22px;border-radius:12px;font-weight:600;font-size:15px;transition:transform .2s,box-shadow .2s,background .2s}
.btn-p{background:linear-gradient(100deg,var(--v1),#9b82ff);color:#fff;box-shadow:0 8px 30px -8px rgba(124,92,255,.7)}.btn-p:hover{transform:translateY(-2px);box-shadow:0 14px 40px -10px rgba(124,92,255,.9)}
.btn-g{border:1px solid var(--ln);background:rgba(255,255,255,.03)}.btn-g:hover{border-color:rgba(34,211,238,.5)}
.row{display:flex;gap:12px;flex-wrap:wrap}
.stats{display:flex;gap:28px;flex-wrap:wrap;margin-top:36px;color:var(--mu);font-size:14px}.stats strong{display:block;color:var(--tx);font-size:22px;font-weight:700}
.tabs{position:sticky;top:0;z-index:20;background:rgba(5,4,12,.82);backdrop-filter:blur(14px);border-bottom:1px solid var(--ln)}
.tabs .w{display:flex;gap:6px;overflow-x:auto;padding-top:10px;padding-bottom:10px;scrollbar-width:none}.tabs a{white-space:nowrap;font-size:14px;font-weight:500;color:var(--mu);padding:7px 14px;border-radius:99px;border:1px solid transparent;transition:.2s}
.tabs a:hover,.tabs a.on{color:var(--tx);border-color:var(--ln);background:rgba(124,92,255,.12)}
section.s{padding:56px 0 8px;scroll-margin-top:60px}.sh{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:22px}
.sh h2{font-size:clamp(24px,3vw,32px);letter-spacing:-.02em;margin:0;font-weight:700}.sh span{color:var(--mu);font-size:14px}
.g{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.gf{display:grid;gap:18px;grid-template-columns:repeat(6,1fr)}.gf .pc{grid-column:span 2}.gf .pc:nth-child(-n+2){grid-column:span 3}
.pc{position:relative;display:flex;flex-direction:column;border-radius:18px;background:var(--card);border:1px solid var(--ln);overflow:hidden;transition:transform .35s cubic-bezier(.2,.8,.2,1),border-color .3s,box-shadow .35s}
.pc::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;background:linear-gradient(140deg,rgba(124,92,255,.7),transparent 40%,rgba(34,211,238,.5));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;transition:opacity .3s;pointer-events:none}
.pc:hover{transform:translateY(-5px);box-shadow:0 24px 50px -24px rgba(124,92,255,.55)}.pc:hover::before{opacity:1}
.pc-cv{aspect-ratio:16/10;overflow:hidden;background:linear-gradient(135deg,#120e26,#0a0818)}.pc-cv img{width:100%;height:100%;object-fit:cover;transition:transform .6s cubic-bezier(.2,.8,.2,1)}.pc:hover .pc-cv img{transform:scale(1.05)}
.pc-b{display:flex;flex-direction:column;gap:6px;padding:16px 18px 18px;flex:1}.pc-b strong{font-size:17px;font-weight:650;letter-spacing:-.01em}
.pc-d{color:var(--mu);font-size:14px;line-height:1.5;flex:1}.pc-r{display:flex;justify-content:space-between;align-items:center;margin-top:10px}
.pc-p{font-weight:700;font-size:16px}.pc-c{font-size:13px;font-weight:600;color:var(--cy);padding:6px 12px;border-radius:99px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.25);transition:.2s}
.pc-c i{font-style:normal;display:inline-block;transition:transform .2s}.pc:hover .pc-c{background:rgba(34,211,238,.16)}.pc:hover .pc-c i{transform:translateX(3px)}
.pc-f .pc-b strong{font-size:20px}
.rv{opacity:0;transform:translateY(18px)}.rv.in{opacity:1;transform:none;transition:opacity .7s ease,transform .7s cubic-bezier(.2,.8,.2,1)}
.trust{margin:64px 0 72px;display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.trust div{padding:22px;border:1px solid var(--ln);border-radius:16px;background:var(--card)}.trust b{display:block;margin-bottom:4px}.trust span{color:var(--mu);font-size:14px}
.pv{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:50;font-size:12px;padding:6px 12px;border-radius:99px;background:rgba(5,4,12,.9);border:1px solid var(--ln);color:var(--mu)}
/* detail */
.dt{display:grid;gap:40px;grid-template-columns:1.15fr 1fr;align-items:start;padding:40px 0 30px}
.dt-m{border-radius:22px;overflow:hidden;border:1px solid var(--ln);background:#0a0818;box-shadow:0 40px 80px -40px rgba(124,92,255,.6)}.dt-m img{width:100%}
.crumb{font-size:13px;color:var(--mu);margin-bottom:14px}.crumb a:hover{color:var(--tx)}
.dt h1{font-size:clamp(34px,5vw,54px);margin:10px 0 12px}.price{font-size:34px;font-weight:800;margin:6px 0 20px}
.buy{position:relative;width:100%;justify-content:center;font-size:17px;padding:16px}
.feat{list-style:none;padding:0;margin:26px 0 0;display:grid;gap:10px}.feat li{display:flex;gap:10px;color:var(--mu);font-size:15px}.feat li::before{content:"";flex:none;width:18px;height:18px;margin-top:2px;border-radius:50%;background:radial-gradient(circle,var(--cy) 30%,rgba(34,211,238,.15) 32%)}
.note{font-size:13px;color:var(--mu);margin-top:12px;text-align:center}
.sticky-buy{display:none}
@media(max-width:860px){.gf{grid-template-columns:1fr 1fr}.gf .pc,.gf .pc:nth-child(-n+2){grid-column:span 1}.gf .pc:first-child{grid-column:span 2}.dt{grid-template-columns:1fr;gap:24px;padding-top:20px}
.sticky-buy{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:40;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:rgba(5,4,12,.92);backdrop-filter:blur(12px);border-top:1px solid var(--ln);align-items:center;justify-content:space-between;gap:12px}.sticky-buy .btn{padding:11px 20px}.has-sb .pv{bottom:84px}}
@media(max-width:520px){.hero{padding:56px 0 24px}.g{grid-template-columns:1fr 1fr;gap:12px}.gf{gap:12px}.pc-b{padding:12px}.pc-b strong{font-size:15px}.pc-d{display:none}.pc-f .pc-d{display:block}.pc-r{flex-direction:column;align-items:flex-start;gap:8px}.pc-c{padding:5px 10px}.stats{gap:20px}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.rv{opacity:1;transform:none}}
</style></head><body{bc}>
'''
JS = '''<div class="pv">Design preview · not the live store</div>
<script>const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -6% 0px'});
document.querySelectorAll('.rv').forEach((el,i)=>{el.style.transitionDelay=(i%4)*70+'ms';io.observe(el)});
const tabs=[...document.querySelectorAll('.tabs a')];if(tabs.length){const so=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)tabs.forEach(t=>t.classList.toggle('on',t.hash==='#'+e.target.id))}),{rootMargin:'-40% 0px -55% 0px'});document.querySelectorAll('section.s').forEach(s=>so.observe(s))}</script>
</body></html>'''
paid = sum(len(i) for _, i in secs)
body = [HEAD.replace("{t}","Digital Underground Store — Preview").replace("{bc}",""),
 '<main><div class="hero"><div class="glow"></div><div class="w">',
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
body.append('<p style="margin:-40px 0 60px"><a class="btn btn-g" href="product.html">View sample product page →</a></p></div></main>' + JS)
out = f"{R}/store-preview-r8m2"; os.makedirs(out, exist_ok=True)
open(f"{out}/index.html", "w", encoding="utf8").write(sn.apply("".join(body)))
# sample product page: Pantry Week
pw = next(d for _, i in secs for d in i if d["name"] == "Pantry Week")
assert pw["price"] == "CA$24"
pg = [HEAD.replace("{t}","Pantry Week — Digital Underground (Preview)").replace("{bc}",' class="has-sb"'), '<main class="w">',
 '<div class="dt"><div class="dt-m rv"><img src="/store/media/jhagho.jpg?v=20261012pw3101" alt="Pantry Week"></div><div class="rv">',
 '<div class="crumb"><a href="./">Store</a> / Featured</div><span class="eyb"><b></b>Offline app</span>',
 f'<h1>{E(pw["name"])}</h1><p class="lead">{E(pw["blurb"])}</p><div class="price">{E(pw["price"])}</div>',
 f'<a class="btn btn-p buy" href="{E(pw["href"])}" target="_blank" rel="noopener">Buy on Gumroad →</a><p class="note">Secure checkout via Gumroad · instant download</p>',
 '<ul class="feat"><li>1,000+ hand-checked recipes that work offline</li><li>Plan your week in minutes</li><li>Shopping list sorted by aisle</li><li>Step-by-step cooking mode</li></ul>',
 '</div></div><section class="s"><div class="sh"><h2>More from Featured</h2></div><div class="g">' + "".join(card(d) for d in secs[0][1] if d is not pw) + '</div></section><div style="height:60px"></div></main>',
 f'<div class="sticky-buy"><div><strong>Pantry Week</strong><div style="color:var(--mu);font-size:14px">{E(pw["price"])}</div></div><a class="btn btn-p" href="{E(pw["href"])}" target="_blank" rel="noopener">Buy now</a></div>', JS]
open(f"{out}/product.html", "w", encoding="utf8").write(sn.apply("".join(pg)))
print("ok", paid)
