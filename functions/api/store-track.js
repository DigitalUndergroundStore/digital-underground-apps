/** POST /api/store-track — storefront beacon (one per page visit). No cookies, no personal data. */
import { getKv } from "../_lib/community.js";
import { recordStoreBeacon } from "../_lib/storestats.js";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit/i;

export async function onRequestPost({ request, env, waitUntil }) {
  const ok = new Response(null, { status: 204 });
  const kv = getKv(env);
  if (!kv || BOT.test(request.headers.get("User-Agent") || "")) return ok;
  let b;
  try { b = JSON.parse((await request.text()).slice(0, 4000)); } catch { return ok; }
  if (!b || typeof b !== "object") return ok;
  const clean = {
    pv: b.pv === 1,
    s: b.s === 1,
    m: b.m === 1,
    path: typeof b.path === "string" && /^\/[\w\-./]{0,60}$/.test(b.path) ? b.path : "/store/",
    ref: typeof b.ref === "string" ? b.ref.toLowerCase().replace(/[^a-z0-9.-]/g, "").slice(0, 60) || "direct" : "direct",
    clicks: Array.isArray(b.clicks) ? b.clicks.filter((c) => typeof c === "string").map((c) => c.replace(/[\u0000-\u001f<>]/g, "").slice(0, 70)) : [],
  };
  if (!clean.pv && !clean.clicks.length) return ok;
  waitUntil(recordStoreBeacon(kv, clean).catch(() => {}));
  return ok;
}
