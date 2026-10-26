/** POST /api/presence — anonymous live-presence heartbeat (owner-only view). KV presence:{sid}, TTL 180s.
 * Quota-aware: only writes when the session is new, changed app/path, or last write is >100s old. */
import { getKv, clientIp } from "../_lib/community.js";
import { rateAll, ipRules } from "../_lib/ratelimit.js";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit/i;
const seen = new Map(); // in-isolate write cache

async function hashUa(ua) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ua));
  return [...new Uint8Array(d)].slice(0, 4).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const KZ = /^https:\/\/([a-z0-9-]+\.)?kerzylabs\.pages\.dev$/;
function cors(request) {
  const o = request.headers.get("Origin") || "";
  const h = { "Cache-Control": "no-store" };
  if (KZ.test(o)) Object.assign(h, { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" });
  return h;
}
export async function onRequestOptions({ request }) { return new Response(null, { status: 204, headers: cors(request) }); }

export async function onRequestPost({ request, env }) {
  const ok = new Response(null, { status: 204, headers: cors(request) });
  const origin = request.headers.get("Origin") || "";
  const kv = getKv(env);
  const ua = request.headers.get("User-Agent") || "";
  if (!kv || BOT.test(ua)) return ok;
  let b; try { b = JSON.parse((await request.text()).slice(0, 1000)); } catch { return ok; }
  if (!b || typeof b !== "object") return ok;
  const sid = typeof b.sessionId === "string" && /^[a-z0-9]{12,32}$/.test(b.sessionId) ? b.sessionId : null;
  const appId = typeof b.appId === "string" && /^[a-z0-9][a-z0-9-]{0,40}$/.test(b.appId) ? b.appId : null;
  const path = typeof b.path === "string" && /^\/[\w\-./]{0,80}$/.test(b.path) ? b.path : "/";
  if (!sid || !appId) return ok;
  if (KZ.test(origin) !== appId.startsWith("kz-")) return ok;
  const now = Date.now();
  const sig = appId + "|" + path;
  const c = seen.get(sid);
  if (c && c.sig === sig && now - c.t < 100000) return ok;
  const key = "presence:" + sid;
  if (!c) {
    const m = await kv.getWithMetadata(key).catch(() => null);
    const md = m && m.metadata;
    if (md && md.a === appId && md.p === path && now - md.w < 100000) { seen.set(sid, { sig, t: md.w }); return ok; }
  }
  if (!(await rateAll(env, ipRules("pres", clientIp(request), 20, 600, 5))).ok) return ok;
  const meta = { a: appId, p: path, w: now, u: await hashUa(ua) };
  await kv.put(key, "1", { expirationTtl: 180, metadata: meta }).catch(() => {});
  seen.set(sid, { sig, t: now });
  if (seen.size > 5000) seen.clear();
  return ok;
}
