import { CONSENT_TEXT, GIFT_URL, normEmail, validEmail, token } from "../_lib/subscribers.js";
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const hits = new Map();
export async function onRequestPost({ request, env }) {
  const kv = env.COMMUNITY_KV; if (!kv) return J({ error: "Signup is not available right now." }, 503);
  let b; try { b = await request.json(); } catch { return J({ error: "Invalid request." }, 400); }
  if (b.website || b.company) return J({ ok: true, gift: GIFT_URL }); // honeypot: pretend success
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < 600000);
  if (h.length >= 5) return J({ error: "Too many attempts. Try again in a few minutes." }, 429);
  hits.set(ip, h.concat(now));
  const email = normEmail(b.email);
  if (!validEmail(email)) return J({ error: "Please enter a valid email address." }, 400);
  if (b.consent !== true) return J({ error: "Please tick the box to agree to receive emails." }, 400);
  const source = String(b.source || "").slice(0, 120);
  const key = "sub:" + email, prev = await kv.get(key, "json");
  const rec = { email, status: "subscribed", at: prev && prev.status === "subscribed" ? prev.at : now, source: prev?.source || source,
    consent: CONSENT_TEXT, consentAt: now, unsub: prev?.unsub || token(), country: request.cf?.country || "" };
  await kv.put(key, JSON.stringify(rec));
  return J({ ok: true, gift: GIFT_URL });
}
