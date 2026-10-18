import { clientIp, getKv, json, kvGetIndex } from "../../_lib/community.js";
import { recordEvents } from "../../_lib/creator.js";
import { rateAll } from "../../_lib/ratelimit.js";

/**
 * POST /api/community/track  body: { i: [ids], v: [ids], c: [ids] }
 * Client batches: impressions once per session per listing, detail views and clicks exact.
 * Counts are buffered per isolate and flushed to KV at most every 30 s (one read + one write per flush).
 */
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  const kv = getKv(env);
  if (!kv) return new Response(null, { status: 204 });
  // Per-IP throttle (a real visitor sends a handful of beacons per page view).
  const rl = await rateAll([["trk:" + clientIp(request), 60, 600], ["trkh:" + clientIp(request), 200, 3600]]);
  if (!rl.ok) return new Response(null, { status: 429, headers: { "Retry-After": String(rl.retryAfter), "Cache-Control": "no-store" } });
  let body;
  try {
    const text = await request.text();
    if (text.length > 8000) return new Response(null, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  try {
    const index = await kvGetIndex(kv);
    await recordEvents(kv, index.approved, body, clientIp(request));
  } catch (e) {
    console.error("community track error", e);
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
