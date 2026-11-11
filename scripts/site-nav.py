#!/usr/bin/env python3
"""Single source of the shared Digital Underground site header and footer.

  header: between <!--du-site-nav--> ... <!--/du-site-nav-->   (behaviour: /assets/site-nav/site-nav.js)
  footer: between <!--du-site-foot--> ... <!--/du-site-foot--> (styles: /assets/site-nav/site-nav.css)

apply(html) is idempotent: it (re)writes both blocks, converts a page's legacy footer(s) into the shared
footer (credits / "Featured on" badges / store owner slot are kept in <div class="duf-notes"> just above it),
and sets the versioned CSS/JS includes. Used by gen-landing.py, generate-product-share-pages.py and
apply-site-nav.py (which stamps every existing page + generator template). Bump CSS_V / JS_V on edits."""
import re

CSS_V, JS_V = "42", "43"
THEME_V = "2"  # /assets/theme-clean.css: clean theme (Oct 23 2026), always the last stylesheet
LINKS = [("/", "Marketplace"), ("/league/", "League"), ("/makers/", "Creators")]
MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'
_L = "".join(f'<a href="{h}">{t}</a>' for h, t in LINKS)
NAV = ('<!--du-site-nav--><header class="dun"><div class="dun-in">'
  '<a class="dun-logo" href="/" aria-label="Digital Underground home"><img class="dun-full" src="/assets/logo/du-horizontal.svg" alt="Digital Underground" width="189" height="34"></a>'
  f'<nav class="dun-links" aria-label="Primary">{_L}</nav>'
  '<div class="dun-right"><a class="dun-mp" href="/store/p/maker-pro/">Maker Pro</a>'
  '<div class="dun-acct" id="dunAcct"><button type="button" class="dun-acct-btn dun-menu-btn" id="dunAcctBtn" aria-label="Open menu" aria-controls="dunDrawer" aria-expanded="false" aria-haspopup="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div>'
  '</div></div>'
  f'<nav class="dun-drawer" id="dunDrawer" aria-label="Site menu">'
  '<div class="dun-drawer-acct" id="dunDrawerAcct" role="group" aria-label="Account">'
  '<div class="dun-drawer-who"><span class="av mark" aria-hidden="true"><img src="/assets/logo/du-mark-white.svg" alt="" width="36" height="36"></span><span class="nm">Account</span></div>'
  '<a href="/community/dashboard/">Sign in</a></div>'
  f'{_L}<a href="/community/submit/">List your project free</a><a href="/store/p/maker-pro/">Maker Pro</a><button type="button" class="dun-share-btn" data-dun-share>Share this page</button></nav>'
  f'</header><script src="/assets/site-nav/site-nav.js?v={JS_V}" defer></script><!--/du-site-nav-->')

XSVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-7.5 8.6L23.3 22h-6.9l-5.4-7-6.2 7H1.7l8-9.2L1.2 2h7l4.9 6.4zm-1.2 18h1.9L7.4 3.9H5.4z"/></svg>'
CONTACT = "mailto:digitalunderground.store@proton.me"
COLS = [
  ("Marketplace", [("/#projects", "Browse projects"), ("/league/", "Maker League"), ("/makers/", "Creators"), ("/community/submit/", "List your project free"), ("/store/p/maker-pro/", "Maker Pro"), ("/community/dashboard/", "Creator dashboard")]),
  ("Resources", [("/blog/", "Blog"), ("/community/api/", "Developer API"), ("/support/", "Support"), ("share", "")]),
  ("Company", [("/about/", "About"), ("/store/", "Digital Underground store"), (CONTACT, "Contact us"), ("https://x.com/DigitalUG_Store", "Follow @DigitalUG_Store")]),
]
def _li(h, t):
    if h == "share": return '<li><button type="button" data-duf-share>Share this page</button></li>'
    ext = ' rel="noopener" target="_blank"' if h.startswith("http") else ""
    return f'<li><a href="{h}"{ext}>{t}</a></li>'
_C = "".join(f'<div class="duf-col"><h3>{h}</h3><ul>{"".join(_li(*i) for i in items)}</ul></div>' for h, items in COLS)
FOOT = ('<!--du-site-foot--><footer class="duf"><div class="duf-in"><div class="duf-brand">'
  '<a href="/" class="duf-logo" aria-label="Digital Underground home"><img src="/assets/logo/du-horizontal.svg" alt="Digital Underground" width="260" height="47" loading="lazy"></a>'
  '<p class="duf-tag">A free developer marketplace and store for independent makers. Zero cut, your checkout.</p>'
  '<form class="duf-nl" novalidate><div class="duf-book"><a href="/free-planetview/"><img src="/assets/gift/planetview-cover.webp?v=hd1" alt="PlanetView Live cover" width="220" height="124" loading="lazy" decoding="async"></a><div><h3 class="duf-bk-h">Get PlanetView Live free</h3><p class="duf-bk-t"><a href="/free-planetview/">PlanetView Live: 3D Earth &amp; flight sim</a> · In live beta (testing)</p><p class="duf-bk-s">Free for a limited time with email signup. Independent project, not affiliated with SpaceX or NASA.</p></div></div><label for="dufEmail">Your email</label><div class="duf-row"><input id="dufEmail" type="email" name="email" placeholder="you@example.com" autocomplete="email" required><button type="submit">Get PlanetView free</button></div>'
  '<input type="text" name="website" tabindex="-1" autocomplete="off" class="duf-hp" aria-hidden="true">'
  '<label class="duf-ck"><input type="checkbox" name="consent"> Yes, email me new apps, updates and occasional offers from Digital Underground. I can unsubscribe at any time.</label>'
  '<p class="duf-msg" role="status" aria-live="polite"></p><p class="duf-priv">We only use your email for this list, never sell it, and every email has an unsubscribe link. <a href="/privacy/">Privacy policy</a>.</p></form>'
  f'<div class="duf-social"><a href="https://x.com/DigitalUG_Store" rel="noopener" target="_blank" aria-label="Digital Underground on X">{XSVG}</a></div></div>'
  f'<div class="duf-cols">{_C}</div></div>'
  f'<div class="duf-bar"><p>© <span class="duf-year">2026</span> Digital Underground</p><p class="duf-legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="{CONTACT}">Contact</a><a href="https://donate.stripe.com/bJe5kFdy42WJdkOgd40ZW00" target="_blank" rel="noopener">Tip us ☕</a></p></div>'
  '<div class="duf-badges" role="group" aria-label="Featured on"><a href="https://startupfa.me/s/digital-underground?utm_source=digitalundergroundstore.com" target="_blank" rel="noopener"><img src="https://startupfa.me/badge?t=classic&amp;theme=dark" alt="Digital Underground - Featured on Startup Fame" width="171" height="54" loading="lazy" decoding="async"></a><a href="https://peerpush.com/p/digital-underground" target="_blank" rel="noopener"><img src="https://peerpush.com/p/digital-underground/badge.png" alt="Digital Underground on PeerPush" width="230" height="65" loading="lazy" decoding="async"></a><a href="https://www.launchme.me/products/Digital%20Underground" target="_blank" rel="noopener noreferrer"><img src="https://www.launchme.me/api/badge/Digital%20Underground?theme=dark" alt="Featured on MemeLaunch" width="230" height="54" loading="lazy" decoding="async"></a><a href="https://twelve.tools" target="_blank" rel="noopener"><img src="https://twelve.tools/badge2-dark.svg" alt="Featured on Twelve Tools" width="148" height="40" loading="lazy" decoding="async"></a></div><style>.duf-badges{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:12px;margin:0 auto;padding:0 16px 20px;max-width:1200px}.duf-badges a{display:inline-flex;align-items:center;border-radius:10px}.duf-badges a:hover,.duf-badges a:focus-visible{opacity:1}.duf-badges a:focus-visible{outline:2px solid #9a97e8;outline-offset:3px}.duf-badges img{height:36px;width:auto;max-width:100%;display:block}</style>'
  '</footer><!--/du-site-foot-->')

CSS = (f'<link rel="stylesheet" href="/assets/site-nav/site-nav.css?v={CSS_V}">\n'
       f'<link rel="stylesheet" href="/assets/theme-clean.css?v={THEME_V}">')
NAVRE = re.compile(r"<!--du-site-nav-->.*?<!--/du-site-nav-->", re.S)
FOOTRE = re.compile(r"\s*<!--du-site-foot-->.*?<!--/du-site-foot-->", re.S)
JSRE = re.compile(r'\s*<script src="/assets/site-nav/site-nav\.js(\?v=\d+)?" defer></script>')
CSSRE = re.compile(r'<link rel="stylesheet" href="/assets/(?:site-nav/site-nav|theme-clean)\.css(\?v=\d+)?">\n?')
OLDFOOT = re.compile(r'[ \t]*<footer\b(?![^>]*class="duf")[^>]*>(.*?)</footer>[ \t]*', re.S)
KEEP = [re.compile(p, re.S) for p in (
  r'<p class="(?:credits|music-credit)"[^>]*>.*?</p>',
  r'<div class="du-badges".*?</div>(?:<style>\.du-badges.*?</style>)?',
  r'<span id="sxOwner"></span>')]

def _notes(inner):
    keep = []
    for rx in KEEP: keep += rx.findall(inner)
    m = re.search(r'<p class="footer-copy">\s*(.*?)\s*</p>', inner, re.S)
    if m and m.group(1).strip(): keep.insert(0, '<p class="credits">' + m.group(1).strip() + '</p>')
    return keep

def apply(s, header=True):
    """Return s with exactly one shared header (if header=True) and one shared footer."""
    if header:
        if NAVRE.search(s): s = NAVRE.sub(lambda m: NAV, s, count=1)
        else: s = re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + "\n" + NAV, s, count=1)
    s = JSRE.sub("", s)                       # site-nav.js only inside the header block
    s = NAVRE.sub(lambda m: NAV, s, count=1)
    s = CSSRE.sub("", s); s = s.replace("</head>", CSS + "\n</head>", 1)
    s = re.sub(r'\s*<header class="top">\s*<a class="brand" href="/store/">Digital Underground</a>\s*</header>', '', s)  # old text-only brand on /p/*
    s = FOOTRE.sub("", s)
    def conv(m):
        k = _notes(m.group(1))
        return ('<div class="duf-notes">' + "".join(k) + "</div>") if k else ""
    s = OLDFOOT.sub(conv, s)
    j = s.find("<!--/du-site-nav-->")  # the </body> of the page that holds the header (templates may hold other docs)
    i = s.find("</body>", j) if j >= 0 else s.rfind("</body>")
    s = (s[:i].rstrip("\n") + "\n" + FOOT + "\n" + s[i:]) if i >= 0 else s + FOOT
    return s

if __name__ == "__main__":
    import sys
    for f in sys.argv[1:]:
        s = open(f, encoding="utf8").read(); n = apply(s)
        if n != s: open(f, "w", encoding="utf8").write(n); print("site chrome:", f)
