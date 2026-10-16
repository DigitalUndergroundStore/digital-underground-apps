import { getKv, json, kvGetListing, listingContactAddress, sendCommunityEmail } from "../../_lib/community.js";

/**
 * POST /api/community/contact — private "Contact the developer" form.
 * Body: { id, name, email, message, website (honeypot) }.
 * The maker's address is looked up server-side and never returned. Rate-limited per IP.
 */
const clip = (v, n) => String(v || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
const mem = new Map();

async function limited(kv, ip) {
  const now = Date.now(), hourAgo = now - 3600e3;
  const m = (mem.get(ip) || []).filter((t) => t > hourAgo);
  if (m.length >= 5) return true;
  m.push(now); mem.set(ip, m);
  if (!kv) return false;
  const key = "contact-rl:" + ip;
  const n = parseInt((await kv.get(key)) || "0", 10) || 0;
  if (n >= 5) return true;
  await kv.put(key, String(n + 1), { expirationTtl: 3600 });
  return false;
}

async function findListing(request, kv, id) {
  const row = kv ? await kvGetListing(kv, id) : null;
  if (row && row.status === "approved") return row;
  try {
    const res = await fetch(new URL("/community/listings.json", request.url), { headers: { Accept: "application/json" } });
    const data = res.ok ? await res.json() : [];
    return (Array.isArray(data) ? data : data?.listings || []).find((r) => r && r.id === id) || null;
  } catch { return null; }
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return json({ ok: false, error: "Use POST." }, 405);
  let b = {};
  try { b = await request.json(); } catch { return json({ ok: false, error: "Bad request." }, 400); }
  if (b.website) return json({ ok: true }); // honeypot: pretend success
  const id = String(b.id || "");
  if (!/^cm_[a-z0-9_]{4,40}$/.test(id)) return json({ ok: false, error: "Listing not found." }, 404);
  const name = clip(b.name, 100), email = clip(b.email, 200).toLowerCase();
  const message = String(b.message || "").replace(/\r/g, "").trim().slice(0, 5000);
  if (!name) return json({ ok: false, error: "Please add your name." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, error: "Please add a valid email." }, 400);
  if (message.length < 10) return json({ ok: false, error: "Please write a message (at least 10 characters)." }, 400);
  const kv = getKv(env);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (await limited(kv, ip)) return json({ ok: false, error: "Too many messages. Please try again later." }, 429);
  const row = await findListing(request, kv, id);
  const to = listingContactAddress(env, row);
  if (!row || !to) return json({ ok: false, error: "This developer can't be contacted here." }, 404);
  const page = `https://digitalundergroundstore.com/community/p/?id=${encodeURIComponent(id)}`;
  const text = [
    `New message about your listing "${row.name}" on the Digital Underground Developer Marketplace.`,
    "",
    `From: ${name} <${email}>`,
    `Listing: ${page}`,
    "",
    message,
    "",
    "Reply to this email to answer them directly. Your address was not shown to them.",
  ].join("\n");
  let r = { sent: false };
  try { r = await sendCommunityEmail(env, { to, subject: `Message about ${clip(row.name, 80)} from ${name}`, text, replyTo: email }); } catch {}
  return r && r.sent ? json({ ok: true }) : json({ ok: false, error: "Couldn't send right now. Please try again." }, 502);
}
