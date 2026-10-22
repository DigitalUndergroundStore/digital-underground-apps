// /community/p/?id=<listingId>: the detail page renders client-side, so inject per-listing
// title + Open Graph / Twitter meta (cover image) for crawlers and link previews.
import { makerSlugFor } from "../../_lib/makers.js";
import { getKv, kvGetListing, publicImageUrl, isRetired } from "../../_lib/community.js";
const SITE = "https://digitalundergroundstore.com";
const e = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ORG = { "@type": "Organization", "@id": `${SITE}/#org`, name: "Digital Underground", url: `${SITE}/`,
  logo: { "@type": "ImageObject", url: `${SITE}/assets/logo/du-mark.png`, width: 1024, height: 1024 }, sameAs: ["https://x.com/DigitalUG_Store"] };
const slugOf = (row) => { try { return makerSlugFor(row) || ""; } catch { return ""; } };
const isKerzy = (row, id) => /^cm_kerzy_/i.test(id) || /kerzy\s*labs/i.test(String(row.makerName || ""));

async function seedListing(context, id) {
  try {
    const u = new URL("/community/listings.json", context.request.url);
    const r = context.env && context.env.ASSETS ? await context.env.ASSETS.fetch(u) : await fetch(u);
    const data = r.ok ? await r.json() : [];
    return (Array.isArray(data) ? data : data?.listings || []).find((x) => x && x.id === id) || null;
  } catch { return null; }
}

// Listing JSON-LD: the maker is the author. DU is named as publisher of the page, except on
// Kerzy Labs listings, which never carry DU as publisher or brand.
function listingLd(row, id, url, title, desc, img) {
  const kerzy = isKerzy(row, id);
  const maker = row.makerName ? { "@type": "Organization", name: row.makerName, ...(slugOf(row) ? { url: `${SITE}/makers/${slugOf(row)}/` } : {}) } : undefined;
  const work = { "@type": "CreativeWork", name: row.name, ...(desc ? { description: desc } : {}), ...(img ? { image: img } : {}),
    ...(row.projectUrl ? { url: row.projectUrl } : {}), ...(maker ? { author: maker } : {}) };
  const page = { "@type": "WebPage", "@id": `${url}#webpage`, url, name: title, ...(desc ? { description: desc } : {}), mainEntity: work };
  if (kerzy) return { "@context": "https://schema.org", ...page };
  page.publisher = { "@id": ORG["@id"] };
  return { "@context": "https://schema.org", "@graph": [ORG, page] };
}

export async function onRequestGet(context) {
  const res = await context.next();
  try {
    const id = new URL(context.request.url).searchParams.get("id") || "";
    if (!/^cm_[a-z0-9_]{1,64}$/i.test(id) || !(res.headers.get("content-type") || "").includes("text/html")) return res;
    const kv = getKv(context.env);
    let row = kv && (await kvGetListing(kv, id));
    if (!row || row.status !== "approved") row = await seedListing(context, id); // owner's static seed, same as /api/community/listing
    if (!row || row.status !== "approved" || row.hidden || isRetired(row)) return res;
    let img = publicImageUrl(row) || "";
    if (img.startsWith("/")) img = SITE + img;
    if (!/^https:\/\//i.test(img)) img = "";
    const url = `${SITE}/community/p/?id=${encodeURIComponent(id)}`;
    const title = `${row.name} — Developer Marketplace — Digital Underground`;
    const desc = String(row.pitchShort || "").replace(/[^\s@<>"]+@gmail\.com/gi, "").slice(0, 300);
    const meta = `<link rel="canonical" href="${e(url)}">\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="Digital Underground">\n` +
      `<meta property="og:title" content="${e(title)}">\n<meta property="og:description" content="${e(desc)}">\n<meta property="og:url" content="${e(url)}">\n` +
      (img ? `<meta property="og:image" content="${e(img)}">\n<meta property="og:image:alt" content="${e(row.name)} cover image">\n<meta name="twitter:image" content="${e(img)}">\n` : "") +
      `<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}">\n<meta name="twitter:title" content="${e(title)}">\n<meta name="twitter:description" content="${e(desc)}">\n` +
      `<script type="application/ld+json">${JSON.stringify(listingLd(row, id, url, title, desc, img)).replace(/</g, "\\u003c")}</script>\n`;
    let html = await res.text();
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${e(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${e(desc)}">`)
      .replace("</head>", meta + "</head>");
    const h = new Headers(res.headers); h.delete("content-length"); h.set("Cache-Control", "public, max-age=300");
    return new Response(html, { status: res.status, headers: h });
  } catch { return res; }
}
