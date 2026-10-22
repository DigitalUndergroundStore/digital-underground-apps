// Server-rendered creator pages: /makers/ (directory) and /makers/<slug>/ (profile + all marketplace listings).
// Fully public. Full HTML for crawlers; a tiny inline script adds search. Edge-cached 5 min to keep KV reads low.
import { getKv, listApproved, listingContactAddress, isRetired } from "../_lib/community.js";
import { allLiveProfiles, liveProfile, makerSlugFor, socialLabel, validSlug } from "../_lib/makers.js";

const ORIGIN = "https://digitalundergroundstore.com";
const GM = /[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}/gi; // never print any email address
const e = (s) => String(s == null ? "" : s).replace(GM, "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const safeHref = (u) => (typeof u === "string" && (/^https:\/\//i.test(u) || /^\/(?!\/)/.test(u)) ? e(u) : "#");
const abs = (u) => (u && u.startsWith("/") ? ORIGIN + u : u);

async function allListings(context, kv) {
  const by = {};
  try {
    const r = await context.env.ASSETS.fetch(new URL("/community/listings.json", context.request.url));
    if (r.ok) for (const x of await r.json()) if ((x.status || "approved") === "approved") by[x.id] = x;
  } catch {}
  if (kv) for (const x of await listApproved(kv, context.env)) by[x.id] = x;
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
  const href = "/community/p/?id=" + encodeURIComponent(r.id), n = e(r.name), rid = e(r.id);
  const st = r.stage && r.stage !== "Released" ? r.stage : "";
  const badge = st ? `<span class="badge stage">${e(st)}</span>` : r.curated ? '<span class="badge" title="Curated by Digital Underground"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="vertical-align:-1px"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg> Featured pick</span>' : "";
  const lbl = r.statusLabel ? `<span class="badge label">${e(String(r.statusLabel).slice(0, 24))}</span>` : "";
  const badges = lbl ? `<span class="badges">${badge}${lbl}</span>` : badge;
  const img = r.imageUrl;
  const med = img ? `<div class="media"><img src="${safeHref(img)}" alt="${n} cover image" width="640" height="360" loading="${i < 2 ? "eager" : "lazy"}" decoding="async"></div>`
    : `<div class="media grad" style="background:linear-gradient(135deg,#7c3aed,#4f46e5)"><span aria-hidden="true">${e((r.name || "?").slice(0, 2))}</span></div>`;
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
<meta property="og:image:alt" content="${e(imageAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(title)}">
<meta name="twitter:description" content="${e(desc)}">
<meta name="twitter:image" content="${e(image)}">
<meta name="theme-color" content="#05040c">
<link rel="stylesheet" href="/assets/design-tokens.css">
<link rel="stylesheet" href="/community/wolf.css?v=6">
<link rel="stylesheet" href="/makers/makers.css?v=2">
<link rel="preload" as="image" href="/assets/globe/fallback-mobile.webp?v=2" media="(max-width: 799px)">
<link rel="preload" as="image" href="/assets/globe/fallback.webp?v=2" media="(min-width: 800px)">
<script src="/community/nav.js?v=1" defer></script>
<script src="/community/track.js" defer></script>
<link rel="icon" type="image/svg+xml" href="/assets/logo/favicon.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/logo/favicon-180.png">
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>
<link rel="stylesheet" href="/assets/site-nav/site-nav.css?v=10">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div id="du-globe-bg" class="du-globe-bg" aria-hidden="true" data-res="2k"><canvas id="du-globe-canvas" class="du-globe-canvas" aria-hidden="true" tabindex="-1"></canvas><div class="du-globe-vignette"></div></div>
<!--du-site-nav--><header class="dun"><div class="dun-in"><a class="dun-logo" href="/store/" aria-label="Digital Underground store home"><img class="dun-full" src="/assets/logo/du-horizontal.svg" alt="Digital Underground" width="189" height="34"><img class="dun-mark" src="/assets/logo/du-mark.svg" alt="" width="32" height="32"></a><nav class="dun-links" aria-label="Primary"><a href="/">Marketplace</a><a href="/league/">League</a></nav><div class="dun-right"><a class="dun-cta" href="/community/submit/">List your project free</a><div class="dun-acct" id="dunAcct"><a class="dun-signin" href="/community/dashboard/">Sign in</a></div><button type="button" class="dun-menu" id="dunMenu" aria-label="Open menu" aria-controls="dunDrawer" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div></div><nav class="dun-drawer" id="dunDrawer" aria-label="Site menu"><a href="/">Marketplace</a><a href="/league/">League</a><a href="/makers/">Creators</a><a href="/blog/">Blog</a><button type="button" class="dun-share-btn" data-dun-share>Share this page</button></nav></header><script src="/assets/site-nav/site-nav.js?v=5" defer></script><!--/du-site-nav-->
<main id="main" tabindex="-1">
${body}
</main>
<footer class="z site-foot">
  <div class="mx">
    <p><a href="/"><span aria-hidden="true">←</span> Developer Marketplace</a> · <a href="/makers/">All creators</a> · <a href="/community/submit/">List your project</a> · <a href="/league/">League</a> · <a href="/blog/">Blog</a></p>
    <p><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p>
    <p class="credits">Background Earth textures © <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener">Solar System Scope</a>, CC BY 4.0 (resized).</p>
  </div>
</footer>
<script>
(function () {
  var root = document.getElementById("du-globe-bg");
  function capable() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (matchMedia("(max-width: 820px)").matches || matchMedia("(hover: none) and (pointer: coarse)").matches) return false;
    var c = navigator.connection; if (c && (c.saveData || /2g/.test(c.effectiveType || ""))) return false;
    if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return false;
    try { var t = document.createElement("canvas"); if (!(t.getContext("webgl2") || t.getContext("webgl"))) return false; } catch (_) { return false; }
    return true;
  }
  function go() { if (!capable()) { root.classList.add("is-lite"); return; } var s = document.createElement("script"); s.type = "module"; s.src = "/assets/globe/globe.js?v=7"; document.head.appendChild(s); }
  function idle() { (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(go, { timeout: 4000 }); }
  if (document.readyState === "complete") idle(); else addEventListener("load", idle, { once: true });
})();
</script>
</body>
</html>`;
}

function sortForMaker(rows) {
  const rank = (r) => (/wolf sniff/i.test(r.name) ? 0 : /wolfscent/i.test(r.name) ? 1 : 2);
  return rows.sort((a, b) => rank(a) - rank(b) || (a.name || "").localeCompare(b.name || ""));
}

function makerPage(p, rows) {
  const canonical = `${ORIGIN}/makers/${p.slug}/`;
  const links = [];
  if (p.website) links.push(`<a class="pill pill-v" href="${safeHref(p.website)}" target="_blank" rel="noopener me">Website: ${e(p.website.replace(/^https:\/\//, "").replace(/\/$/, ""))}<span class="sr-only"> (opens in a new tab)</span></a>`);
  for (const [k, u] of Object.entries(p.socials || {})) links.push(`<a class="pill pill-o" href="${safeHref(u)}" target="_blank" rel="noopener me">${e(socialLabel(k))}<span class="sr-only"> (opens in a new tab)</span></a>`);
  const desc = (p.bio || `${p.name} on the Developer Marketplace.`).slice(0, 155);
  const body = `<div class="mx z mk-hero">
  <div class="mk-banner">${p.banner ? `<img src="${safeHref(p.banner)}" alt="" width="1200" height="630" fetchpriority="high" decoding="async">` : ""}</div>
  <div class="mk-id">
    ${p.logo ? `<img class="mk-logo" src="${safeHref(p.logo)}" alt="${e(p.name)} logo" width="112" height="112" decoding="async">` : `<span class="mk-logo mk-ph" aria-hidden="true">${e(p.name.charAt(0))}</span>`}
    <div class="mk-tt"><p class="eyebrow"><span class="dot" aria-hidden="true"></span>Creator on the Developer Marketplace</p><h1>${e(p.name)}</h1></div>
  </div>
  ${p.bio ? `<p class="lede mk-bio">${e(p.bio)}</p>` : ""}
  ${links.length ? `<nav class="mk-links" aria-label="${e(p.name)} links">${links.join("")}</nav>` : ""}
</div>
<section class="mx z listings" aria-labelledby="listings-title">
  <h2 id="listings-title" class="mk-h2">Listings by ${e(p.name)} <span class="mk-count">${rows.length}</span></h2>
  ${rows.length ? `<ul class="grid">${rows.map(cardHTML).join("\n")}</ul>` : '<p class="muted">No live listings yet.</p>'}
</section>`;
  const jsonld = { "@context": "https://schema.org", "@type": "ProfilePage", url: canonical, name: `${p.name} | Creators`,
    mainEntity: { "@type": "Organization", name: p.name, url: p.website || canonical, ...(p.logo ? { logo: abs(p.logo) } : {}), ...(p.bio ? { description: p.bio } : {}), sameAs: [p.website, ...Object.values(p.socials || {})].filter(Boolean) },
    hasPart: { "@type": "ItemList", numberOfItems: rows.length, itemListElement: rows.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.name, url: `${ORIGIN}/community/p/?id=${encodeURIComponent(r.id)}` })) } };
  return shell({ title: `${p.name}: apps and tools by this creator | Digital Underground`, desc, canonical, image: abs(p.banner || p.logo || "/community/og-dm-v3.jpg"), imageAlt: `${p.name} banner`, jsonld, body, current: "maker" });
}

function directoryPage(makers) {
  const canonical = `${ORIGIN}/makers/`;
  const items = makers.map((m) => `<li class="mk-card" data-q="${e((m.name + " " + m.bio).toLowerCase())}"><a class="mk-card-a" href="${m.auto ? e(m.href) : `/makers/${e(m.slug)}/`}">` +
    (m.logo ? `<img class="mk-card-logo" src="${safeHref(m.logo)}" alt="" width="64" height="64" loading="lazy" decoding="async">` : `<span class="mk-card-logo mk-ph" aria-hidden="true">${e(m.name.charAt(0))}</span>`) +
    `<span class="mk-card-body"><span class="mk-card-name">${e(m.name)}</span><span class="mk-card-bio">${e(m.bio || (m.auto ? "Maker on the Developer Marketplace" : ""))}</span><span class="mk-card-n">${m.count} ${m.count === 1 ? "listing" : "listings"}</span></span></a></li>`).join("\n");
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
    mainEntity: { "@type": "ItemList", numberOfItems: makers.length, itemListElement: makers.map((m, i) => ({ "@type": "ListItem", position: i + 1, name: m.name, url: m.auto ? ORIGIN + m.href : `${ORIGIN}/makers/${m.slug}/` })) } };
  return shell({ title: "Creators | Developer Marketplace | Digital Underground", desc: "Browse the independent makers on the Digital Underground Developer Marketplace and see every app, tool and game each one lists.",
    canonical, image: `${ORIGIN}/community/og-dm-v3.jpg`, imageAlt: "Developer Marketplace by Digital Underground", jsonld, body, current: "dir" });
}

const html = (s, status = 200) => new Response(s, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60, s-maxage=300", "X-Content-Type-Options": "nosniff" } });

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/makers\/?/, "").split("/").filter(Boolean);
  if (parts.length && (parts[0] === "media" || /\.[a-z0-9]+$/i.test(parts[parts.length - 1]))) return context.next(); // static files
  if (parts.length > 1) return context.next();
  if (!url.pathname.endsWith("/")) { url.pathname += "/"; return Response.redirect(url.toString(), 301); }
  const cache = caches.default;
  const key = new Request(url.origin + url.pathname, { method: "GET" });
  const hit = await cache.match(key).catch(() => null);
  if (hit) return hit;
  const kv = getKv(env);
  const rows = await allListings(context, kv);
  let res;
  if (!parts.length) {
    const profiles = await allLiveProfiles(kv);
    const withProfile = profiles.map((p) => ({ ...p, count: rows.filter((r) => r.makerSlug === p.slug).length })).filter((m) => m.count > 0);
    // Makers with live listings but no creator profile yet get a basic card (name, count, first listing image).
    const auto = new Map();
    for (const r of rows) {
      if (r.makerSlug || r.curated || !r.makerName) continue;
      const k = r.makerName.trim().toLowerCase();
      const a = auto.get(k) || { name: r.makerName.trim(), bio: "", count: 0, logo: r.imageUrl || "", href: `/community/p/?id=${encodeURIComponent(r.id)}`, auto: true };
      a.count++; auto.set(k, a);
    }
    const makers = [...withProfile, ...auto.values()]
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.name.localeCompare(b.name));
    res = html(directoryPage(makers));
  } else {
    const slug = parts[0].toLowerCase();
    const p = validSlug(slug) ? await liveProfile(kv, slug) : null;
    if (!p) return new Response(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Creator not found | Digital Underground</title></head><body style="font-family:system-ui;background:#07060f;color:#f5f3ff;padding:2rem"><main><h1>Creator not found</h1><p><a style="color:#c4b5fd" href="/makers/">See all creators</a></p></main></body></html>`, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" } });
    res = html(makerPage(p, sortForMaker(rows.filter((r) => r.makerSlug === slug))));
  }
  context.waitUntil(cache.put(key, res.clone()).catch(() => {}));
  return res;
}

export async function onRequestHead(context) {
  const r = await onRequestGet(context);
  return new Response(null, { status: r.status, headers: r.headers });
}
