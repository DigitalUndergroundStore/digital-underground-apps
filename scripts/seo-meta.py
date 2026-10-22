#!/usr/bin/env python3
"""Site-wide SEO pass over static pages: canonical, Open Graph / Twitter tags and an
Organization/publisher JSON-LD block (id="du-org-ld") where a page doesn't already name
who runs the site. Fills only what is missing, from the page's own <title>/description.
Skips noindex pages (unlisted previews stay as they are) and anything Kerzy Labs.
Idempotent. Run after any page generator (gen-landing.py, generate-product-share-pages.py)."""
import html, json, os, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://digitalundergroundstore.com"
DEFAULT_OG = f"{BASE}/community/og-dm-v3.jpg"
ORG = {"@type": "Organization", "@id": f"{BASE}/#org", "name": "Digital Underground", "url": f"{BASE}/",
       "logo": {"@type": "ImageObject", "url": f"{BASE}/assets/logo/du-mark.png", "width": 1024, "height": 1024},
       "image": f"{BASE}/assets/logo/du-horizontal.png", "sameAs": ["https://x.com/DigitalUG_Store"],
       "email": "digitalunderground.store@proton.me"}
BLOCK_RE = re.compile(r'\n?<script type="application/ld\+json" id="du-org-ld">.*?</script>', re.S)
SKIP_DIRS = {"node_modules", "dist", "src", "scripts", "tools", "docs", "workers", "functions", ".git",
             "screening-room-7k3q", "store-preview-r8m2", "owner"}
SKIP_PATHS = {"/community/dashboard-v2/"}  # another worker's page


def has_meta(head, attr, key):
    return re.search(rf'<meta\s+{attr}="{re.escape(key)}"', head) is not None


def get_meta(head, attr, key):
    m = re.search(rf'<meta\s+{attr}="{re.escape(key)}"\s+content="([^"]*)"', head)
    return m.group(1) if m else ""


def process(f: Path, url_path: str) -> bool:
    s = f.read_text(encoding="utf-8")
    if "</head>" not in s:
        return False
    head = s.split("</head>", 1)[0]
    if re.search(r'name="robots"[^>]*noindex', head) or 'http-equiv="refresh"' in head:
        return False
    if re.search(r"kerzy labs", head, re.I) and "Digital Underground" not in head:
        return False  # Kerzy Labs' own pages: never brand them DU
    url = BASE + url_path
    title = (re.search(r"<title>(.*?)</title>", head, re.S) or [None, ""])[1].strip()
    desc = get_meta(head, "name", "description")
    add = []
    canon = re.search(r'<link rel="canonical" href="([^"]+)"', head)
    if not canon:
        add.append(f'<link rel="canonical" href="{url}">')
    else:
        url = canon.group(1)
    if re.search(r'property="og:url" content="[^"]*"', head) and not canon:
        s = re.sub(r'(<meta property="og:url" content=")[^"]*(")', rf"\g<1>{url}\2", s, count=1)
    og_img = get_meta(head, "property", "og:image") or DEFAULT_OG
    want = [("property", "og:site_name", "Digital Underground"), ("property", "og:type", "website"),
            ("property", "og:url", url), ("property", "og:title", title), ("property", "og:description", desc),
            ("property", "og:image", og_img), ("name", "twitter:card", "summary_large_image"),
            ("name", "twitter:title", html.unescape(get_meta(head, "property", "og:title")) and get_meta(head, "property", "og:title") or title),
            ("name", "twitter:description", get_meta(head, "property", "og:description") or desc),
            ("name", "twitter:image", og_img)]
    for attr, key, val in want:
        if val and not has_meta(head, attr, key):
            add.append(f'<meta {attr}="{key}" content="{val}">')  # values already HTML-escaped in source
    lds = " ".join(re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', BLOCK_RE.sub("", head), re.S))
    s = BLOCK_RE.sub("", s)
    if not re.search(r'"publisher"|"@type":\s*"Organization"', lds):
        page = {"@type": "WebPage", "@id": f"{url}#webpage", "url": url, "name": html.unescape(title),
                "isPartOf": {"@type": "WebSite", "@id": f"{BASE}/#website", "name": "Digital Underground", "url": f"{BASE}/",
                             "publisher": {"@id": f"{BASE}/#org"}},
                "publisher": {"@id": f"{BASE}/#org"}}
        if desc:
            page["description"] = html.unescape(desc)
        js = json.dumps({"@context": "https://schema.org", "@graph": [ORG, page]}, ensure_ascii=False,
                        separators=(",", ":")).replace("</", "<\\/")
        add.append(f'<script type="application/ld+json" id="du-org-ld">{js}</script>')
    if add:
        s = s.replace("</head>", "\n".join(add) + "\n</head>", 1)
    if s != f.read_text(encoding="utf-8"):
        f.write_text(s, encoding="utf-8")
        return True
    return False


def main():
    """Pages = the static URLs in sitemap.xml (the public, indexable set) plus every /p/ page."""
    n = 0
    paths = {u.replace(BASE, "") for u in re.findall(r"<loc>([^<?]+)</loc>", (ROOT / "sitemap.xml").read_text())}
    paths |= {f"/p/{d.name}/" for d in (ROOT / "p").iterdir() if (d / "index.html").is_file()}
    for url_path in sorted(paths):
        if url_path in SKIP_PATHS or url_path.startswith(("/community/p/", "/community/dashboard")):
            continue  # /community/p/ meta is injected per listing by functions/community/p/index.js
        f = ROOT / url_path.strip("/") / "index.html" if url_path != "/" else ROOT / "index.html"
        if f.is_file():
            n += process(f, url_path)
    print(f"seo-meta: updated {n} pages")


if __name__ == "__main__":
    sys.exit(main())
