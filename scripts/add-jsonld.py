#!/usr/bin/env python3
"""Insert/refresh schema.org JSON-LD (id="du-ld") on the store, /free-book/ and product share pages.
Product data is read from each page's own meta tags (name, price, image, canonical), so it always
matches the live listing. No ratings or reviews. Idempotent: re-running replaces the block."""
import html, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://digitalundergroundstore.com"
ORG = {"@type": "Organization", "@id": f"{BASE}/#org", "name": "Digital Underground", "url": f"{BASE}/",
       "logo": {"@type": "ImageObject", "url": f"{BASE}/assets/logo/du-mark.png", "width": 1024, "height": 1024}, "sameAs": ["https://x.com/DigitalUG_Store"]}
BLOCK_RE = re.compile(r'\n?<script type="application/ld\+json" id="du-ld">.*?</script>', re.S)


def meta(s, attr, key):
    m = re.search(rf'<meta {attr}="{re.escape(key)}" content="([^"]*)"', s)
    return html.unescape(m.group(1)) if m else ""


def put(path: Path, data) -> None:
    s = path.read_text()
    s = BLOCK_RE.sub("", s)
    js = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    s = s.replace("</head>", f'<script type="application/ld+json" id="du-ld">{js}</script>\n</head>', 1)
    path.write_text(s)


def product_ld(s: str, price_label: str, checkout: str):
    url = re.search(r'<link rel="canonical" href="([^"]+)"', s).group(1)
    name = meta(s, "property", "og:title")
    amount = meta(s, "property", "product:price:amount") or "0.00"
    cur = meta(s, "property", "product:price:currency") or "CAD"
    if price_label.strip().endswith("+"):
        offer = {"@type": "AggregateOffer", "lowPrice": amount, "priceCurrency": cur, "url": checkout or url,
                 "availability": "https://schema.org/InStock"}
    else:
        offer = {"@type": "Offer", "price": amount, "priceCurrency": cur, "url": checkout or url,
                 "availability": "https://schema.org/InStock"}
    return {"@context": "https://schema.org", "@type": "Product", "name": name, "url": url,
            "description": meta(s, "name", "description"), "image": meta(s, "property", "og:image"),
            "brand": {"@type": "Brand", "name": "Digital Underground"}, "offers": offer}


def main() -> None:
    idx = json.loads((ROOT / "p/index.json").read_text())
    n = 0
    for slug, p in idx.items():
        f = ROOT / "p" / slug / "index.html"
        if not f.exists():
            continue
        s = f.read_text()
        if 'name="robots" content="noindex' in s:
            continue
        put(f, product_ld(s, p.get("price", ""), p.get("checkoutUrl", "")))
        n += 1
    put(ROOT / "store/index.html", {"@context": "https://schema.org", "@graph": [ORG, {
        "@type": "WebSite", "@id": f"{BASE}/#website", "name": "Digital Underground", "url": f"{BASE}/",
        "publisher": {"@id": f"{BASE}/#org"}}]})
    fb = ROOT / "free-book/index.html"
    s = fb.read_text()
    put(fb, {"@context": "https://schema.org", "@graph": [ORG, {
        "@type": "Book", "name": "Humanity X: Off the Ground", "url": f"{BASE}/free-book/",
        "description": meta(s, "name", "description"), "image": meta(s, "property", "og:image"),
        "bookFormat": "https://schema.org/AudiobookFormat", "genre": "Science fiction", "inLanguage": "en",
        "isPartOf": {"@type": "BookSeries", "name": "Humanity X Trilogy"}, "publisher": {"@id": f"{BASE}/#org"},
        "isAccessibleForFree": True,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "CAD", "url": f"{BASE}/free-book/",
                   "availability": "https://schema.org/InStock"}}]})
    print(f"product pages: {n}, store + free-book done")


if __name__ == "__main__":
    sys.exit(main())
