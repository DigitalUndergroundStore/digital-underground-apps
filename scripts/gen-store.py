#!/usr/bin/env python3
"""Generate /store/index.html from scripts/store/catalog.json.

The storefront HTML is generated. Edit this script, store/store.css, store/store.js,
or the catalog — then re-run. Do not hand-edit store/index.html.

PlanetView Live is CA$24 on Gumroad (product oxnfvy, code DUFREEPV). The storefront
always shows "Free with signup" and links to /free-planetview/. That override runs
on every generate, including --force-live / --from-html, which refresh list prices
from the current public store page.

  python3 scripts/gen-store.py
  python3 scripts/gen-store.py --from-html /path/to/store.html
  python3 scripts/gen-store.py --force-live
"""
from __future__ import annotations

import argparse
import html
import json
import re
import urllib.request
from collections import OrderedDict
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "scripts" / "store" / "catalog.json"
NAV_PATH = ROOT / "scripts" / "store" / "partials" / "site-nav.html"
FOOT_PATH = ROOT / "scripts" / "store" / "partials" / "site-foot.html"
OUT = ROOT / "store" / "index.html"
LIVE_URL = "https://digitalundergroundstore.com/store/"

CATS = [
    ("all", "All"),
    ("featured", "Featured"),
    ("freelance", "Freelance"),
    ("focus", "Focus & life"),
    ("ai", "AI tools"),
    ("apps", "Apps"),
    ("bundles", "Bundles"),
    ("books", "Books"),
    ("free", "Free"),
]
# Collections counted in the hero. "all" is not a collection. Thrillers is a separate page.
COLLECTION_IDS = [cid for cid, _ in CATS if cid != "all"]


def is_planetview(product: dict) -> bool:
    page = (product.get("page") or "").rstrip("/")
    return (
        page.endswith("/planetview-live")
        or product.get("gumroad") == "oxnfvy"
        or product.get("name") == "PlanetView Live"
    )


def apply_storefront(product: dict) -> dict:
    """Copy a catalog row and apply storefront-only price rules."""
    item = dict(product)
    item["sections"] = list(product.get("sections") or [])
    if is_planetview(item):
        item["gumroad"] = "oxnfvy"
        item["list_price"] = "CA$24"
        item["coupon"] = "DUFREEPV"
        item["price_label"] = "Free with signup"
        item["cta_href"] = "/free-planetview/"
        item["cta"] = "Get it free"
        item["cta_external"] = False
        item["coming_soon"] = False
        item["tag"] = "Live"
        if "featured" not in item["sections"]:
            item["sections"].insert(0, "featured")
    label = (item.get("price_label") or "").strip().lower()
    item["free"] = label.startswith("free")
    return item


def stamp_planetview_meta(product: dict) -> dict:
    if is_planetview(product):
        product["gumroad"] = "oxnfvy"
        product["list_price"] = "CA$24"
        product["coupon"] = "DUFREEPV"
    return product


def _section_at(sections: list[tuple[int, str]], pos: int) -> str:
    current = "featured"
    for start, sid in sections:
        if start <= pos:
            current = sid
        else:
            break
    return current


def parse_live_store(page_html: str) -> dict:
    """Pull product cards out of a generated /store/ page (live or previous)."""
    main_m = re.search(r'<main id="main">([\s\S]*?)<!--du-site-foot-->', page_html)
    if not main_m:
        main_m = re.search(r'<main class="main" id="catalog">([\s\S]*?)</main>', page_html)
    if not main_m:
        raise SystemExit("Could not find the store <main> in the HTML.")
    main = main_m.group(1)
    sections = [(m.start(), m.group(1)) for m in re.finditer(r'<section class="s" id="([^"]+)">', main)]
    # Redesigned pages keep data-cats on articles. Prefer that when the old section markup is gone.
    if not sections and 'class="card"' in main:
        return _parse_redesign(page_html)

    notes: dict[str, str] = {}
    for m in re.finditer(r'<p class="(?:du-freestrip|au-bridge|filter-note)"[\s\S]*?</p>', main):
        sid = _section_at(sections, m.start()) if sections else ""
        note_attr = re.search(r'data-note="([^"]+)"', m.group(0))
        key = note_attr.group(1) if note_attr else sid
        if key:
            notes[key] = re.sub(r'\sstyle="[^"]*"', "", m.group(0))

    merged: OrderedDict[str, dict] = OrderedDict()
    for part in re.split(r'(?=<div class="pc )', main)[1:]:
        name_a = re.search(r'<a class="pc-a" href="([^"]+)">([\s\S]*?)</a>', part)
        if not name_a:
            continue
        img = re.search(r'<img src="([^"]+)"', part)
        desc = re.search(r'<span class="pc-d">([\s\S]*?)</span>', part)
        price = re.search(r'<span class="pc-p">([\s\S]*?)</span>', part)
        cta = re.search(r'<a class="pc-c" href="([^"]+)"([^>]*)>([\s\S]*?)</a>', part)
        pos = main.find(part[:120])
        name = unescape(re.sub(r"<[^>]+>", "", name_a.group(2))).strip()
        cta_text = unescape(re.sub(r"<[^>]+>", "", cta.group(3))).replace("→", "").strip() if cta else ""
        href = cta.group(1) if cta else ""
        gum = re.search(r"gumroad\.com/l/([A-Za-z0-9]+)", href)
        page = name_a.group(1)
        row = {
            "name": name,
            "page": page,
            "desc": unescape(re.sub(r"<[^>]+>", "", desc.group(1))).strip() if desc else "",
            "img": img.group(1) if img else "",
            "price_label": unescape(re.sub(r"<[^>]+>", "", price.group(1))).strip() if price else "",
            "cta_href": href,
            "cta": cta_text,
            "cta_external": bool(cta and 'target="_blank"' in cta.group(2)),
            "coming_soon": cta_text.lower().startswith("coming soon"),
            "sections": [_section_at(sections, pos if pos >= 0 else 0)],
            "gumroad": gum.group(1) if gum else None,
        }
        stamp_planetview_meta(row)
        prev = merged.get(page)
        if prev is None:
            merged[page] = row
        else:
            for sid in row["sections"]:
                if sid not in prev["sections"]:
                    prev["sections"].append(sid)
    if len(merged) < 40:
        raise SystemExit(f"Parsed only {len(merged)} products; refusing to overwrite the catalog.")
    return {"notes": notes, "products": list(merged.values())}


def _parse_redesign(page_html: str) -> dict:
    """Fallback parser for this generator's own HTML, used by --from-html on a redesign."""
    raise SystemExit("Refusing to rebuild the catalog from redesigned HTML. Pass the pre-redesign store page or edit catalog.json.")


def load_catalog() -> dict:
    data = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    if "products" not in data:
        raise SystemExit(f"{CATALOG_PATH} has no products list.")
    return data


def save_catalog(data: dict) -> None:
    CATALOG_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def esc(value: str) -> str:
    return html.escape(value or "", quote=True)


def cta_label(product: dict) -> str:
    if product.get("coming_soon"):
        return "Preview"
    if product.get("free"):
        return "Get free"
    return "Buy"


def card_html(product: dict, index: int) -> str:
    cats = " ".join(product["sections"])
    search = f"{product['name']} {product['desc']}".lower()
    free = "1" if product["free"] else "0"
    external = ' target="_blank" rel="noopener"' if product.get("cta_external") else ""
    price_class = "card-price free" if product["free"] else "card-price"
    tag = ""
    if product.get("tag"):
        tag_class = "card-tag live" if str(product["tag"]).lower() == "live" else "card-tag"
        tag = f'<span class="{tag_class}">{esc(product["tag"])}</span>'
    label = cta_label(product)
    aria = product["cta"] if product.get("coming_soon") else f'{label} — {product["name"]}'
    if is_planetview(product):
        aria = "Get PlanetView Live free with email signup"
    return f"""<article class="card" data-page="{esc(product['page'])}" data-cats="{esc(cats)}" data-free="{free}" data-search="{esc(search)}">
            {tag}
            <a class="card-media" href="{esc(product['page'])}">
              <img src="{esc(product['img'])}" alt="{esc(product['name'] + ' cover')}" width="640" height="360" loading="{'eager' if index < 6 else 'lazy'}" decoding="async"{' fetchpriority="high"' if index == 0 else ''}>
            </a>
            <div class="card-body">
              <h3 class="card-title"><strong><a href="{esc(product['page'])}">{esc(product['name'])}</a></strong></h3>
              <p class="card-desc">{esc(product['desc'])}</p>
              <div class="card-footer">
                <span class="{price_class}">{esc(product['price_label'])}</span>
                <a class="card-cta" href="{esc(product['cta_href'])}"{external} aria-label="{esc(aria)}">{esc(label)} <span aria-hidden="true">→</span></a>
              </div>
            </div>
          </article>"""


def promo_html(products: list[dict]) -> str:
    wanted = [
        ("/store/p/he-came-home-without-her/", None),
        ("/store/p/planetview-live/", "/free-planetview/"),
    ]
    by_page = {p["page"].rstrip("/"): p for p in products}
    links = []
    for page, href_override in wanted:
        product = by_page.get(page.rstrip("/"))
        if not product:
            continue
        href = href_override or product["page"]
        links.append(
            f'<a href="{esc(href)}"><span class="promo-title">{esc(product["name"])}</span>'
            f'<span class="promo-meta">{esc(product["price_label"])}</span></a>'
        )
    if not links:
        return ""
    return (
        '<div class="promo-strip" role="note"><span class="label">🎃 This weekend</span>'
        f'<div class="promo-links">{"".join(links)}</div></div>'
    )


def notes_html(notes: dict) -> str:
    chunks = []
    for key in ("freelance", "focus", "free"):
        raw = notes.get(key)
        if not raw:
            continue
        raw = re.sub(r'\sstyle="[^"]*"', "", raw)
        raw = re.sub(r'class="[^"]*"', 'class="filter-note"', raw, count=1)
        if "data-note=" not in raw:
            raw = raw.replace("<p ", f'<p data-note="{esc(key)}" hidden ', 1)
        chunks.append(raw)
    return "\n".join(chunks)


def ld_json(products: list[dict]) -> str:
    items = []
    for index, product in enumerate(products, start=1):
        items.append({
            "@type": "ListItem",
            "position": index,
            "url": "https://digitalundergroundstore.com" + product["page"],
            "name": product["name"],
        })
    graph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": "https://digitalundergroundstore.com/#org",
                "name": "Digital Underground",
                "url": "https://digitalundergroundstore.com/",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://digitalundergroundstore.com/assets/logo/du-mark.png",
                    "width": 1024,
                    "height": 1024,
                },
                "sameAs": ["https://x.com/DigitalUG_Store"],
            },
            {
                "@type": "WebSite",
                "@id": "https://digitalundergroundstore.com/#website",
                "name": "Digital Underground",
                "url": "https://digitalundergroundstore.com/",
                "publisher": {"@id": "https://digitalundergroundstore.com/#org"},
            },
            {
                "@type": "CollectionPage",
                "@id": "https://digitalundergroundstore.com/store/#page",
                "url": "https://digitalundergroundstore.com/store/",
                "name": "Digital Underground store",
                "description": "Digital products designed around you: Apps, Guides & AI tools. Pay once.",
                "isPartOf": {"@id": "https://digitalundergroundstore.com/#website"},
                "publisher": {"@id": "https://digitalundergroundstore.com/#org"},
                "mainEntity": {
                    "@type": "ItemList",
                    "numberOfItems": len(items),
                    "itemListElement": items,
                },
            },
        ],
    }
    return json.dumps(graph, ensure_ascii=False, separators=(",", ":"))


def site_nav() -> str:
    raw = NAV_PATH.read_text(encoding="utf-8")
    raw = raw.replace(
        '<a class="dun-shop" href="/store/">',
        '<a class="dun-shop" href="/store/" aria-current="page">',
        1,
    )
    return raw


def render(catalog: dict) -> str:
    products = [apply_storefront(p) for p in catalog["products"]]
    count = len(products)
    collections = len(COLLECTION_IDS)
    cat_buttons = []
    for cid, label in CATS:
        current = "true" if cid == "all" else "false"
        active = " active" if cid == "all" else ""
        cat_buttons.append(
            f'<button class="cat-btn{active}" type="button" data-cat="{cid}" role="tab" aria-selected="{current}">{esc(label)}</button>'
        )
    cat_buttons.append('<a class="cat-btn" href="/store/thrillers/">Thrillers</a>')
    cards = "\n".join(card_html(p, i) for i, p in enumerate(products))
    nav = site_nav()
    foot = FOOT_PATH.read_text(encoding="utf-8")
    sub = (
        f"{count} tools, apps, prompt packs and books from independent makers. "
        "No subscriptions. No lock-in. Download and keep."
    )
    return f"""<!DOCTYPE html>
<!-- Generated by scripts/gen-store.py. Edit the generator, scripts/store/catalog.json, store/store.css, or store/store.js. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Digital Underground: Apps, AI Tools, Books &amp; Dev Marketplace</title>
<meta name="description" content="Digital products designed around you: Apps, Guides &amp; AI tools. Pay once.">
<link rel="canonical" href="https://digitalundergroundstore.com/store/">
<meta property="og:site_name" content="Digital Underground">
<meta property="og:title" content="Digital Underground">
<meta property="og:description" content="Digital products designed around you: Apps, Guides &amp; AI tools. Pay once.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://digitalundergroundstore.com/store/">
<meta property="og:image" content="https://digitalundergroundstore.com/store/og-v2.jpg">
<meta property="og:image:secure_url" content="https://digitalundergroundstore.com/store/og-v2.jpg">
<meta property="og:image:alt" content="Digital Underground. Digital products designed around you: Apps, Guides and AI tools. Pay once.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Digital Underground">
<meta name="twitter:description" content="Digital products designed around you: Apps, Guides &amp; AI tools. Pay once.">
<meta name="twitter:image" content="https://digitalundergroundstore.com/store/og-v2.jpg">
<meta name="twitter:image:alt" content="Digital Underground. Digital products designed around you: Apps, Guides and AI tools. Pay once.">
<meta name="theme-color" content="#07070b">
<link rel="icon" type="image/svg+xml" href="/assets/logo/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/logo/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/logo/favicon-180.png">
<link rel="manifest" href="/site.webmanifest">
<script type="application/ld+json" id="du-ld">{ld_json(products)}</script>
<link rel="stylesheet" href="/assets/site-nav/site-nav.css?v=25">
<link rel="stylesheet" href="/assets/theme-clean.css?v=2">
<link rel="stylesheet" href="/store/store.css?v=20261028wolf2">
</head>
<body class="du-store">
<a class="skip" href="#catalog">Skip to products</a>
{nav}
<header class="hero">
  <div class="badge"><span class="badge-dot" aria-hidden="true"></span> Indie marketplace</div>
  <h1>Pay once.<br>Own it forever.</h1>
  <p class="hero-sub">{esc(sub)}</p>
  <div class="hero-cta-wrap">
    <a href="#catalog" class="btn btn-primary">Browse the collection</a>
    <div class="trust-line">
      <span><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Secure checkout</span>
      <span><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg> Instant download</span>
      <span><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> One-time price</span>
    </div>
  </div>
  {promo_html(products)}
  <div class="stats" role="list">
    <div class="stat" role="listitem"><div class="stat-value">{count}</div><div class="stat-label">products</div></div>
    <div class="stat" role="listitem"><div class="stat-value">{collections}</div><div class="stat-label">collections</div></div>
    <div class="stat" role="listitem"><div class="stat-value">CAD</div><div class="stat-label">one-time pricing</div></div>
  </div>
</header>
<div class="cat-bar">
  <div class="cat-scroll" id="cat-nav" role="tablist" aria-label="Product categories">
    {''.join(cat_buttons)}
  </div>
</div>
<main class="main" id="catalog">
  <div class="value-bar">
    <div class="value-item"><div class="value-icon" aria-hidden="true">🔓</div><div><h2>Own it outright</h2><p>Pay once. Download. Use offline. No monthly fees.</p></div></div>
    <div class="value-item"><div class="value-icon" aria-hidden="true">🛠️</div><div><h2>Built by makers</h2><p>Every product comes from an independent creator.</p></div></div>
    <div class="value-item"><div class="value-icon" aria-hidden="true">⚡</div><div><h2>Start in minutes</h2><p>Instant access after purchase. No waiting, no setup hell.</p></div></div>
  </div>
  <p class="series-note"><strong>New: the Humanity X series.</strong> <a href="/store/p/humanity-x-off-the-ground/">Off the Ground</a> and <a href="/store/p/humanity-x-into-the-stars/">Into the Stars</a>, or the <a href="/store/p/humanity-x-books-1-2/">Books 1 + 2 pack</a>. <a href="/store/series/humanity-x/">See the series</a>.</p>
  <div class="toolbar">
    <div class="search-box">
      <svg class="search-icon" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5"/><path d="M10.5 10.5L14 14"/></svg>
      <input type="search" id="search" placeholder="Search tools, books, packs…" autocomplete="off" aria-label="Search products">
    </div>
    <div class="filter-row">
      <button class="pill active" type="button" data-price="all">All</button>
      <button class="pill" type="button" data-price="free">Free</button>
      <button class="pill" type="button" data-price="paid">Paid</button>
      <span class="results-count" id="results-count" aria-live="polite"></span>
    </div>
  </div>
  {notes_html(catalog.get("notes") or {})}
  <section class="section" aria-label="Products">
    <div class="section-header">
      <h2 class="section-title" id="section-title">All products</h2>
      <span class="section-meta" id="section-meta"></span>
    </div>
    <div class="grid is-pending" id="product-grid">
{cards}
    </div>
    <div class="empty" id="empty-state" hidden>
      <strong>No matches</strong>
      <p>Try a different search or clear the filters.</p>
    </div>
    <nav class="pagination" id="pagination" aria-label="Pagination"></nav>
  </section>
</main>
{foot}
<div class="mobile-bar">
  <a href="#catalog" class="btn btn-primary btn-full">Browse products</a>
</div>
<script src="/store/store.js?v=20261028wolf2" defer></script>
<script src="/store/track.js?v=3" defer></script>
<script src="/assets/signup.js?v=20261027pv" defer></script>
<script src="/assets/presence.js?v=1" defer></script>
</body>
</html>
"""


def assert_storefront(page: str) -> None:
    header = page.split("<!--/du-site-nav-->", 1)[0]
    if "Developer Marketplace" in header:
        raise SystemExit("Header still contains Developer Marketplace.")
    if "Kerzy Labs" in page:
        raise SystemExit("Kerzy Labs branding leaked into the store page.")
    if 'href="/store/" aria-current="page"' not in page and 'aria-current="page"' not in header:
        raise SystemExit("Shop link is missing aria-current on the store page.")
    if "/store/track.js" not in page:
        raise SystemExit("Store tracking script missing.")
    card_m = re.search(
        r'<article class="card"[^>]*data-page="/store/p/planetview-live/"[\s\S]*?</article>',
        page,
    )
    if not card_m:
        raise SystemExit("PlanetView card missing.")
    card = card_m.group(0)
    if "Free with signup" not in card:
        raise SystemExit("PlanetView card is not labeled Free with signup.")
    if "CA$" in card or "gumroad.com/l/oxnfvy" in card:
        raise SystemExit("PlanetView card is showing a catalog price or Gumroad checkout.")
    if 'href="/free-planetview/"' not in card:
        raise SystemExit("PlanetView card does not link to /free-planetview/.")
    cards = page.count('<article class="card"')
    if cards < 140:
        raise SystemExit(f"Expected the live catalog, found {cards} cards.")
    if 'href="/store/p/' not in page:
        raise SystemExit("Product page links missing.")


def fetch_live() -> str:
    req = urllib.request.Request(LIVE_URL, headers={"User-Agent": "du-gen-store"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", "replace")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate the Digital Underground store page.")
    parser.add_argument("--force-live", action="store_true", help="Refresh catalog.json from the live /store/ page, then regenerate. PlanetView stays free with signup.")
    parser.add_argument("--from-html", type=Path, help="Refresh catalog.json from a saved store HTML file, then regenerate.")
    args = parser.parse_args()
    if args.force_live or args.from_html:
        raw = args.from_html.read_text(encoding="utf-8") if args.from_html else fetch_live()
        catalog = parse_live_store(raw)
        for product in catalog["products"]:
            stamp_planetview_meta(product)
        save_catalog(catalog)
        print(f"Updated catalog ({len(catalog['products'])} products)")
    catalog = load_catalog()
    page = render(catalog)
    assert_storefront(page)
    OUT.write_text(page, encoding="utf-8")
    shown = apply_storefront(next(p for p in catalog["products"] if is_planetview(p)))
    print(f"Wrote {OUT} ({page.count('<article class=\"card\"')} products)")
    print(f"PlanetView storefront: {shown['price_label']} -> {shown['cta_href']} (Gumroad {shown['gumroad']} list {shown['list_price']} code {shown['coupon']})")


if __name__ == "__main__":
    main()
