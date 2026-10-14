import { clientIp, getKv, json, kvGetIndex } from "../../_lib/community.js";
import { recordEvents } from "../../_lib/creator.js";

/**
 * POST /api/community/track  body: { i: [ids], v: [ids], c: [ids] }
 * Client batches: impressions once per session per listing, detail views and clicks exact.
 * One KV read + one KV write per beacon.
 */
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  const kv = getKv(env);
  if (!kv) return new Response(null, { status: 204 });
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
