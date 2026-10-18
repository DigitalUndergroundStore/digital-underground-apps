import { normEmail } from "../_lib/subscribers.js";
const page = (msg, s = 200) => new Response(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex><title>Unsubscribe · Digital Underground</title><body style="font-family:system-ui;background:#05040c;color:#eee;display:grid;place-items:center;min-height:90vh;text-align:center;padding:20px"><div><h1>Digital Underground</h1><p>${msg}</p><p><a style="color:#9d8cff" href="/store/">Back to the store</a></p></div>`, { status: s, headers: { "Content-Type": "text/html; charset=utf-8" } });
async function handle({ request, env }) {
  const u = new URL(request.url), email = normEmail(u.searchParams.get("e")), t = u.searchParams.get("t") || "";
  const kv = env.COMMUNITY_KV; if (!kv || !email || !t) return page("This unsubscribe link is incomplete. Reply to any of our emails with \"unsubscribe\" and we will remove you.", 400);
  const rec = await kv.get("sub:" + email, "json");
  if (!rec || rec.unsub !== t) return page("We could not match this link. Reply to any of our emails with \"unsubscribe\" and we will remove you.", 404);
  if (rec.status !== "unsubscribed") { rec.status = "unsubscribed"; rec.unsubAt = Date.now(); await kv.put("sub:" + email, JSON.stringify(rec)); }
  return page("You are unsubscribed. You will not get any more emails from us.");
}
export const onRequestGet = handle; export const onRequestPost = handle;
