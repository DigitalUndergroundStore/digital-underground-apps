/**
 * Signed-in creator's own account profile (header avatar + display name). Session cookie only.
 *   GET    /api/account/profile                       -> { name, avatar, custom }
 *   POST   /api/account/profile  {name}               -> set display name (1-40 chars, plain text)
 *   PUT    /api/account/profile  <image bytes>        -> set avatar. Client resizes to ~256px WEBP; server accepts
 *                                                        only PNG/JPEG/WEBP by magic bytes (never SVG), <= 400 KB.
 *   DELETE /api/account/profile                       -> remove avatar
 */
import { clientIp, getKv, json } from "../../_lib/community.js";
import { authCreatorEx, putAccount } from "../../_lib/creator.js";
import { rateAll, ipRules } from "../../_lib/ratelimit.js";
import { avatarKey, isOwnerEmail, shownAvatar } from "../../_lib/account-profile.js";

const MAX_BYTES = 400_000;
const H = { "Cache-Control": "private, no-store" };
export function sniffImage(b) {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return "";
}
const cleanName = (n) => String(n || "").replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);

export async function onRequest({ request, env }) {
  const kv = getKv(env);
  if (!kv) return json({ error: "Storage not ready." }, 503);
  const req = new Request(request.url, { headers: { Cookie: request.headers.get("Cookie") || "" } }); // cookie only, no manage-link tokens
  const who = await authCreatorEx(req, env, kv);
  if (!who || who.via !== "cookie") return json({ ok: false, error: "Log in first." }, 401, H);
  const acct = who.acct;
  const view = async () => ({ ok: true, name: acct.displayName || "", avatar: await shownAvatar(env, acct, await isOwnerEmail(env, acct.email)), custom: !!acct.avatar?.v });
  const m = request.method;
  if (m === "GET") return json(await view(), 200, H);
  const ip = clientIp(request);
  if (m === "POST") {
    if (!(await rateAll(env, [...ipRules("pfname:ip", ip, 30, 3600), ["pfname:acct:" + acct.id, 20, 3600]])).ok) return json({ ok: false, error: "Too many changes. Try again later." }, 429);
    let body = {}; try { body = await request.json(); } catch (_) {}
    const name = cleanName(body.name);
    if (!name) return json({ ok: false, error: "Enter a display name (up to 40 characters)." }, 400);
    acct.displayName = name; await putAccount(kv, acct);
    return json(await view(), 200, H);
  }
  if (m === "PUT" || m === "DELETE") {
    if (!(await rateAll(env, [...ipRules("avatar:ip", ip, 20, 3600), ["avatar:acct:" + acct.id, 10, 3600]])).ok) return json({ ok: false, error: "Too many uploads. Try again in an hour." }, 429);
    if (m === "DELETE") { await kv.delete(avatarKey(acct.id)); delete acct.avatar; await putAccount(kv, acct); return json(await view(), 200, H); }
    const len = Number(request.headers.get("Content-Length") || 0);
    if (len > MAX_BYTES) return json({ ok: false, error: "That image is too big. Use one under 2 MB." }, 413);
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) return json({ ok: false, error: "That image is too big. Use one under 2 MB." }, 413);
    const type = sniffImage(bytes);
    if (!type) return json({ ok: false, error: "Use a PNG, JPG or WEBP image." }, 415);
    await kv.put(avatarKey(acct.id), bytes, { metadata: { type } });
    acct.avatar = { v: Date.now().toString(36), type }; await putAccount(kv, acct);
    return json(await view(), 200, H);
  }
  return json({ error: "Method not allowed." }, 405);
}
