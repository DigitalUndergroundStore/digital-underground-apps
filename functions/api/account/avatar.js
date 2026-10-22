/** GET /api/account/avatar?id=<acctId>&v=<ver> -> stored avatar bytes (PNG/JPEG/WEBP only, sniffed at upload). */
import { getKv } from "../../_lib/community.js";
import { avatarKey } from "../../_lib/account-profile.js";
const OK = new Set(["image/png", "image/jpeg", "image/webp"]);
export async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get("id") || "";
  const kv = getKv(env);
  if (!kv || !/^ca_[\w-]{6,40}$/.test(id)) return new Response("Not found", { status: 404 });
  const r = await kv.getWithMetadata(avatarKey(id), "arrayBuffer");
  const type = r?.metadata?.type;
  if (!r?.value || !OK.has(type)) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(r.value, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=604800, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
}
