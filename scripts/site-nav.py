#!/usr/bin/env python3
"""Inject the shared DU site header (assets/site-nav) into static pages. Idempotent.
Usage: python3 scripts/site-nav.py FILE...   (re-run after gen-landing.py / generate-product-share-pages.py)"""
import re, sys
V = "2"
LINKS = [("/store/", "Store"), ("/", "Developer Marketplace"), ("/makers/", "Creators"), ("/blog/", "Blog")]
MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'
def header(cur=""):
    l = "".join(f'<a href="{h}"{" aria-current=\"page\"" if h == cur else ""}>{t}</a>' for h, t in LINKS)
    return ('<!--du-site-nav--><header class="dun"><div class="dun-in"><a class="dun-logo" href="/store/" aria-label="Digital Underground store home"><img class="dun-full" src="/assets/logo/du-horizontal.svg" alt="Digital Underground" width="189" height="34"><img class="dun-mark" src="/assets/logo/du-mark.svg" alt="" width="32" height="32"></a><nav class="dun-links" aria-label="Primary"><a href="/">Marketplace</a><a href="/league/">League</a></nav><div class="dun-right"><a class="dun-cta" href="/community/submit/">List your project free</a><div class="dun-acct" id="dunAcct"><a class="dun-signin" href="/community/dashboard/">Sign in</a></div><button type="button" class="dun-menu" id="dunMenu" aria-label="Open menu" aria-controls="dunDrawer" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div></div><nav class="dun-drawer" id="dunDrawer" aria-label="Site menu"><a href="/">Marketplace</a><a href="/league/">League</a><a href="/makers/">Creators</a><a href="/blog/">Blog</a><button type="button" class="dun-share-btn" data-dun-share>Share this page</button></nav></header><script src="/assets/site-nav/site-nav.js?v=5" defer></script><!--/du-site-nav-->')
CSS = f'<link rel="stylesheet" href="/assets/site-nav/site-nav.css?v={V}">'
def apply(h, path=""):
    h = re.sub(r'<!--du-site-nav-->.*?<!--/du-site-nav-->', '', h, flags=re.S)
    h = re.sub(r'<link rel="stylesheet" href="/assets/site-nav/site-nav\.css[^"]*">\n?', '', h)
    h = re.sub(r'\s*<header class="top">\s*<a class="brand" href="/store/">Digital Underground</a>\s*</header>', '', h)  # old text-only brand on /p/*
    h = h.replace('<link rel="stylesheet" href="/assets/site-nav/site-nav.css?v=10">
</head>', CSS + '\n</head>', 1)
    h = re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + header(path), h, count=1)
    return h
if __name__ == "__main__":
    for f in sys.argv[1:]:
        s = open(f, encoding="utf8").read(); n = apply(s)
        if n != s: open(f, "w", encoding="utf8").write(n); print("nav:", f)
