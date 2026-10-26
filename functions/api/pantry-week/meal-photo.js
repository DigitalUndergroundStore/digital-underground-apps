/**
 * Pantry Week "meal I made" photos (v3.16.0). Client: src/jhagho/js/meal-share.js.
 *   POST   /api/pantry-week/meal-photo   JSON { image: dataURL(jpeg|png|webp), consent: true, consentText, recipeId, recipeName, name, w, h, appVersion }
 *          -> 201 { ok, id, url, deleteToken, status: "pending" }       public, rate limited, consent required
 *   DELETE /api/pantry-week/meal-photo?id=…&token=…                     uploader (deleteToken) or admin
 *   GET    /api/pantry-week/meal-photo?id=…                              image bytes; approved = public, pending/rejected = admin only
 *   GET    /api/pantry-week/meal-photo?action=list[&status=pending|approved|rejected]   admin
 *   GET    /api/pantry-week/meal-photo?public=1                          approved metadata (for a future gallery)
 *   POST   /api/pantry-week/meal-photo?action=approve|reject|delete&id=…  admin
 * Admin = COMMUNITY_ADMIN_TOKEN (Authorization: Bearer …) like /api/community/admin, or the owner session cookie.
 * Storage: COMMUNITY_KV pwmeal:img:<id> (bytes), pwmeal:meta:<id> (json), pwmeal:index {pending,approved,rejected}.
 * v3.16.1: uploads are auto-screened (Workers AI vision, screenMealPhoto): approved -> public; rejected -> image bytes
 *   deleted, short meta kept (expires 30 days); pending (AI down/unclear) -> admin review as before.
 * No outbound fetches.
 */
import { adminAuthorized, checkRate, clientIp, getKv, json, sanitizeText } from "../../_lib/community.js";
import { screenMealPhoto } from "../../_lib/community-screening.js";
import { ownerAuthorized, sha256Hex } from "../../_lib/owner.js";

const MAX_BYTES = 1.5 * 1024 * 1024;
const INDEX = "pwmeal:index";
const NF = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
const isId = (s) => /^pm_[a-z0-9]{6,40}$/.test(s || "");
const isAdmin = async (request, env) => adminAuthorized(request, env) || (await ownerAuthorized(request, env).catch(() => false));
const imgUrl = (id) => `/api/pantry-week/meal-photo?id=${id}`;

function sniff(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  return "";
}
async function getIndex(kv) {
  const r = (await kv.get(INDEX, "json")) || {};
  return { pending: r.pending || [], approved: r.approved || [], rejected: r.rejected || [] };
}
function move(idx, id, to) {
  for (const k of ["pending", "approved", "rejected"]) idx[k] = idx[k].filter((x) => x !== id);
  if (to) idx[to].unshift(id);
  for (const k of ["pending", "approved", "rejected"]) idx[k] = idx[k].slice(0, 2000);
}
async function remove(kv, id) {
  const idx = await getIndex(kv);
  move(idx, id, null);
  await Promise.all([kv.delete("pwmeal:meta:" + id), kv.delete("pwmeal:img:" + id), kv.put(INDEX, JSON.stringify(idx))]);
}
const strip = ({ tokenHash, ...m }) => ({ ...m, url: imgUrl(m.id) });

export async function onRequestGet({ request, env }) {
  const kv = getKv(env);
  if (!kv) return json({ error: "Storage not available." }, 503);
  const url = new URL(request.url);
  if (url.searchParams.get("action") === "list") {
    if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);
    const status = ["pending", "approved", "rejected"].includes(url.searchParams.get("status")) ? url.searchParams.get("status") : "pending";
    const idx = await getIndex(kv);
    const rows = (await Promise.all(idx[status].slice(0, 200).map((id) => kv.get("pwmeal:meta:" + id, "json")))).filter(Boolean);
    return json({ status, count: idx[status].length, photos: rows.map(strip) }, 200, { "Cache-Control": "no-store" });
  }
  if (url.searchParams.get("public")) {
    const idx = await getIndex(kv);
    const rows = (await Promise.all(idx.approved.slice(0, 100).map((id) => kv.get("pwmeal:meta:" + id, "json")))).filter(Boolean);
    return json({ photos: rows.map((m) => ({ id: m.id, url: imgUrl(m.id), recipeName: m.recipeName, name: m.name, w: m.w, h: m.h })) }, 200, { "Cache-Control": "public, max-age=300" });
  }
  const id = url.searchParams.get("id") || "";
  if (!id) return json({ ok: true, service: "pantry-week meal photos", maxBytes: MAX_BYTES }, 200, { "Cache-Control": "no-store" });
  if (!isId(id)) return NF();
  const meta = await kv.get("pwmeal:meta:" + id, "json");
  const admin = meta && meta.status !== "approved" ? await isAdmin(request, env) : false;
  if (!meta || (meta.status !== "approved" && !admin)) return NF();
  const bytes = await kv.get("pwmeal:img:" + id, "arrayBuffer");
  if (!bytes) return NF();
  return new Response(bytes, { headers: {
    "Content-Type": meta.type,
    "Cache-Control": meta.status === "approved" ? "public, max-age=86400" : "private, no-store",
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox",
  } });
}

export async function onRequestPost({ request, env }) {
  const kv = getKv(env);
  if (!kv) return json({ error: "Storage not available." }, 503);
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "";
  if (action) {
    if (!(await isAdmin(request, env))) return json({ error: "Unauthorized." }, 401);
    const id = url.searchParams.get("id") || "";
    if (!isId(id)) return json({ error: "Bad id." }, 400);
    const meta = await kv.get("pwmeal:meta:" + id, "json");
    if (!meta) return json({ error: "Not found." }, 404);
    if (action === "delete") { await remove(kv, id); return json({ ok: true, id, deleted: true }); }
    if (action !== "approve" && action !== "reject") return json({ error: "Unknown action." }, 400);
    meta.status = action === "approve" ? "approved" : "rejected";
    meta.reviewedAt = new Date().toISOString();
    const idx = await getIndex(kv);
    move(idx, id, meta.status);
    await kv.put("pwmeal:meta:" + id, JSON.stringify(meta));
    await kv.put(INDEX, JSON.stringify(idx));
    return json({ ok: true, id, status: meta.status });
  }

  if (Number(request.headers.get("Content-Length") || 0) > MAX_BYTES * 1.4 + 16384) return json({ error: "That photo is too large (max 1.5 MB)." }, 413);
  if (!(await checkRate(env, clientIp(request), "pwmeal"))) return json({ error: "Too many uploads. Try again later." }, 429);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  if (!body || body.consent !== true) return json({ error: "Please tick the consent box first." }, 400);
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/i.exec(String(body.image || ""));
  if (!m) return json({ error: "That file is not a photo." }, 400);
  let bytes;
  try { const bin = atob(m[2]); bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); }
  catch { return json({ error: "That file is not a photo." }, 400); }
  if (bytes.length > MAX_BYTES) return json({ error: "That photo is too large (max 1.5 MB)." }, 413);
  const type = sniff(bytes);
  if (!type || bytes.length < 100) return json({ error: "Only JPEG, PNG or WebP photos." }, 415);
  const id = "pm_" + Date.now().toString(36) + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const dim = (v) => Math.max(0, Math.min(10000, parseInt(v, 10) || 0));
  const meta = {
    id, type, bytes: bytes.length, w: dim(body.w), h: dim(body.h),
    recipeId: sanitizeText(body.recipeId || "", 80), recipeName: sanitizeText(body.recipeName || "", 120),
    name: sanitizeText(body.name || "", 40),
    consent: true, consentText: sanitizeText(body.consentText || "", 600), consentAt: new Date().toISOString(),
    appVersion: sanitizeText(body.appVersion || "", 20),
    status: "pending", createdAt: new Date().toISOString(),
    tokenHash: await sha256Hex("pwmeal|" + token),
  };
  let scr;
  try { scr = await screenMealPhoto(env.AI, bytes); } catch { scr = { decision: "pending", reasons: ["Screening error."], detail: {} }; }
  const status = ["approved", "rejected"].includes(scr.decision) ? scr.decision : "pending";
  meta.status = status;
  meta.screening = { decision: scr.decision, reasons: scr.reasons, ...scr.detail };
  if (status !== "pending") { meta.reviewedAt = new Date().toISOString(); meta.reviewedBy = "auto"; }
  if (status === "rejected") {
    delete meta.tokenHash; meta.imageDeleted = true;
    await kv.put("pwmeal:meta:" + id, JSON.stringify(meta), { expirationTtl: 30 * 86400 });
  } else {
    await kv.put("pwmeal:img:" + id, bytes);
    await kv.put("pwmeal:meta:" + id, JSON.stringify(meta));
  }
  const idx = await getIndex(kv);
  move(idx, id, status);
  await kv.put(INDEX, JSON.stringify(idx));
  if (status === "rejected") return json({ ok: true, id, status, reason: scr.reasons[0] || "" }, 200);
  return json({ ok: true, id, url: imgUrl(id), deleteToken: token, status }, 201);
}

export async function onRequestDelete({ request, env }) {
  const kv = getKv(env);
  if (!kv) return json({ error: "Storage not available." }, 503);
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "", token = url.searchParams.get("token") || "";
  if (!isId(id)) return NF();
  const meta = await kv.get("pwmeal:meta:" + id, "json");
  if (!meta) return NF();
  const okTok = token.length >= 32 && meta.tokenHash && (await sha256Hex("pwmeal|" + token)) === meta.tokenHash;
  if (!okTok && !(await isAdmin(request, env))) return json({ error: "Not allowed." }, 403);
  await remove(kv, id);
  return json({ ok: true, id, deleted: true });
}

export async function onRequestOptions() { return new Response(null, { status: 204 }); }
