// Server-rendered creator pages: /makers/ (directory) and /makers/<slug>/ (profile + all marketplace listings).
// Fully public. Full HTML for crawlers; a tiny inline script adds search. Edge-cached 5 min to keep KV reads low.
import { listingPath } from "../_lib/listing-url.js";
import { getKv, listApproved, listingContactAddress, isRetired } from "../_lib/community.js";
import { accentHex, allLiveProfiles, liveProfile, makerSlugFor, slugify, socialLabel, validSlug } from "../_lib/makers.js";

const ORIGIN = "https://digitalundergroundstore.com";
const GM = /[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}/gi; // never print any email address
const e = (s) => String(s == null ? "" : s).replace(GM, "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const safeHref = (u) => (typeof u === "string" && (/^https:\/\//i.test(u) || /^\/(?!\/)/.test(u)) ? e(u) : "#");
// Per-maker link-preview overrides (og/twitter title, description, 1200x630 image).
const MAKER_OG = {
  "kerzy-labs": {
    title: "Kerzy Labs — Indie Browser Games | Play Free",
    desc: "Rival Lanes, CyberArena 3D, Stack Attack Arena & Quad Pong. Fast, fun games you play right in your browser. No downloads.",
    image: "https://digitalundergroundstore.com/assets/og/kerzy-labs-og.jpg?v=20261023b",
    imageAlt: "Kerzy Labs — indie browser games: Rival Lanes, CyberArena 3D, Stack Attack Arena, Quad Pong",
  },
};
const abs = (u) => (u && u.startsWith("/") ? ORIGIN + u : u);

/** Permanent Maker League trophies (hall of fame). Never remove a finished week. */
const LEAGUE_TROPHIES = {
  "cm_mvfnl9qp_80652919": { week: "2026-10-19", label: "Week 1", title: "Builder Battle Week 1 Winner", makerSlug: "media-renamer-pro" },
};
const trophyFor = (id) => LEAGUE_TROPHIES[id] || null;
const trophyForSlug = (slug) => Object.values(LEAGUE_TROPHIES).find((t) => t.makerSlug === slug) || null;
const TROPHY_SRC = "/assets/badges/maker-league-week1.png?v=crown1";
const TROPHY_SRCSET = "/assets/badges/maker-league-week1.png?v=crown1 1x, /assets/badges/maker-league-week1@2x.png?v=crown1 2x, /assets/badges/maker-league-week1@3x.png?v=crown1 3x";

async function allListings(context, kv) {
  const by = {};
  const [stat, live] = await Promise.all([
    context.env.ASSETS.fetch(new URL("/community/listings.json", context.request.url)).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    kv ? listApproved(kv, context.env).catch(() => []) : [],
  ]);
  for (const x of stat) if ((x.status || "approved") === "approved") by[x.id] = x;
  for (const x of live) by[x.id] = x;
  return Object.values(by).filter((r) => !isRetired(r)).map((r) => {
    if (/kerzy/i.test(r.makerName || "") || (r.id.startsWith("cm_kerzy_") && r.makerName !== "Digital Underground")) { r.makerName = "Kerzy Labs"; r.curated = false; }
    if (r.id === "cm_kerzy_neonbastion") r.stage = "In development / testing";
    if (r.contactable === undefined) r.contactable = !!listingContactAddress(context.env, r);
    r.makerSlug = makerSlugFor(r);
    return r;
  });
}

/** Mirrors cardHTML() in community/wolf.js, plus the maker link. */
export function cardHTML(r, i) {
  const href = listingPath(r), n = e(r.name), rid = e(r.id);
  const st = r.stage && r.stage !== "Released" ? r.stage : "";
  const badge = st ? `<span class="badge stage">${e(st)}</span>` : r.curated ? '<span class="badge" title="Curated by Digital Underground"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="vertical-align:-1px"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg> Featured pick</span>' : "";
  const lbl = r.statusLabel ? `<span class="badge label">${e(String(r.statusLabel).slice(0, 24))}</span>` : "";
  const badges = lbl ? `<span class="badges">${badge}${lbl}</span>` : badge;
  const img = r.imageUrl;
  const tr = trophyFor(r.id);
  const trophy = tr ? `<a class="ml-trophy ml-trophy--corner" href="/league/" title="${e(tr.title)}" aria-label="${e(tr.title)}"><img src="${TROPHY_SRC}" srcset="${TROPHY_SRCSET}" sizes="56px" alt="${e(tr.title)}" width="120" height="120" decoding="async"></a>` : "";
  const med = img ? `<div class="media">${trophy}<img src="${safeHref(img)}" alt="${n} cover image" width="640" height="360" loading="${i < 2 ? "eager" : "lazy"}" decoding="async"></div>`
    : `<div class="media">${trophy}<img src="/assets/covers/default-cover.svg" alt="" width="640" height="360" loading="lazy" decoding="async"></div>`;
  const maker = r.makerSlug ? `<a href="/makers/${e(r.makerSlug)}/">${e(r.makerName)}</a>` : e(r.makerName);
  const x = r.xHandle ? ` · <a href="https://x.com/${e(r.xHandle)}" target="_blank" rel="noopener" aria-label="@${e(r.xHandle)} on X (opens in a new tab)">@${e(r.xHandle)}</a>` : "";
  const contact = r.contactable ? `<a class="pill pill-o" href="${href}#contact" aria-label="Contact the developer of ${n}">Contact</a>` : "";
  return `<li class="card" data-id="${rid}" data-globe-ignore><article class="card-inner" aria-labelledby="t-${rid}">${med}<div class="body"><div class="top"><div class="tt"><h3 id="t-${rid}"><a href="${href}">${n}</a></h3><p class="maker">${maker}${x}</p></div>${badges}</div>` +
    `<p class="desc">${e(r.pitchShort)}</p><div class="foot-row"><span class="price">${e(r.priceLabel || "See site")}</span><div class="acts">${contact}` +
    `<a class="pill pill-v" data-out="${rid}" href="${safeHref(r.visitUrl || r.projectUrl)}" target="_blank" rel="noopener" aria-label="Visit ${n} (opens in a new tab)">Visit</a></div></div></div></article></li>`;
}

function shell({ title, desc, canonical, image, imageAlt, jsonld, body, current }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(desc)}">
<link rel="canonical" href="${e(canonical)}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(desc)}">
<meta property="og:type" content="${current === "dir" ? "website" : "profile"}">
<meta property="og:url" content="${e(canonical)}">
<meta property="og:site_name" content="Digital Underground">
<meta property="og:image" content="${e(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${e(imageAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(title)}">
<meta name="twitter:description" content="${e(desc)}">
<meta name="twitter:image" content="${e(image)}">
<meta name="theme-color" content="#11141a">
<link rel="stylesheet" href="/assets/design-tokens.css?v=3">
<link rel="stylesheet" href="/community/wolf.css?v=8">
<link rel="stylesheet" href="/makers/makers.css?v=8"><link rel="stylesheet" href="/assets/league/trophies.css?v=9"><style id="ml-pill">html body .ml-trophy-banner{display:inline-flex;align-items:center;gap:10px;margin:12px 0 4px;padding:6px 16px 6px 6px;max-width:100%;box-sizing:border-box;border-radius:999px;text-decoration:none!important;color:#fff;pointer-events:auto;background:linear-gradient(135deg,rgba(124,92,255,.32),rgba(34,211,238,.14) 70%),#14122a;border:1px solid rgba(139,122,255,.7);box-shadow:0 0 0 1px rgba(34,211,238,.15) inset,0 0 18px rgba(124,92,255,.35),0 6px 16px rgba(0,0,0,.35);transition:transform .2s,box-shadow .2s,border-color .2s;}html body .ml-trophy-banner:hover,html body .ml-trophy-banner:focus-visible{border-color:#22d3ee;transform:translateY(-1px);box-shadow:0 0 0 1px rgba(34,211,238,.3) inset,0 0 24px rgba(34,211,238,.4),0 8px 20px rgba(0,0,0,.4);}html body .ml-trophy-banner:focus-visible{outline:2px solid #22d3ee;outline-offset:3px}html body .ml-trophy-banner__cup{flex:none;width:34px;height:34px;display:block;border-radius:50%;background:#0d0b1e;box-shadow:0 0 0 1px rgba(34,211,238,.5),0 0 10px rgba(124,92,255,.6);}html body .ml-trophy-banner__text{display:flex;flex-direction:column;gap:1px;min-width:0;line-height:1.15}html body .ml-trophy-banner__kicker{font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#67e8f9;white-space:nowrap;text-decoration:none;}html body .ml-trophy-banner__title{font-size:15px;font-weight:750;letter-spacing:-.01em;color:#fff;white-space:nowrap;text-decoration:none;text-shadow:0 0 10px rgba(124,92,255,.6);}html body .ml-trophy-banner__title::before{content:"\\1F451\\00a0";font-size:13px}html body .ml-trophy-banner__sub{display:none}html body .mk-tt .ml-trophy-banner,html body .dt-head .ml-trophy-banner{display:inline-flex!important}</style>
<script src="/community/nav.js?v=1" defer></script>
<script src="/community/track.js" defer></script>
<link rel="icon" type="image/svg+xml" href="/assets/logo/favicon.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/logo/favicon-180.png">
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>
<link rel="stylesheet" href="/assets/site-nav/site-nav.css?v=42">
<link rel="stylesheet" href="/assets/theme-clean.css?v=2">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<!--du-site-nav--><header class="dun"><div class="dun-in"><a class="dun-logo" href="/" aria-label="Digital Underground home"><img class="dun-full" src="/assets/logo/du-horizontal.svg" alt="Digital Underground" width="189" height="34"></a><nav class="dun-links" aria-label="Primary"><a href="/">Marketplace</a><a href="/league/">League</a><a href="/makers/">Creators</a></nav><div class="dun-right"><a class="dun-mp" href="/store/p/maker-pro/">Maker Pro</a><div class="dun-acct" id="dunAcct"><button type="button" class="dun-acct-btn dun-menu-btn" id="dunAcctBtn" aria-label="Open menu" aria-controls="dunDrawer" aria-expanded="false" aria-haspopup="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div></div></div><nav class="dun-drawer" id="dunDrawer" aria-label="Site menu"><div class="dun-drawer-acct" id="dunDrawerAcct" role="group" aria-label="Account"><div class="dun-drawer-who"><span class="av mark" aria-hidden="true"><img src="/assets/logo/du-mark-white.svg" alt="" width="36" height="36"></span><span class="nm">Account</span></div><a href="/community/dashboard/">Sign in</a></div><a href="/">Marketplace</a><a href="/league/">League</a><a href="/makers/">Creators</a><a href="/community/submit/">List your project free</a><a href="/store/p/maker-pro/">Maker Pro</a><button type="button" class="dun-share-btn" data-dun-share>Share this page</button></nav></header><script src="/assets/site-nav/site-nav.js?v=43" defer></script><!--/du-site-nav-->
<main id="main" tabindex="-1">
${body}
</main>
<!--du-site-foot--><footer class="duf"><div class="duf-in"><div class="duf-brand"><a href="/" class="duf-logo" aria-label="Digital Underground home"><img src="/assets/logo/du-horizontal.svg" alt="Digital Underground" width="260" height="47" loading="lazy"></a><p class="duf-tag">A free developer marketplace and store for independent makers. Zero cut, your checkout.</p><form class="duf-nl" novalidate><div class="duf-book"><a href="/free-planetview/"><img src="/assets/gift/planetview-cover.webp?v=hd1" alt="PlanetView Live cover" width="220" height="124" loading="lazy" decoding="async"></a><div><h3 class="duf-bk-h">Get PlanetView Live free</h3><p class="duf-bk-t"><a href="/free-planetview/">PlanetView Live: 3D Earth &amp; flight sim</a> · In live beta (testing)</p><p class="duf-bk-s">Free for a limited time with email signup. Independent project, not affiliated with SpaceX or NASA.</p></div></div><label for="dufEmail">Your email</label><div class="duf-row"><input id="dufEmail" type="email" name="email" placeholder="you@example.com" autocomplete="email" required><button type="submit">Get PlanetView free</button></div><input type="text" name="website" tabindex="-1" autocomplete="off" class="duf-hp" aria-hidden="true"><label class="duf-ck"><input type="checkbox" name="consent"> Yes, email me new apps, updates and occasional offers from Digital Underground. I can unsubscribe at any time.</label><p class="duf-msg" role="status" aria-live="polite"></p><p class="duf-priv">We only use your email for this list, never sell it, and every email has an unsubscribe link. <a href="/privacy/">Privacy policy</a>.</p></form><div class="duf-social"><a href="https://x.com/DigitalUG_Store" rel="noopener" target="_blank" aria-label="Digital Underground on X"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-7.5 8.6L23.3 22h-6.9l-5.4-7-6.2 7H1.7l8-9.2L1.2 2h7l4.9 6.4zm-1.2 18h1.9L7.4 3.9H5.4z"/></svg></a></div></div><div class="duf-cols"><div class="duf-col"><h3>Marketplace</h3><ul><li><a href="/#projects">Browse projects</a></li><li><a href="/league/">Maker League</a></li><li><a href="/makers/">Creators</a></li><li><a href="/community/submit/">List your project free</a></li><li><a href="/store/p/maker-pro/">Maker Pro</a></li><li><a href="/community/dashboard/">Creator dashboard</a></li></ul></div><div class="duf-col"><h3>Resources</h3><ul><li><a href="/blog/">Blog</a></li><li><a href="/community/api/">Developer API</a></li><li><a href="/support/">Support</a></li><li><button type="button" data-duf-share>Share this page</button></li></ul></div><div class="duf-col"><h3>Company</h3><ul><li><a href="/about/">About</a></li><li><a href="/store/">Digital Underground store</a></li><li><a href="mailto:digitalunderground.store@proton.me">Contact us</a></li><li><a href="https://x.com/DigitalUG_Store" rel="noopener" target="_blank">Follow @DigitalUG_Store</a></li></ul></div></div></div><div class="duf-bar"><p>© <span class="duf-year">2026</span> Digital Underground</p><p class="duf-legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="mailto:digitalunderground.store@proton.me">Contact</a></p></div></footer><!--/du-site-foot-->
</body>
</html>`;
}

function sortForMaker(rows) {
  const rank = (r) => (/wolf sniff/i.test(r.name) ? 0 : /wolfscent/i.test(r.name) ? 1 : 2);
  return rows.sort((a, b) => rank(a) - rank(b) || (a.name || "").localeCompare(b.name || ""));
}

const DU_MARK = "/assets/logo/du-mark.svg";
const isDU = (n) => /^digital\s*underground$/i.test(String(n || "").trim());
const withDULogo = (m) => (!m.logo && isDU(m.name) ? { ...m, logo: DU_MARK } : m);

// Directory-only exclusion: keep the house profile and its marketplace listings live.
export function showInCreatorDirectory(m) {
  return m.slug !== "digital-underground" && !isDU(m.name);
}

function makerPage(p, rows) {
  p = withDULogo(p);
  const canonical = `${ORIGIN}/makers/${p.slug}/`;
  const links = [];
  const siteLabel = (u) => { try { return new URL(/^https?:\/\//i.test(u) ? u : "https://" + u).hostname.replace(/^www\./, "") || "Website"; } catch { return "Website"; } };
  if (p.website) links.push(`<a class="pill pill-v" href="${safeHref(p.website)}" target="_blank" rel="noopener me">${e(siteLabel(p.website))}<span class="sr-only"> (opens in a new tab)</span></a>`);
  for (const [k, u] of Object.entries(p.socials || {})) links.push(`<a class="pill pill-o" href="${safeHref(u)}" target="_blank" rel="noopener me">${e(socialLabel(k))}<span class="sr-only"> (opens in a new tab)</span></a>`);
  const desc = (p.bio || `${p.name} on the Developer Marketplace.`).slice(0, 155);
  const ac = accentHex(p.accent);
  const acCss = ac ? `<style>.mk-hero{--mk-ac:${ac}}.mk-hero .mk-banner{border-color:${ac}66${p.banner ? "" : `;background:linear-gradient(135deg,${ac}55,#282d37 70%)`}}.mk-hero .mk-ph{background:${ac};color:#11141a}.mk-hero .eyebrow .dot{background:${ac}}.mk-links .pill-v{background:${ac};border-color:${ac};color:#11141a}.mk-links .pill-o{border-color:${ac}88}#listings-title .mk-count{background:${ac}33}</style>` : "";
  const body = `${acCss}<div class="mx z mk-hero">
  <div class="mk-banner">${p.banner ? `<img src="${safeHref(p.banner)}" alt="" width="1200" height="630" fetchpriority="high" decoding="async">` : ""}</div>
  <div class="mk-id">
    ${p.logo ? `<img class="mk-logo" src="${safeHref(p.logo)}" alt="${e(p.name)} logo" width="112" height="112" decoding="async">` : `<span class="mk-logo mk-ph" aria-hidden="true">${e(p.name.charAt(0))}</span>`}
    <div class="mk-tt"><p class="eyebrow"><span class="dot" aria-hidden="true"></span>Creator on the Developer Marketplace</p><h1>${e(p.name)}</h1>${trophyForSlug(p.slug) ? `<a class="ml-trophy-banner" href="/league/" aria-label="${e(trophyForSlug(p.slug).title)}"><img class="ml-trophy-banner__cup" src="${TROPHY_SRC}" srcset="${TROPHY_SRCSET}" sizes="56px" alt="" width="120" height="120" decoding="async"><span class="ml-trophy-banner__text"><span class="ml-trophy-banner__kicker">Builder Battle</span><span class="ml-trophy-banner__title">Week 1 Winner</span></span></a>` : ""}</div>
  </div>
  ${p.bio ? `<p class="lede mk-bio">${e(p.bio)}</p>` : ""}
  ${links.length ? `<nav class="mk-links" aria-label="${e(p.name)} links">${links.join("")}</nav>` : ""}
</div>
<section class="mx z listings" aria-labelledby="listings-title">
  <h2 id="listings-title" class="mk-h2">Listings by ${e(p.name)} <span class="mk-count">${rows.length}</span></h2>
  ${rows.length ? `<ul class="grid">${rows.map(cardHTML).join("\n")}</ul>` : '<p class="muted">No live listings yet. <a href="/community/submit/">List a project free</a> (zero cut, your checkout) or <a href="/store/">browse the store</a>.</p>'}
</section>`;
  const jsonld = { "@context": "https://schema.org", "@type": "ProfilePage", url: canonical, name: `${p.name} | Creators`,
    mainEntity: { "@type": "Organization", name: p.name, url: p.website || canonical, ...(p.logo ? { logo: abs(p.logo) } : {}), ...(p.bio ? { description: p.bio } : {}), sameAs: [p.website, ...Object.values(p.socials || {})].filter(Boolean) },
    hasPart: { "@type": "ItemList", numberOfItems: rows.length, itemListElement: rows.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.name, url: ORIGIN + listingPath(r) })) } };
  const ov = MAKER_OG[p.slug] || {};
  return shell({ title: ov.title || `${p.name}: apps and tools by this creator | Digital Underground`, desc: ov.desc || desc, canonical, image: ov.image || abs(p.banner || p.logo || "/community/og-dm-v3.jpg"), imageAlt: ov.imageAlt || `${p.name} banner`, jsonld, body, current: "maker" });
}

function directoryPage(makers) {
  const canonical = `${ORIGIN}/makers/`;
  const items = makers.map(withDULogo).map((m) => {
    const tr = trophyForSlug(m.slug);
    const trophy = tr ? `<span class="ml-trophy ml-trophy--dir" title="${e(tr.title)}" aria-label="${e(tr.title)}"><img src="${TROPHY_SRC}" srcset="${TROPHY_SRCSET}" sizes="44px" alt="" width="120" height="120" decoding="async"></span>` : "";
    return `<li class="mk-card" data-q="${e((m.name + " " + m.bio).toLowerCase())}"><a class="mk-card-a" href="${m.auto ? e(m.href) : `/makers/${e(m.slug)}/`}">` +
    (m.logo ? `<img class="mk-card-logo" src="${safeHref(m.logo)}" alt="" width="64" height="64" loading="lazy" decoding="async">` : `<span class="mk-card-logo mk-ph" aria-hidden="true">${e(m.name.charAt(0))}</span>`) +
    `<span class="mk-card-body"><span class="mk-card-name">${e(m.name)}</span><span class="mk-card-bio">${e(m.bio || (m.auto ? "Maker on the Developer Marketplace" : ""))}</span><span class="mk-card-n">${m.count} ${m.count === 1 ? "listing" : "listings"}</span></span>${trophy}</a></li>`;
  }).join("\n");
  const body = `<div class="mx z hero mk-dir-hero">
  <p class="eyebrow"><span class="dot" aria-hidden="true"></span>Independent makers</p>
  <h1>Creators</h1>
  <p class="lede">The people and studios behind the Developer Marketplace. Open a creator to see everything they list.</p>
</div>
<search class="mx z filters" role="search" aria-label="Search creators">
  <div class="frow"><div class="sbox"><label for="mq" class="sr-only">Search creators</label>
    <input id="mq" class="search" type="search" placeholder="Search creators…" autocomplete="off" aria-describedby="mcount">
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></div></div>
  <p class="count" id="mcount" role="status" aria-live="polite" aria-atomic="true">${makers.length} creators</p>
</search>
<section class="mx z" aria-labelledby="dir-title"><h2 id="dir-title" class="sr-only">All creators</h2><ul class="mk-grid" id="mgrid">${items}</ul></section>

<script>
(function () {
  var q = document.getElementById("mq"), c = document.getElementById("mcount"), li = [].slice.call(document.querySelectorAll("#mgrid .mk-card"));
  q.addEventListener("input", function () { var v = q.value.trim().toLowerCase(), n = 0;
    li.forEach(function (x) { var ok = !v || x.getAttribute("data-q").indexOf(v) >= 0; x.hidden = !ok; if (ok) n++; });
    c.textContent = n + (n === 1 ? " creator" : " creators"); });
})();
</script>`;
  const jsonld = { "@context": "https://schema.org", "@type": "CollectionPage", url: canonical, name: "Creators | Developer Marketplace",
    publisher: { "@type": "Organization", "@id": `${ORIGIN}/#org`, name: "Digital Underground", url: `${ORIGIN}/`, logo: { "@type": "ImageObject", url: `${ORIGIN}/assets/logo/du-mark.png`, width: 1024, height: 1024 } },
    mainEntity: { "@type": "ItemList", numberOfItems: makers.length, itemListElement: makers.map((m, i) => ({ "@type": "ListItem", position: i + 1, name: m.name, url: m.auto ? ORIGIN + m.href : `${ORIGIN}/makers/${m.slug}/` })) } };
  return shell({ title: "Indie Makers & Creators Directory | Digital Underground", desc: "Discover indie makers and solo developers building in public on X. Browse each creator's apps, AI tools and games on a free, 0% commission maker marketplace.",
    canonical, image: `${ORIGIN}/community/og-dm-v3.jpg`, imageAlt: "Developer Marketplace by Digital Underground", jsonld, body, current: "dir" });
}

const html = (s, status = 200, xc = "") => new Response(s, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60, s-maxage=300", "X-Content-Type-Options": "nosniff", ...(xc ? { "X-Makers-Cache": xc } : {}) } });

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/makers\/?/, "").split("/").filter(Boolean);
  if (parts.length && (parts[0] === "media" || /\.[a-z0-9]+$/i.test(parts[parts.length - 1]))) return context.next(); // static files
  if (parts.length > 1) return context.next();
  if (!url.pathname.endsWith("/")) { url.pathname += "/"; return Response.redirect(url.toString(), 301); }
  const cache = caches.default;
  const key = new Request(url.origin + url.pathname + "?v=dir-swr-8", { method: "GET" });
  const kv = getKv(env);
  const snapKey = "makers:snap:v7:" + url.pathname;
  const FRESH = 300 * 1000;
  const fresh = (r) => Date.now() - Number(r.headers.get("X-Built-At") || 0) < FRESH;
  const refresh = () => build(context, kv, parts).then(async (b) => {
    if (b.status !== 200) return;
    const body = await b.text();
    const stored = new Response(body, { headers: { ...Object.fromEntries(b.headers), "Cache-Control": "public, s-maxage=604800", "X-Built-At": String(Date.now()) } });
    await cache.put(key, stored);
    if (kv) await kv.put(snapKey, JSON.stringify({ t: Date.now(), body }), { expirationTtl: 604800 }).catch(() => {});
  }).catch(() => {});
  // 1) Edge cache (stale-while-revalidate: serve anything up to 7 days old, rebuild in background after 5 min)
  const hit = await cache.match(key).catch(() => null);
  if (hit) {
    if (!fresh(hit)) context.waitUntil(refresh());
    return html(await hit.text(), 200, fresh(hit) ? "HIT" : "STALE");
  }
  // 2) Global KV snapshot (covers cold colos and post-deploy)
  if (kv) {
    const snap = await kv.get(snapKey, "json").catch(() => null);
    if (snap && snap.body) {
      context.waitUntil(Date.now() - snap.t < FRESH
        ? cache.put(key, new Response(snap.body, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=604800", "X-Built-At": String(snap.t) } })).catch(() => {})
        : refresh());
      return html(snap.body, 200, "SNAP");
    }
  }
  // 3) Full build
  const res = await build(context, kv, parts);
  if (res.status === 200) { const body = await res.clone().text(); context.waitUntil((async () => {
    await cache.put(key, new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=604800", "X-Built-At": String(Date.now()) } })).catch(() => {});
    if (kv) await kv.put(snapKey, JSON.stringify({ t: Date.now(), body }), { expirationTtl: 604800 }).catch(() => {});
  })()); }
  return res;
}

async function build(context, kv, parts) {
  if (!parts.length) {
    const [rows, profiles] = await Promise.all([allListings(context, kv), allLiveProfiles(kv)]);
    // Count every listing onto its maker page: by makerSlug, or by matching name/slugify when the listing never got a slug.
    const withProfile = profiles.map((p) => ({ ...p, count: 0 }));
    const bySlug = new Map(withProfile.map((m) => [m.slug, m]));
    const byName = new Map(withProfile.map((m) => [m.name.trim().toLowerCase(), m]));
    const auto = new Map();
    for (const r of rows) {
      if (r.curated || !r.makerName) continue;
      const nm = r.makerName.trim();
      const hit = (r.makerSlug && bySlug.get(r.makerSlug)) || bySlug.get(slugify(nm)) || byName.get(nm.toLowerCase());
      if (hit) { hit.count++; continue; }
      if (r.makerSlug) continue; // slug points at a missing page — skip orphan auto card
      const k = nm.toLowerCase();
      const a = auto.get(k) || { name: nm, bio: "", count: 0, logo: r.imageUrl || "", href: listingPath(r), auto: true };
      a.count++; if (!a.logo && r.imageUrl) a.logo = r.imageUrl; auto.set(k, a);
    }
    const makers = [...withProfile.filter((m) => m.count > 0), ...auto.values()]
      .filter(showInCreatorDirectory)
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.name.localeCompare(b.name));
    return html(directoryPage(makers), 200, "MISS");
  } else {
    const slug = parts[0].toLowerCase();
    const [p, rows] = await Promise.all([validSlug(slug) ? liveProfile(kv, slug) : null, allListings(context, kv)]);
    if (!p) return new Response(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Creator not found | Digital Underground</title></head><body style="font-family:system-ui;background:#11141a;color:#e6e8ec;padding:2rem"><main><h1>Creator not found</h1><p><a style="color:#9a97e8" href="/makers/">See all creators</a></p></main></body></html>`, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" } });
    return html(makerPage(p, sortForMaker(rows.filter((r) => r.makerSlug === slug))), 200, "MISS");
  }
}

export async function onRequestHead(context) {
  const r = await onRequestGet(context);
  return new Response(null, { status: r.status, headers: r.headers });
}
