#!/usr/bin/env python3
"""Generate /blog/ (index + posts) as static HTML. Edit POSTS, run, commit. Styling: /community/wolf.css + /blog/blog.css."""
import html, json, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
O = "https://digitalundergroundstore.com"
IMG = O + "/community/og-dm-v3.jpg"
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
<p>Every new listing goes through automatic checks for spam, scams and unsafe content. A maker's first listing then gets a human review, usually within a few hours; later listings from approved makers go live automatically once they pass the checks. Visitors can report a listing, and reported listings are hidden until we look at them. Edits to a live listing are screened again. The goal is a marketplace people can trust when they click through.</p>
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
<li>Open the <a href="/community/submit/">submission form</a>.</li>
<li>Enter the project name, link, your maker or studio name and your email. Choose a password: this becomes your login for the creator dashboard.</li>
<li>Pick a category and a stage. Be honest about the stage; "Beta / testing" is fine and helps you find early users.</li>
<li>Optionally add a status label (up to 24 characters), for example "Needs testers" or "v1.5".</li>
<li>Write a short pitch (up to 280 characters) and a longer description (up to 4,000).</li>
<li>Add up to 6 tags, your cover image and, if you have one, a video. Accept the listing terms and submit.</li>
</ol>
<h2>Write a pitch that earns the click</h2>
<ul><li>Lead with what it does for the person, not the tech stack: "Plan a week of meals in five minutes" beats "React meal planner".</li><li>Say who it's for and what it costs ("Free", "Pay once €19", "Free plan, Pro €9/mo").</li><li>Keep the price label short and true. Visitors see it on the card.</li></ul>
<h2>Review</h2>
<p>New listings are checked automatically and then approved by a person before they appear. If something needs fixing, you'll see the reason in your dashboard.</p>
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

def shell(title, desc, canonical, body, jsonld, ogtype="article"):
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
<meta property="og:image" content="{IMG}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{IMG}">
<meta name="theme-color" content="#05040c">
<link rel="stylesheet" href="/assets/design-tokens.css">
<link rel="stylesheet" href="/community/wolf.css?v=6">
<link rel="stylesheet" href="/blog/blog.css?v=1">
<script src="/community/nav.js?v=1" defer></script>
<link rel="icon" type="image/svg+xml" href="/assets/logo/favicon.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/logo/favicon-180.png">
<script type="application/ld+json">{json.dumps(jsonld).replace("</", "<\\/")}</script>
</head>
<body class="blog">
<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <div class="mx nav-in">
    <a class="du-logo" href="/store/" aria-label="Digital Underground store home"><img class="du-logo-full" src="/assets/logo/du-horizontal.svg" alt="" width="189" height="34"><img class="du-logo-icon" src="/assets/logo/du-mark-anim-icon.svg" alt="" width="34" height="34"></a>
    <nav class="nav-links" aria-label="Site"><a href="/store/">Store</a><a href="/">Developer Marketplace</a><a href="/makers/">Creators</a><a href="/league/">League</a><a href="/blog/" aria-current="page">Blog</a></nav>
    <div class="nav-right">
      <div class="nav-ctas"><a class="pill pill-v" href="/community/submit/">List your project free</a></div>
      <button type="button" id="menu-btn" class="icon-btn menu-btn" aria-label="Open menu" aria-controls="mobile-menu" aria-expanded="false"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg></button>
    </div>
  </div>
</header>
<div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" hidden>
  <div class="mm-head"><button type="button" id="close-menu" class="icon-btn" aria-label="Close menu"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
  <nav class="mm-links" aria-label="Mobile"><a href="/store/">Store</a><a href="/">Developer Marketplace</a><a href="/makers/">Creators</a><a href="/league/">League</a><a href="/blog/" aria-current="page">Blog</a><hr><a class="pill pill-v" href="/community/submit/">List your project free</a></nav>
</div>
<div id="overlay" hidden></div>
<main id="main" tabindex="-1" class="mx z">
{body}
</main>
<footer class="z site-foot"><div class="mx">
<p><a href="/store/">DU store</a> · <a href="/">Developer Marketplace</a> · <a href="/makers/">Creators</a> · <a href="/league/">League</a> · <a href="/blog/">Blog</a></p>
<p><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p>
</div></footer>
</body>
</html>
"""

PUB = {"@type": "Organization", "name": "Digital Underground", "url": O + "/", "logo": {"@type": "ImageObject", "url": O + "/assets/logo/favicon-180.png"}}
(R / "blog").mkdir(exist_ok=True)
for p in POSTS:
    url = f"{O}/blog/{p['slug']}/"
    ld = {"@context": "https://schema.org", "@type": "Article", "headline": p["title"], "description": p["desc"], "image": IMG,
          "datePublished": p["date"], "dateModified": p["date"], "author": PUB, "publisher": PUB, "mainEntityOfPage": url}
    body = (f'<nav class="crumbs" aria-label="Breadcrumb"><a href="/blog/">Blog</a> <span aria-hidden="true">/</span></nav>'
            f'<article class="post"><h1>{e(p["title"])}</h1><p class="meta"><time datetime="{p["date"]}">October 20, 2026</time> · Digital Underground</p>{p["body"]}</article>'
            '<aside class="more" aria-labelledby="more-t"><h2 id="more-t">More from the blog</h2><ul>'
            + "".join(f'<li><a href="/blog/{q["slug"]}/">{e(q["title"])}</a></li>' for q in POSTS if q is not p) + "</ul></aside>")
    d = R / "blog" / p["slug"]; d.mkdir(exist_ok=True)
    (d / "index.html").write_text(shell(p["title"] + " | Digital Underground", p["desc"], url, body, ld))
items = "".join(f'<li class="bcard"><h2><a href="/blog/{p["slug"]}/">{e(p["title"])}</a></h2><p>{e(p["desc"])}</p><p class="meta"><time datetime="{p["date"]}">October 20, 2026</time></p></li>' for p in POSTS)
ld = {"@context": "https://schema.org", "@type": "Blog", "name": "Digital Underground Blog", "url": O + "/blog/", "publisher": PUB,
      "blogPost": [{"@type": "BlogPosting", "headline": p["title"], "url": f"{O}/blog/{p['slug']}/", "datePublished": p["date"]} for p in POSTS]}
(R / "blog/index.html").write_text(shell("Blog | Digital Underground", "Guides for makers and buyers: how the Developer Marketplace works, how to list your product, and how to get the most from your creator page.",
    O + "/blog/", '<div class="hero"><h1>Blog</h1><p class="lede">Guides for makers listing on the Developer Marketplace, and for anyone browsing it.</p></div><ul class="blist">' + items + "</ul>", ld, "website"))
print(len(POSTS), "posts")
