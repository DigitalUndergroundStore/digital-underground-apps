/**
 * Shared rate limiter: in-isolate Map + Cloudflare Cache API counter (per data centre, free,
 * no KV writes). An attacker hitting one data centre shares one counter across all isolates.
 * Fixed windows; returns { ok, count, limit, retryAfter }.
 */
const mem = new Map();
const HOST = "https://rl.digitalundergroundstore.com/";

export async function rateHit(key, limit, windowS) {
  const now = Date.now();
  const win = Math.floor(now / (windowS * 1000));
  const k = `${key}|${windowS}|${win}`;
  const n1 = (mem.get(k) || 0) + 1;
  mem.set(k, n1);
  if (mem.size > 20000) mem.clear();
  let n2 = 0;
  try {
    const cache = caches.default;
    const req = new Request(HOST + encodeURIComponent(k));
    const hit = await cache.match(req);
    n2 = (hit ? parseInt(await hit.text(), 10) || 0 : 0) + 1;
    const ttl = Math.max(1, Math.ceil(((win + 1) * windowS * 1000 - now) / 1000));
    await cache.put(req, new Response(String(n2), { headers: { "Cache-Control": `max-age=${ttl}` } }));
  } catch {
    /* Cache API unavailable (local dev): in-memory only. */
  }
  const count = Math.max(n1, n2);
  const retryAfter = Math.max(1, Math.ceil(((win + 1) * windowS * 1000 - now) / 1000));
  return { ok: count <= limit, count, limit, retryAfter };
}

/** All limits must pass. rules: [[key, limit, windowS], ...] */
export async function rateAll(rules) {
  let worst = null;
  for (const [key, limit, windowS] of rules) {
    const r = await rateHit(key, limit, windowS);
    if (!r.ok && (!worst || r.retryAfter > worst.retryAfter)) worst = r;
  }
  return worst ? worst : { ok: true };
}
