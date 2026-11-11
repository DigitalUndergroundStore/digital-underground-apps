import { clientIp, getKv } from "../../_lib/community.js";
import { recordShare } from "../../_lib/share-track.js";

/**
 * POST /api/track/share
 * body: { surface, path, id?, title?, t? }
 * surface: listing | league | featured | nav | other
 * Stores a count for the owner HUD only. No email, no chat, no PII.
 * 204 even when the click is dropped, so the share sheet is never blocked.
 */
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
  }
  const kv = getKv(env);
  if (!kv) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

  let body = null;
  try {
    const text = await request.text();
    if (text.length > 2000) return new Response(null, { status: 413, headers: { "Cache-Control": "no-store" } });
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    await recordShare(kv, body, clientIp(request));
  } catch (e) {
    console.error("share track error", e);
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
