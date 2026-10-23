// Wolf fix-request box. Protected by ../_middleware.js (Basic auth).
const MAX = 1500, DAILY = 20;
const TOPIC = /\b(site|website|page|pages|marketplace|listing|listings|league|button|buttons|link|links|card|cards|bug|bugs|fix|fixes|profile|video|videos|image|images|mobile|layout|api)\b/i;
const OFF = "This box is only for Digital Underground site/marketplace fixes.";
const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestGet({ env }) {
  const kv = env.COMMUNITY_KV; const items = []; let cursor;
  do { const r = await kv.list({ prefix: "wolf:fix:", cursor }); for (const k of r.keys) { const v = await kv.get(k.name, "json"); if (v) items.push({ key: k.name, text: v.text, ts: v.ts, status: v.status, replies: Array.isArray(v.replies) ? v.replies : [] }); } cursor = r.list_complete ? null : r.cursor; } while (cursor);
  items.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  return j({ items });
}

export async function onRequestPost({ request, env }) {
  let text = "";
  try { const b = await request.json(); text = typeof b.text === "string" ? b.text.trim() : ""; } catch { return j({ error: "Invalid request." }, 400); }
  if (!text) return j({ error: "Please describe the fix." }, 400);
  if (text.length > MAX) return j({ error: `Please keep it under ${MAX} characters.` }, 400);
  if (!TOPIC.test(text)) return j({ error: OFF }, 422);
  const kv = env.COMMUNITY_KV; const day = new Date().toISOString().slice(0, 10); const rk = `wolf:fixrate:${day}`;
  const n = parseInt((await kv.get(rk)) || "0", 10);
  if (n >= DAILY) return j({ error: "Daily limit reached (20 requests). Please try again tomorrow." }, 429);
  await kv.put(rk, String(n + 1), { expirationTtl: 172800 });
  const ts = new Date().toISOString(); const item = { text, ts, status: "new", replies: [] };
  await kv.put(`wolf:fix:${ts}`, JSON.stringify(item));
  return j({ ok: true, item });
}
