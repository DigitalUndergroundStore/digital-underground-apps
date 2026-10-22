// /community/p/?id=<listingId>: the detail page renders client-side, so inject per-listing
// title + Open Graph / Twitter meta (cover image) for crawlers and link previews.
import { getKv, kvGetListing, publicImageUrl, isRetired } from "../../_lib/community.js";
const SITE = "https://digitalundergroundstore.com";
const e = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export async function onRequestGet(context) {
  const res = await context.next();
  try {
    const id = new URL(context.request.url).searchParams.get("id") || "";
    if (!/^cm_[a-z0-9_]{1,64}$/i.test(id) || !(res.headers.get("content-type") || "").includes("text/html")) return res;
    const kv = getKv(context.env);
    const row = kv && (await kvGetListing(kv, id));
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
      `<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}">\n<meta name="twitter:title" content="${e(title)}">\n<meta name="twitter:description" content="${e(desc)}">\n`;
    let html = await res.text();
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${e(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${e(desc)}">`)
      .replace("</head>", meta + "</head>");
    const h = new Headers(res.headers); h.delete("content-length"); h.set("Cache-Control", "public, max-age=300");
    return new Response(html, { status: res.status, headers: h });
  } catch { return res; }
}
