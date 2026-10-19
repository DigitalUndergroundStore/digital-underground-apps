/**
 * Shared rate limiter backed by a Durable Object in the "du-ratelimit" worker (workers/du-ratelimit),
 * called over HTTPS with the RL_TOKEN secret: one global counter per key across every Cloudflare server.
 * Falls back to an in-isolate Map when RL_TOKEN is missing (local dev) or the call fails
 * (fail open for users, still bounded per isolate).
 * Fixed windows; returns { ok, count, limit, retryAfter }.
 */
const mem = new Map();
const RL_URL = "https://rl.digitalundergroundstore.com/hit"; // Custom Domain: same-account workers.dev fetches fail (1042)

function memHit(key, limit, windowS) {
  const now = Date.now();
  const win = Math.floor(now / (windowS * 1000));
  const k = `${key}|${windowS}|${win}`;
  const n = (mem.get(k) || 0) + 1;
  mem.set(k, n);
  if (mem.size > 20000) mem.clear();
  return { ok: n <= limit, count: n, limit, retryAfter: Math.max(1, Math.ceil(((win + 1) * windowS * 1000 - now) / 1000)) };
}

export async function rateHit(env, key, limit, windowS) {
  const local = memHit(key, limit, windowS);
  if (!local.ok) return local;
  const token = env && env.RL_TOKEN;
  if (!token) return local;
  try {
    const res = await fetch(RL_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ key, limit, window: windowS }),
    });
    if (!res.ok) throw new Error("rl http " + res.status);
    const d = await res.json();
    return { ok: !!d.ok, count: d.count, limit, retryAfter: d.retryAfter || local.retryAfter };
  } catch (e) {
    console.error("ratelimit DO error", e && e.message);
    return local;
  }
}

/** All limits must pass. rules: [[key, limit, windowS], ...]. Stops at the first limit hit. */
export async function rateAll(env, rules) {
  for (const [key, limit, windowS] of rules) {
    const r = await rateHit(env, key, limit, windowS);
    if (!r.ok) return r;
  }
  return { ok: true };
}

function expandV6(ip) {
  let [head, tail] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined ? (tail ? tail.split(":") : []) : [];
  const fill = tail !== undefined ? new Array(Math.max(0, 8 - h.length - t.length)).fill("0") : [];
  return [...h, ...fill, ...t].map((x) => x.toLowerCase().padStart(4, "0"));
}
/**
 * IPv6 clients can rotate addresses inside their /64 (and providers hand out whole /48s),
 * so limits apply per /64 and, more loosely, per /48. IPv4 is per address.
 * Returns rules for rateAll: [[prefix:addr, limit], [prefix:/48, limit * wideFactor]] with the window.
 */
/** Short one-way hash so rate-limit keys never contain a raw IP address. */
export function ipHash(s) {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
  const str = "du-rl-v1|" + String(s || "");
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x5bd1e995) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

export function ipRules(prefix, ip, limit, windowS, wideFactor = 4) {
  if (ip && ip.includes(":")) {
    const g = expandV6(ip);
    return [
      [`${prefix}:${ipHash(g.slice(0, 4).join(":") + "::/64")}`, limit, windowS],
      [`${prefix}:${ipHash(g.slice(0, 3).join(":") + "::/48")}`, limit * wideFactor, windowS],
    ];
  }
  return [[`${prefix}:${ipHash(ip)}`, limit, windowS]];
}
