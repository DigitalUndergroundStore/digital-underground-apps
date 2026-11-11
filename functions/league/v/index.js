/** /league/v/?id= — product share landing (image OG only). Humans land here then go to /league/?vote=. */
import { eligible } from "../../_lib/league.js";

const SITE = "https://digitalundergroundstore.com";
const FALLBACK = SITE + "/assets/promo/league-share-card.jpg";
const e = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function realImage(u) {
  const s = String(u || "").trim();
  if (!s || /default-cover|placeholder/i.test(s)) return null;
  if (/^https:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return SITE + s;
  return null;
}

export const slugify = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
// Current covers (override stale listing imageUrl) + OG cache-bust.
const COVER = { cm_kerzy_neonbastion: SITE + "/community/media/rival-lanes-og.jpg?v=20261104og1" };
const OGV = "20261104og1";
function bust(u) { return u + (u.includes("?") ? "&" : "?") + "og=" + OGV; }

async function page(context) {
  return render(context, null);
}

export async function render(context, slug) {
  const url = new URL(context.request.url);
  let id = url.searchParams.get("id") || url.searchParams.get("vote") || "";
  let list = [];
  try { list = await eligible(url.origin); } catch {}
  if (slug) { const m = list.find((x) => slugify(x.name) === slug); if (m) id = m.id; }
  if (!id) {
    return Response.redirect(SITE + "/league/", 302);
  }
  const voteUrl = `${SITE}/league/?vote=${encodeURIComponent(id)}`;
  const l = list.find((x) => x.id === id) || null;
  const name = l ? l.name : "Maker League";
  const maker = l && l.makerName ? l.makerName : "";
  const img = bust(COVER[id] || realImage(l && l.imageUrl) || FALLBACK);
  const title = l ? `Vote for ${name} · Maker League | Digital Underground` : "Maker League | Digital Underground";
  const desc = l
    ? `Vote for ${name}${maker ? " by " + maker : ""}${id === "cm_kerzy_neonbastion" ? ": play free in your browser" : ""} in Digital Underground's Maker League. Free, one vote per week.`
    : "Weekly indie builder competition on Digital Underground.";
  const shareUrl = l ? `${SITE}/league/v/${slugify(l.name)}` : `${SITE}/league/v/?id=${encodeURIComponent(id)}`;
  // Always return HTML (no UA redirect): X may HEAD/GET with odd agents; 302/404 kills the card.
  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<title>${e(title)}</title>
<meta name="description" content="${e(desc)}">
<link rel="canonical" href="${e(shareUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Digital Underground">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(desc)}">
<meta property="og:url" content="${e(shareUrl)}">
<meta property="og:image" content="${e(img)}">
<meta property="og:image:alt" content="${e(name)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(title)}">
<meta name="twitter:description" content="${e(desc)}">
<meta name="twitter:image" content="${e(img)}">
<meta http-equiv="refresh" content="0;url=${e(voteUrl)}">
<script>location.replace(${JSON.stringify(voteUrl)});</script>
</head><body><p><a href="${e(voteUrl)}">Open Maker League vote</a></p></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}

export const onRequestGet = page;
export const onRequestHead = async (context) => {
  const res = await page(context);
  // HEAD must not 404 — X often probes first.
  return new Response(null, { status: res.status, headers: res.headers });
};
