/** /league/ — per-product share previews: ?vote=<id> rewrites og/twitter image+title to that listing. */
import { eligible } from "../_lib/league.js";

const SITE = "https://digitalundergroundstore.com";
const FALLBACK = SITE + "/assets/promo/league-share-card.jpg";
const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function realImage(u) {
  const s = String(u || "").trim();
  if (!s || /default-cover|placeholder/i.test(s)) return null;
  if (/^https:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return SITE + s;
  return null;
}

export async function onRequestGet(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("vote");
  const res = await next();
  if (!id || !res.ok || !(res.headers.get("content-type") || "").includes("text/html")) return res;
  const l = (await eligible(url.origin)).find((x) => x.id === id);
  if (!l) return res;
  const img = attr(realImage(l.imageUrl) || FALLBACK);
  const title = attr(`Vote for ${l.name} · Maker League | Digital Underground`);
  const desc = attr(`Vote for ${l.name}${l.makerName ? " by " + l.makerName : ""} in Digital Underground's Maker League. Free, one vote per week.`);
  const vurl = attr(`${SITE}/league/?vote=${encodeURIComponent(id)}`);
  const setC = (sel, v) => ({ element(e) { e.setAttribute("content", v); } });
  // Drop League promo video/player so X/Discord show the product image, not the Builder vs Builder card.
  const drop = { element(e) { e.remove(); } };
  const out = new HTMLRewriter()
    .on('meta[property="og:image"]', setC(0, img))
    .on('meta[name="twitter:image"]', setC(0, img))
    .on('meta[property="og:title"]', setC(0, title))
    .on('meta[name="twitter:title"]', setC(0, title))
    .on('meta[property="og:description"]', setC(0, desc))
    .on('meta[name="twitter:description"]', setC(0, desc))
    .on('meta[property="og:url"]', setC(0, vurl))
    .on('meta[property="og:image:width"]', drop)
    .on('meta[property="og:image:height"]', drop)
    .on('meta[property="og:video"]', drop)
    .on('meta[property="og:video:secure_url"]', drop)
    .on('meta[property="og:video:type"]', drop)
    .on('meta[property="og:video:width"]', drop)
    .on('meta[property="og:video:height"]', drop)
    .on('meta[name="twitter:player"]', drop)
    .on('meta[name="twitter:player:width"]', drop)
    .on('meta[name="twitter:player:height"]', drop)
    .transform(res);
  const h = new Headers(out.headers); h.set("cache-control", "no-store");
  return new Response(out.body, { status: out.status, headers: h });
}
