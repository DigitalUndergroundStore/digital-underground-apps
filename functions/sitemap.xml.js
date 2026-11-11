// /sitemap.xml, self-updating (Nov 2 2026). Static pages come from the committed sitemap.xml
// (regenerate with scripts/gen-sitemap.py when static pages change); marketplace listings and
// maker profiles are added live from the listing seed + KV, so a newly approved listing or maker
// appears here on the next fetch (edge-cached 1 hour). No cron, no publish hook needed.
import { getKv } from "./_lib/community.js";
import { allLiveProfiles, makerSlugFor, slugify } from "./_lib/makers.js";
import { allPublicListings, listingUrl } from "./_lib/listing-url.js";
const SITE = "https://digitalundergroundstore.com";
const x = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

export async function onRequestGet(context) {
  const cache = caches.default, key = new Request(new URL("/sitemap.xml", context.request.url).toString());
  const hit = await cache.match(key); if (hit) return hit;
  const stat = await context.env.ASSETS.fetch(new URL("/sitemap.xml", context.request.url));
  if (!stat.ok) return stat;
  const today = new Date().toISOString().slice(0, 10);
  // drop the static snapshot's listing + maker-profile rows; live data below replaces them
  const lines = (await stat.text()).split("\n").filter((l) => !/\/community\/p\/|\/makers\/[a-z0-9-]+\/</.test(l));
  const seen = new Set(lines.map((l) => (l.match(/<loc>([^<]*)<\/loc>/) || [])[1]).filter(Boolean));
  const add = [];
  const push = (u) => { if (!seen.has(u)) { seen.add(u); add.push(`  <url><loc>${x(u)}</loc><lastmod>${today}</lastmod></url>`); } };
  // SEO posts guaranteed in sitemap even if the static snapshot lags
  for (const b of ["how-to-build-an-email-list-for-your-side-project", "side-project-landing-page", "how-to-launch-on-product-hunt-as-a-solo-maker"]) push(`${SITE}/blog/${b}/`);
  try {
    const kv = getKv(context.env);
    const [rows, profiles] = await Promise.all([allPublicListings(context), allLiveProfiles(kv).catch(() => [])]);
    for (const r of rows) push(listingUrl(r));
    const used = new Set(rows.flatMap((r) => { try { return [makerSlugFor(r), slugify(r.makerName)]; } catch { return []; } }).filter(Boolean));
    for (const p of profiles) if (p && p.slug && used.has(p.slug)) push(`${SITE}/makers/${p.slug}/`);
  } catch {}
  const body = lines.join("\n").replace("</urlset>", add.join("\n") + (add.length ? "\n" : "") + "</urlset>");
  const res = new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
  context.waitUntil(cache.put(key, res.clone()));
  return res;
}
