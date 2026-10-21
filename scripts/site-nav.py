#!/usr/bin/env python3
"""Inject the shared DU site header (assets/site-nav) into static pages. Idempotent.
Usage: python3 scripts/site-nav.py FILE...   (re-run after gen-landing.py / generate-product-share-pages.py)"""
import re, sys
V = "2"
LINKS = [("/store/", "Store"), ("/", "Developer Marketplace"), ("/makers/", "Creators"), ("/blog/", "Blog")]
MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'
def header(cur=""):
    l = "".join(f'<a href="{h}"{" aria-current=\"page\"" if h == cur else ""}>{t}</a>' for h, t in LINKS)
    return ('<!--du-site-nav--><header class="dun"><div class="dun-in">'
            '<a class="dun-logo" href="/store/" aria-label="Digital Underground store home"><img src="/assets/logo/du-horizontal.svg" alt="Digital Underground" width="189" height="34"></a>'
            f'<nav class="dun-links" aria-label="Site">{l}</nav>'
            '<div class="dun-right"><a class="dun-cta" href="/community/submit/">List your project free</a>'
            f'<button type="button" class="dun-menu" id="dunMenu" aria-label="Open menu" aria-controls="dunDrawer" aria-expanded="false">{MENU}</button></div></div>'
            f'<nav class="dun-drawer" id="dunDrawer" aria-label="Site menu">{l}<a href="/community/dashboard/">Creator dashboard</a></nav></header>'
            f'<script src="/assets/site-nav/site-nav.js?v={V}" defer></script><!--/du-site-nav-->')
CSS = f'<link rel="stylesheet" href="/assets/site-nav/site-nav.css?v={V}">'
def apply(h, path=""):
    h = re.sub(r'<!--du-site-nav-->.*?<!--/du-site-nav-->', '', h, flags=re.S)
    h = re.sub(r'<link rel="stylesheet" href="/assets/site-nav/site-nav\.css[^"]*">\n?', '', h)
    h = re.sub(r'\s*<header class="top">\s*<a class="brand" href="/store/">Digital Underground</a>\s*</header>', '', h)  # old text-only brand on /p/*
    h = h.replace('</head>', CSS + '\n</head>', 1)
    h = re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + header(path), h, count=1)
    return h
if __name__ == "__main__":
    for f in sys.argv[1:]:
        s = open(f, encoding="utf8").read(); n = apply(s)
        if n != s: open(f, "w", encoding="utf8").write(n); print("nav:", f)
