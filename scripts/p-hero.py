#!/usr/bin/env python3
"""Rewrite the hero (<main class="page">) of every /p/<slug>/ share page in place.
Uses only data already on the page / in the catalog: name, price, pitch, meta description,
checkout link, product cover. Idempotent; keeps the Pantry Week promo video block as is."""
import html, re, importlib.util as iu
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = iu.spec_from_file_location("gen", Path(__file__).with_name("generate-product-share-pages.py"))
gen = iu.module_from_spec(spec); spec.loader.exec_module(gen)
CAT = {p["slug"]: p for p in gen.PRODUCTS}
MAIN_RE = re.compile(r'<main class="page">.*?</main>', re.S)
esc = html.escape


def grab(rx, s, default=""):
    m = re.search(rx, s, re.S)
    return html.unescape(m.group(1)).strip() if m else default


def media_html(s, slug, name):
    if "data-share-promo" in s:  # keep the promo video exactly
        m = re.search(r'(    <div class="cover-wrap cover-wrap--promo".*?\n    </div>)\n', s, re.S)
        return m.group(1)
    p = CAT.get(slug, {})
    rel = p.get("cover")
    src, w, h = f"/p/og/{slug}.jpg", 1200, 630
    if rel and (ROOT / "store" / rel).is_file():
        w, h = Image.open(ROOT / "store" / rel).size
        src = f"/store/{rel}"
    return (f'    <div class="cover-wrap">\n'
            f'      <img class="cover" src="{esc(src)}" width="{w}" height="{h}" alt="{esc(name)} cover" fetchpriority="high" decoding="async">\n'
            f'    </div>')


def hero(s, slug):
    main = MAIN_RE.search(s).group(0)
    name = grab(r"<h1[^>]*>(.*?)</h1>", main)
    price = CAT.get(slug, {}).get("price") or re.sub(r"<[^>]+>|Price: ", "", grab(r'<p class="price">(.*?)</p>', main))
    pitch = [html.unescape(x).strip() for x in re.findall(r'<p class="pitch-line">(.*?)</p>', main)]
    href = grab(r'<a class="cta[^"]*" href="([^"]+)"', main)
    desc = grab(r'<meta name="description" content="([^"]*)"', s)
    lede = desc or (pitch[0] if pitch else "")
    extra = [x for x in CAT.get(slug, {}).get("pitch", [])[1:] if x and x not in lede]
    free = price.lower() == "free"
    label = f"Get {name} free" if free else f"Get {name} · {price}"
    if len(name) > 28:
        label = "Get it free" if free else f"Get it · {price}"
    media = media_html(main, slug, name)
    extra_html = "".join(f'\n      <p class="pitch-line">{esc(x)}</p>' for x in extra)
    return f'''<main class="page">
  <article class="card hero{' hero--promo' if 'data-share-promo' in media else ''}">
{media}
    <div class="body">
      <p class="eyebrow">Digital product · by <a href="/store/">Digital Underground</a></p>
      <h1>{esc(name)}</h1>
      <p class="lede">{esc(lede)}</p>{extra_html}
      <div class="buy">
        <a class="cta" href="{esc(href)}" rel="noopener">{esc(label)}</a>
        <p class="price"><span class="sr">Price: </span>{esc(price)}</p>
      </div>
      <p class="assure">Secure checkout on Gumroad. Instant download.</p>
      <p class="back"><a href="/store/">See all products</a></p>
    </div>
  </article>
</main>'''


def main():
    n = 0
    for f in sorted((ROOT / "p").glob("*/index.html")):
        s = f.read_text()
        if '<main class="page">' not in s or 'http-equiv="refresh"' in s:
            continue
        new = MAIN_RE.sub(lambda m: hero(s, f.parent.name), s, count=1)
        new = re.sub(r'/p/share\.css(\?v=[\w]+)?"', '/p/share.css?v=hero2"', new)
        if new != s:
            f.write_text(new); n += 1
    print(f"p-hero: {n} pages")


if __name__ == "__main__":
    main()
