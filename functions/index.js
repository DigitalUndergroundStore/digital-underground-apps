// Home "/" edge SSR (Wolf, Oct 31 2026): render the live first page of marketplace listings into the HTML
// so crawlers and first paint get real cards (no loader, no stale-product flash). Full live list is embedded
// in #du-data for client filters; home.js shows PAGE cards and loads more on scroll. Falls back to the
// static index.html (which has its own loader + live fetch) on any error.
import { listingPath } from "./_lib/listing-url.js";
import { onRequest as listingsApi } from "./api/community/listings.js";
import { edgeCached } from "./_lib/edgecache.js";

const PAGE = 9;
const GM = /[^\s@<>"]+@gmail\.com/gi;
const esc = (s) => String(s ?? "").replace(GM, "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const STAR = "<svg class='star' width='11' height='11' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'><path d='M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z'/></svg>";
const SHARE_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
const NO_BADGE = new Set(["cm_mv822ro8_6d5c4cb4"]);
const KEEP = ["id", "name", "makerName", "makerSlug", "xHandle", "category", "priceLabel", "pitchShort", "imageUrl", "visitUrl",
  "projectUrl", "buyUrl", "video", "tags", "stage", "statusLabel", "curated", "contactable", "status", "isNew"];

function normalize(r) {
  if (/^cm_kerzy_/.test(r.id) || /kerzy/i.test(r.makerName || "")) { r.makerName = "Kerzy Labs"; r.curated = false; }
  if (r.id === "cm_kerzy_neonbastion" || /neon bastion|rival lanes/i.test(r.name || "")) r.stage = "In development / testing";
  return r;
}
function makerSlug(r) {
  if (r.makerSlug && /^[a-z0-9-]{1,48}$/.test(r.makerSlug)) return r.makerSlug;
  if (/^cm_kerzy_/.test(r.id || "")) return "kerzy-labs";
  return /^wolfitway$/i.test(r.makerName || "") ? "wolfitway" : "";
}
function card(r, i) {
  const id = r.id, n = esc(r.name), page = listingPath(r);
  const stage = r.stage && r.stage !== "Released" ? r.stage : "";
  const badge = stage || (r.curated ? "Featured pick" : "");
  const label = r.statusLabel ? String(r.statusLabel).slice(0, 24) : "";
  const one = (b) => `<span class="card-badge ${/featured/i.test(b) ? "badge-featured" : /beta/i.test(b) ? "badge-beta" : "badge-testing"}">${/featured/i.test(b) ? STAR + " " : ""}${esc(b)}</span>`;
  const price = String(r.priceLabel || "See site");
  const free = /^free$/i.test(price.trim()) && !NO_BADGE.has(id) ? '<span class="card-badge badge-free">Free</span>' : "";
  const nw = r.isNew ? '<span class="card-badge badge-new" style="background:#16a34a;color:#fff">New</span>' : "";
  const parts = [badge, label].filter(Boolean);
  const badges = parts.length || free || nw ? `<div class="card-badges">${nw}${free}${parts.map(one).join("")}</div>` : "";
  const ms = makerSlug(r);
  const mk = (ms ? `<a href="/makers/${encodeURIComponent(ms)}/">${esc(r.makerName)}</a>` : esc(r.makerName))
    + (r.xHandle ? ` · <a href="https://x.com/${encodeURIComponent(r.xHandle)}" target="_blank" rel="noopener">@${esc(r.xHandle)}</a>` : "");
  const url = r.buyUrl || r.visitUrl || r.projectUrl || "";
  const img = r.imageUrl ? `<img src="${esc(r.imageUrl)}" alt="${n} cover image" width="640" height="360" loading="${i < 4 ? "eager" : "lazy"}"${i === 0 ? ' fetchpriority="high"' : ""} decoding="async">` : "";
  return `<article class="card" data-id="${esc(id)}"><div class="card-media">${badges}${img}<div class="card-placeholder" aria-hidden="true" style="background:url(/assets/covers/default-cover.svg) center/cover no-repeat"></div></div>`
    + `<div class="card-body"><div class="card-meta">${mk}</div><h3 class="card-title"><a href="${page}">${n}</a></h3><p class="card-desc">${esc(r.pitchShort)}</p>`
    + `<div class="card-footer"><span class="card-price${/^free/i.test(price.trim()) ? " free" : ""}">${esc(price)}</span><div class="card-actions">`
    + (r.contactable !== false ? `<a href="${page}#contact" class="btn btn-ghost">Contact</a>` : "")
    + `<a href="${esc(url)}" data-out="${esc(id)}" class="btn btn-primary" target="_blank" rel="noopener">${r.buyUrl ? "Buy" : "Visit"}</a></div>`
    + `<div class="card-vote-row"><button type="button" class="share-btn" data-share="${esc(id)}" data-name="${n}" aria-label="Share ${n} in Maker League">${SHARE_SVG} Share</button>`
    + `<a href="/league/?vote=${encodeURIComponent(id)}" class="btn btn-vote" data-vote="${esc(id)}">Cast Maker League Vote</a></div></div></div></article>`;
}

export async function onRequestGet(context) {
  const origin = new URL(context.request.url).origin;
  return edgeCached(context, origin + "/__du_cache/home-ssr-v1", 120, 600, () => renderHome(context));
}

async function renderHome(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const asset = await env.ASSETS.fetch(new URL("/", url));
  if (!asset.ok || !(asset.headers.get("content-type") || "").includes("text/html")) return asset;
  try {
    const apiRes = await listingsApi({ request: new Request(url.origin + "/api/community/listings", { headers: { accept: "application/json" } }), env, waitUntil: context.waitUntil });
    if (!apiRes.ok) return asset;
    const api = await apiRes.json();
    const rows = (api.listings || []).filter((r) => r && r.id && !r.hidden && ["approved", "live", "published"].includes(r.status || "approved")
      && r.id !== "cm_kerzy_easytracker" && !(/^cm_pick_/.test(r.id) || r.curated === true)).map(normalize);
    if (!rows.length) return asset;
    const data = rows.map((r) => { const d = {}; for (const k of KEEP) if (r[k] != null) d[k] = r[k]; return d; });
    const cards = rows.slice(0, PAGE).map(card).join("");
    const json = JSON.stringify(data).replace(/</g, "\\u003c");
    const n = String(rows.length);
    const out = new HTMLRewriter()
      .on("html", { element(e) { e.setAttribute("data-ssr", "live"); } })
      .on("#projectGrid", { element(e) { e.setInnerContent(cards, { html: true }); e.setAttribute("data-total", n); } })
      .on("#du-data", { element(e) { e.setInnerContent(json, { html: true }); } })
      .on("#cntNum", { element(e) { e.setInnerContent(n); } })
      .on(".cnt-apply", { element(e) { e.setInnerContent(n); } })
      .on("#heroCount", { element(e) { e.setInnerContent(n); } })
      .on("#duLoader", { element(e) { e.remove(); } })
      .transform(asset);
    const h = new Headers(out.headers);
    h.set("Cache-Control", "public, max-age=0, must-revalidate");
    h.delete("etag"); h.delete("content-length");
    return new Response(out.body, { status: 200, headers: h });
  } catch (e) {
    console.error("home ssr failed", e);
    return asset;
  }
}
