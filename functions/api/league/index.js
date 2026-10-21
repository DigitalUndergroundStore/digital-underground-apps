/**
 * GET  /api/league          -> { week, endsAt, standings[], eligible[], voted }
 * POST /api/league { id, hp } -> one vote per visitor per week (hashed IP + cookie).
 * Anti-fraud: honeypot, per-IP rate limit, bot user-agents ignored, per-listing spike cap
 * (votes over the cap are stored as ignored and never counted).
 */
import { getKv, json, clientIp } from "../../_lib/community.js";
import { rateAll, rateHit, ipRules } from "../../_lib/ratelimit.js";
import { weekOf, weekEndsAt, tally, eligible, rank, sha } from "../../_lib/league.js";

const COOKIE = "du_lv";
const BOT = /bot|crawl|spider|slurp|curl|wget|python|httpclient|headless|phantom|scrapy|go-http|java\//i;
const cookieOf = (req) => (req.headers.get("cookie") || "").match(/(?:^|;\s*)du_lv=([a-z0-9]{16,40})/)?.[1] || null;

async function voterKeys(request, week, cookie) {
  const ip = clientIp(request);
  const net = ip.includes(":") ? ip.split(":").slice(0, 4).join(":") : ip; // IPv6 per /64
  return { ipKey: `lg:v:${week}:${await sha("lg|" + week + "|" + net)}`, ckKey: cookie ? `lg:c:${week}:${await sha("lgc|" + week + "|" + cookie)}` : null };
}

export async function onRequestGet({ request, env }) {
  const kv = getKv(env); const week = weekOf();
  const list = await eligible(new URL(request.url).origin);
  const counts = kv ? await tally(kv, week) : new Map();
  let voted = null;
  if (kv) {
    const { ipKey, ckKey } = await voterKeys(request, week, cookieOf(request));
    voted = (await kv.get(ipKey)) || (ckKey && (await kv.get(ckKey))) || null;
    if (voted === "1") voted = true;
  }
  return json({ week, endsAt: weekEndsAt(week), standings: rank(list, counts), totalVotes: [...counts.values()].reduce((a, b) => a + b, 0),
    eligible: list.map((l) => ({ id: l.id, name: l.name, makerName: l.makerName, imageUrl: l.imageUrl })), voted }, 200, { "cache-control": "no-store" });
}

export async function onRequestPost({ request, env }) {
  const kv = getKv(env); if (!kv) return json({ ok: false, error: "Voting is unavailable right now." }, 503);
  let b; try { b = await request.json(); } catch { return json({ ok: false, error: "Bad request." }, 400); }
  if (b && b.hp) return json({ ok: true }); // honeypot: pretend success, store nothing
  const ip = clientIp(request);
  const rl = await rateAll(env, ipRules("league", ip, 10, 3600));
  if (!rl.ok) return json({ ok: false, error: "Too many tries. Try again later." }, 429);
  const week = weekOf();
  const id = String((b && b.id) || "");
  if (!(await eligible(new URL(request.url).origin)).some((l) => l.id === id)) return json({ ok: false, error: "That listing isn't in this week's league." }, 400);
  let cookie = cookieOf(request); const fresh = !cookie;
  if (fresh) cookie = [...crypto.getRandomValues(new Uint8Array(12))].map((x) => x.toString(16).padStart(2, "0")).join("");
  const { ipKey, ckKey } = await voterKeys(request, week, fresh ? null : cookie);
  if ((await kv.get(ipKey)) || (ckKey && (await kv.get(ckKey)))) return json({ ok: false, already: true, error: "You've already voted this week. Voting reopens Monday 12:00 AM ET." }, 409);
  const ua = request.headers.get("user-agent") || "";
  const spike = await rateHit(env, `lg-spike:${week}:${id}`, 40, 600); // >40 votes / 10 min for one listing = spike
  const ign = !ua || BOT.test(ua) || !spike.ok ? 1 : 0;
  const ttl = { expirationTtl: 60 * 60 * 24 * 21 };
  await kv.put(ipKey, id, { ...ttl, metadata: { l: id, ign } });
  await kv.put(`lg:c:${week}:${await sha("lgc|" + week + "|" + cookie)}`, id, ttl);
  const headers = { "set-cookie": `${COOKIE}=${cookie}; Path=/; Max-Age=${60 * 60 * 24 * 365}; Secure; HttpOnly; SameSite=Lax` };
  return json({ ok: true, voted: id }, 200, headers);
}
