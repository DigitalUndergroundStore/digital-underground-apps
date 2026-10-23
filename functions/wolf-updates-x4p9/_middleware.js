// Password gate for Wolf's private updates page (HTTP Basic, user "wolf"). Hash of "user:pass".
const HASH = "5e6fb96d583dcc6bc03affbe3db2d234e26da353b610f6d384269747e06aa200";
async function sha(s) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
export async function onRequest(ctx) {
  const a = ctx.request.headers.get("authorization") || "";
  if (a.startsWith("Basic ")) { try { if ((await sha(atob(a.slice(6)))) === HASH) { const r = await ctx.next(); const res = new Response(r.body, r); res.headers.set("cache-control", "private, no-store"); res.headers.set("x-robots-tag", "noindex"); return res; } } catch {} }
  return new Response("Password required", { status: 401, headers: { "www-authenticate": 'Basic realm="Wolf updates", charset="UTF-8"', "cache-control": "no-store", "x-robots-tag": "noindex" } });
}
