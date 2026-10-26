#!/usr/bin/env python3
"""Generate /blog/ (index + posts) as static HTML. Edit POSTS, run, commit. Styling: /community/wolf.css + /blog/blog.css."""
import html, json, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
O = "https://digitalundergroundstore.com"
IMG = O + "/community/og-dm-v3.jpg"
import re
hero = lambda p: f"/blog/media/{p['slug']}.webp"
mins = lambda p: max(1, round(len(re.sub(r"<[^>]+>", " ", p["body"]).split()) / 220))
import datetime
DATE = lambda p: datetime.date.fromisoformat(p["date"]).strftime("%B %-d, %Y")
AUTH = "Digital Underground"
e = lambda s: html.escape(s, quote=True)

POSTS = [
dict(slug="what-is-the-developer-marketplace", date="2026-10-20",
 title="What is the Digital Underground Developer Marketplace?",
 desc="A free place for independent makers to list apps, AI tools, games, books and templates. Buyers check out on the maker's own site; we take no cut.",
 body="""
<p>The <a href="/">Developer Marketplace</a> is a free directory of products made by independent developers and small studios: apps, AI tools, games, books, templates and more. It sits next to the Digital Underground store, but it works differently.</p>
<h2>Free to list, no cut of sales</h2>
<p>Listing is free. There is no listing fee and no commission. Every listing has a <strong>Visit</strong> button that sends people straight to the maker's own site, Gumroad, Stripe checkout or app store page. When we can, the link carries <code>?ref=digitalunderground</code> so makers can see the traffic in their own analytics. Digital Underground does not process payments or payouts for marketplace listings.</p>
<h2>What gets listed</h2>
<p>Anything a maker built and can link to over https: released products, betas, and projects still in development. Each listing shows a stage (Concept, In development, Beta / testing, Released or Discontinued) so visitors know what they are getting. Makers can also add a short status label such as "Needs testers".</p>
<p>Alongside maker submissions we include a small set of curated open-source picks, clearly marked "Featured pick", so the marketplace is useful from day one.</p>
<h2>How listings are reviewed</h2>
<p>Every new listing goes through automatic checks for spam, scams and unsafe content, and goes live as soon as it passes. Anything the checks flag waits for a short human review. Visitors can report a listing, and reported listings are hidden until we look at them. Edits to a live listing are screened again. The goal is a marketplace people can trust when they click through.</p>
<h2>Creator pages</h2>
<p>Each maker gets a public page at <code>/makers/&lt;name&gt;/</code> with their logo, a short bio, links and all their listings in one grid. Browse them on the <a href="/makers/">Creators</a> page.</p>
<h2>Who it's for</h2>
<ul><li><strong>Makers</strong> who want another place to be found, without giving up their own checkout.</li><li><strong>Visitors</strong> looking for focused, independent tools instead of the usual big-platform results.</li></ul>
<p><a class="pill pill-v" href="/">Browse the marketplace</a> <a class="pill pill-o" href="/community/submit/">List your project free</a></p>
"""),
dict(slug="how-to-list-your-product", date="2026-10-20",
 title="How to list your app, tool or game on the Developer Marketplace (free)",
 desc="Step-by-step: what you need, how to write a listing that gets clicks, image and video tips, review, and how to edit and track your listing afterwards.",
 body="""
<p>Listing on the <a href="/">Developer Marketplace</a> is free and takes a few minutes. Here is what you need and how to make the listing work for you.</p>
<h2>Before you start</h2>
<ul><li>A public <strong>https</strong> link to your product (your site, Gumroad, an app store page, itch.io, GitHub releases).</li><li>A cover image (JPEG, PNG, WebP or GIF). Uploads must be under about 200 KB; a 16:9 image looks best on the cards. You can also paste an https image link instead.</li><li>Optional: a short video (YouTube, Vimeo, or an uploaded clip).</li></ul>
<h2>Step by step</h2>
<ol>
<li>Open the <a href="/community/submit/">submission form</a> and paste your project link into the box at the top: the name, short pitch, image and link fill in for you, and you can edit all of them.</li>
<li>Enter the project name, link, your maker or studio name and your email. Choose a password: this becomes your login for the creator dashboard.</li>
<li>Pick a category and a stage. Be honest about the stage; "Beta / testing" is fine and helps you find early users.</li>
<li>Optionally add a status label (up to 24 characters), for example "Needs testers" or "v1.5".</li>
<li>Write a short pitch (up to 280 characters) and a longer description (up to 4,000).</li>
<li>Add up to 6 tags, your cover image and, if you have one, a video. Accept the listing terms and submit.</li>
</ol>
<h2>Write a pitch that earns the click</h2>
<ul><li>Lead with what it does for the person, not the tech stack: "Plan a week of meals in five minutes" beats "React meal planner".</li><li>Say who it's for and what it costs ("Free", "Pay once €19", "Free plan, Pro €9/mo").</li><li>Keep the price label short and true. Visitors see it on the card.</li></ul>
<h2>Review</h2>
<p>New listings are checked automatically and go live as soon as they pass, usually within minutes. If the checks flag something, it waits for a short human review and you'll see the reason in your dashboard.</p>
<h2>After you're live</h2>
<p>Sign in to the <a href="/community/dashboard/">creator dashboard</a> to edit your listing, unpublish or delete it, and see the last 30 days of views, clicks and click-through rate. You can also fill in your public creator page (logo, banner, bio and links). Changes to it are reviewed before they go live.</p>
<p><a class="pill pill-v" href="/community/submit/">List your project free</a></p>
"""),
dict(slug="creator-pages", date="2026-10-20",
 title="Creator pages: all your products in one place",
 desc="Every maker on the Developer Marketplace gets a public page with a logo, banner, bio, links and a grid of all their listings. Here's how to set yours up.",
 body="""
<p>If you have more than one product, visitors who like one of them usually want to see the rest. Creator pages make that one click.</p>
<h2>What's on a creator page</h2>
<ul><li>Your logo and a wide banner.</li><li>A short bio (plain text, up to 400 characters).</li><li>Your website and social links (X, GitHub, YouTube, LinkedIn, Instagram, Mastodon, Bluesky, Discord).</li><li>Every live listing you have on the marketplace, in the same card layout as the main page.</li></ul>
<p>Your name on each of your listing cards links to the page, and the <a href="/makers/">Creators</a> directory lists every maker. See <a href="/makers/wolfitway/">Wolfitway</a> for an example.</p>
<h2>Set yours up</h2>
<ol><li>Sign in to the <a href="/community/dashboard/">creator dashboard</a>.</li><li>Open <strong>Your maker page</strong>, add your name, bio and links (https only), and upload a logo and banner.</li><li>Submit for review. Your page shows the last approved version until the change is approved.</li></ol>
<h2>Tips</h2>
<ul><li>Use the bio to say what you build and for whom, in one or two sentences.</li><li>A square logo and a 3:1 banner crop cleanly on phones.</li><li>Link the page from your own site and socials so people can find all your work.</li></ul>
<p><a class="pill pill-v" href="/makers/">Browse creators</a></p>
"""),
]

import sys; sys.path.insert(0, str(R / "scripts"))
from blog_posts_oct22 import NEW_POSTS
POSTS = NEW_POSTS + POSTS

def shell(title, desc, canonical, body, jsonld, ogtype="article", img=None):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{canonical}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:type" content="{ogtype}">
<meta property="og:url" content="{canonical}">
<meta property="og:site_name" content="Digital Underground">
<meta property="og:image" content="{img or IMG}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{img or IMG}">
<meta name="theme-color" content="#11141a">
<link rel="stylesheet" href="/assets/design-tokens.css?v=3">
<link rel="stylesheet" href="/community/wolf.css?v=8">
<link rel="stylesheet" href="/blog/blog.css?v=3">
<link rel="stylesheet" href="/blog/blog-v2.css?v=3">
<link rel="stylesheet" href="/blog/blog-v3.css?v=2">
<script src="/community/nav.js?v=1" defer></script>
<link rel="icon" type="image/svg+xml" href="/assets/logo/favicon.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/logo/favicon-180.png">
<script type="application/ld+json">{json.dumps(jsonld).replace("</", "<\\/")}</script>
<link rel="stylesheet" href="/assets/site-nav/site-nav.css?v=16">
<link rel="stylesheet" href="/assets/theme-clean.css?v=2">
</head>
<body class="blog b2">
<a class="skip" href="#main">Skip to content</a>
<!--du-site-nav--><header class="dun"><div class="dun-in"><a class="dun-logo" href="/" aria-label="Digital Underground home"><img class="dun-full" src="/assets/logo/du-horizontal.svg" alt="Digital Underground" width="189" height="34"><img class="dun-mark" src="/assets/logo/du-mark.svg" alt="" width="32" height="32"></a><nav class="dun-links" aria-label="Primary"><a href="/">Marketplace</a><a href="/league/">League</a><a href="/makers/">Creators</a><a href="/blog/">Blog</a></nav><div class="dun-right"><a class="dun-cta" href="/community/submit/">List your project free</a><div class="dun-acct" id="dunAcct"><a class="dun-signin" href="/community/dashboard/">Sign in</a></div><button type="button" class="dun-menu" id="dunMenu" aria-label="Open menu" aria-controls="dunDrawer" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div></div><nav class="dun-drawer" id="dunDrawer" aria-label="Site menu"><a href="/">Marketplace</a><a href="/league/">League</a><a href="/makers/">Creators</a><a href="/blog/">Blog</a><button type="button" class="dun-share-btn" data-dun-share>Share this page</button></nav></header><script src="/assets/site-nav/site-nav.js?v=10" defer></script><!--/du-site-nav-->
<main id="main" tabindex="-1" class="mx z">
{body}
</main>
<!--du-site-foot--><footer class="duf"><div class="duf-in"><div class="duf-brand"><a href="/" class="duf-logo" aria-label="Digital Underground home"><img src="/assets/logo/du-horizontal.svg" alt="Digital Underground" width="260" height="47" loading="lazy"></a><p class="duf-tag">A free developer marketplace and store for independent makers. Zero cut, your checkout.</p><form class="duf-nl" novalidate><div class="duf-book"><a href="/free-book/"><img src="/assets/gift/humanity-x-off-the-ground-cover.webp" alt="Humanity X: Off the Ground cover" width="56" height="90" loading="lazy" decoding="async"></a><div><h3 class="duf-bk-h">Get the free book</h3><p class="duf-bk-t"><a href="/free-book/">Humanity X: Off the Ground</a></p><p class="duf-bk-s">Book 1 of the Humanity X Trilogy. Join the email list and download the full novel right away in PDF, EPUB and Word.</p></div></div><label for="dufEmail">Your email</label><div class="duf-row"><input id="dufEmail" type="email" name="email" placeholder="you@example.com" autocomplete="email" required><button type="submit">Get the book</button></div><input type="text" name="website" tabindex="-1" autocomplete="off" class="duf-hp" aria-hidden="true"><label class="duf-ck"><input type="checkbox" name="consent"> Yes, email me new apps, updates and occasional offers from Digital Underground. I can unsubscribe at any time.</label><p class="duf-msg" role="status" aria-live="polite"></p><p class="duf-priv">We only use your email for this list, never sell it, and every email has an unsubscribe link. <a href="/privacy/">Privacy policy</a>.</p></form><div class="duf-social"><a href="https://x.com/DigitalUG_Store" rel="noopener" target="_blank" aria-label="Digital Underground on X"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-7.5 8.6L23.3 22h-6.9l-5.4-7-6.2 7H1.7l8-9.2L1.2 2h7l4.9 6.4zm-1.2 18h1.9L7.4 3.9H5.4z"/></svg></a></div></div><div class="duf-cols"><div class="duf-col"><h3>Marketplace</h3><ul><li><a href="/#projects">Browse projects</a></li><li><a href="/league/">Maker League</a></li><li><a href="/makers/">Creators</a></li><li><a href="/community/submit/">List your project free</a></li><li><a href="/community/dashboard/">Creator dashboard</a></li></ul></div><div class="duf-col"><h3>Resources</h3><ul><li><a href="/blog/">Blog</a></li><li><a href="/community/api/">Developer API</a></li><li><a href="/support/">Support</a></li><li><button type="button" data-duf-share>Share this page</button></li></ul></div><div class="duf-col"><h3>Company</h3><ul><li><a href="/about/">About</a></li><li><a href="/store/">Digital Underground store</a></li><li><a href="mailto:digitalunderground.store@proton.me">Contact us</a></li><li><a href="https://x.com/DigitalUG_Store" rel="noopener" target="_blank">Follow @DigitalUG_Store</a></li></ul></div></div></div><div class="duf-bar"><p>© <span class="duf-year">2026</span> Digital Underground</p><p class="duf-legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="mailto:digitalunderground.store@proton.me">Contact</a></p></div></footer><!--/du-site-foot-->
</body>
</html>
"""

def card(q, kind):
    cls = {"feat": "b2-card b2-feat", "sm": "b2-card b2-sm", "": "b2-card"}[kind]
    return (f'<li class="{cls}"><a class="b2-img" href="/blog/{q["slug"]}/" tabindex="-1" aria-hidden="true"><img src="{hero(q)}" alt="" width="1600" height="900" loading="{"eager" if kind == "feat" else "lazy"}"></a>'
            f'<div class="b2-txt">{"<p class=b2-kicker>Featured</p>" if kind == "feat" else ""}<h2><a href="/blog/{q["slug"]}/">{e(q["title"])}</a></h2>'
            + ("" if kind == "sm" else f'<p class="b2-ex">{e(q["desc"])}</p>')
            + f'<p class="b2-meta"><span>{AUTH}</span><span><time datetime="{q["date"]}">{DATE(q)}</time> · {mins(q)} min read</span></p></div></li>')

PUB = {"@type": "Organization", "name": "Digital Underground", "url": O + "/", "logo": {"@type": "ImageObject", "url": O + "/assets/logo/favicon-180.png"}}
(R / "blog").mkdir(exist_ok=True)
for p in POSTS:
    url = f"{O}/blog/{p['slug']}/"
    ld = {"@context": "https://schema.org", "@type": "Article", "headline": p["title"], "description": p["desc"], "image": O + hero(p),
          "datePublished": p["date"], "dateModified": p["date"], "author": PUB, "publisher": PUB, "mainEntityOfPage": url}
    meta = f'<p class="b2-meta"><span class="b2-by"><img src="/assets/logo/favicon-180.png" alt="" width="28" height="28">{AUTH}</span><span><time datetime="{p["date"]}">{DATE(p)}</time> · {mins(p)} min read</span></p>'
    rel = "".join(card(q, "sm") for q in [q for q in POSTS if q is not p][:3])
    body = (f'<nav class="crumbs" aria-label="Breadcrumb"><a href="/blog/">Blog</a> <span aria-hidden="true">/</span></nav>'
            f'<article class="post b2-post"><header class="b2-head"><h1>{e(p["title"])}</h1>{meta}</header>'
            f'<figure class="b2-hero"><img src="{hero(p)}" alt="" width="1600" height="900" fetchpriority="high"></figure>'
            f'<div class="b2-body">{p["body"]}</div></article>'
            '<section class="b2-cta"><div><h2>List your project free</h2><p>Paste your link, check the details we fill in, and go live after a quick automatic check. No fees, no cut of sales.</p><p class="b2-shop" style="margin-top:8px;font-size:.95em">Or see what we sell: <a href="/store/">shop tools &amp; books</a> · <a href="/free-book/">get the free sci-fi novel</a></p></div><a class="pill pill-v" href="/community/submit/">List your project free</a></section>'
            f'<aside class="b2-related" aria-labelledby="more-t"><h2 id="more-t">More from the blog</h2><ul class="b2-grid">{rel}</ul></aside>')
    d = R / "blog" / p["slug"]; d.mkdir(exist_ok=True)
    (d / "index.html").write_text(shell(p["title"] + " | Digital Underground", p["desc"], url, body, ld, img=O + hero(p)))
BADGE = '<span class="bw-brand"><img src="/assets/logo/du-mark.svg" alt="" width="18" height="18">Digital Underground</span>'
def wmeta(q):
    return f'<p class="bw-meta">{AUTH} · <time datetime="{q["date"]}">{DATE(q)}</time> · {mins(q)} min read</p>'
def wimg(q):
    return hero(q)  # Wolf asked to use Donald's original cover photos
def wfeat(q):
    short = q["title"].split(" (")[0]
    return (f'<a class="bw-feat" href="/blog/{q["slug"]}/"><div class="bw-fv"><img src="{wimg(q)}" alt="" width="1600" height="900" loading="eager" fetchpriority="high">'
            f'<span class="bw-ov" aria-hidden="true"></span>{BADGE}{f'<p class="bw-ft" aria-hidden="true">{e(short)}</p>' if wimg(q) != hero(q) else ""}</div>'
            f'<div class="bw-fc"><p class="bw-fl">Featured</p><h2>{e(q["title"])}</h2><p class="bw-ex">{e(q["desc"])}</p>{wmeta(q)}</div></a>')
def wcard(q):
    return (f'<li><a class="bw-card" href="/blog/{q["slug"]}/"><div class="bw-cv"><img src="{wimg(q)}" alt="" width="1600" height="900" loading="lazy">{BADGE}</div>'
            f'<div class="bw-cb"><h3>{e(q["title"])}</h3><p class="bw-ex">{e(q["desc"])}</p>{wmeta(q)}</div></a></li>')
feat = POSTS[0]
items = wfeat(feat) + '<ul class="bw-grid">' + "".join(wcard(q) for q in POSTS[1:]) + "</ul>"
ld = {"@context": "https://schema.org", "@type": "Blog", "name": "Digital Underground Blog", "url": O + "/blog/", "publisher": PUB,
      "blogPost": [{"@type": "BlogPosting", "headline": p["title"], "url": f"{O}/blog/{p['slug']}/", "datePublished": p["date"]} for p in POSTS]}
(R / "blog/index.html").write_text(shell("Blog | Digital Underground", "Guides for makers and buyers: how the Developer Marketplace works, how to list your product, and how to get the most from your creator page.",
    O + "/blog/", '<div class="bw"><p class="bw-eye">Digital Underground Blog</p><h1>Guides for indie makers</h1><p class="bw-lead">How the Developer Marketplace works, how to list your project, and how to get found.</p>' + items + "</div>", ld, "website"))
print(len(POSTS), "posts")
