/**
 * Creator dashboard v2 API (additive; the current /api/community/creator is unchanged for the live dashboard).
 *   GET                                  -> account, listings (+ images[], version, canEdit), 30-day stats
 *   GET  ?action=profile[&slug=]         -> maker page (same as v1)
 *   POST { action:"save", id, version, fields }       -> versioned edit (409 on a stale version)
 *   POST ?action=img_upload&id=&alt=&w=&h=  (raw image body) -> add a gallery image (validated + screened)
 *   POST { action:"img_remove"|"img_reorder"|"img_cover"|"img_alt", id, ... }
 * Every write resolves the listing through writableListing(): the creator's own listing, or for the owner
 * account (signed-in cookie + owner email, checked server-side) any Digital Underground / Kerzy Labs listing.
 */
import { isOwnerEmail } from "../../_lib/account-profile.js";
import { clientIp, getKv, json, kvGetIndex, kvGetListing, repairVideoHold, saveListing } from "../../_lib/community.js";
import { runImageGuard } from "../../_lib/community-screening.js";
import { accountView, authCreatorEx, creatorListing, readStats, sessionCookie, utcDay } from "../../_lib/creator.js";
import {
  GALLERY_OPS_PER_DAY, GIMG_MAX_BYTES, GIMG_MAX_PER_LISTING, cleanAlt, deleteGalleryImage, galleryList, gimgUrl,
  isIid, newIid, putGalleryImage, sniffImage, toDataUrl,
} from "../../_lib/gallery.js";
import { OWNER_MAKERS, applyEdit, onRequest as v1 } from "./creator.js";

const ownerMaker = (row) => OWNER_MAKERS.has(String(row?.makerName || "").trim().toLowerCase());
async function isMaster(env, who) { return who.via === "cookie" && (await isOwnerEmail(env, who.acct.email)); }

/** Owner check for every write. Returns the listing row or null. */
export async function writableListing(env, kv, who, id) {
  if (typeof id !== "string" || !/^cm_[a-z0-9_]{4,60}$/.test(id)) return null;
  const row = await kvGetListing(kv, id);
  if (!row) return null;
  if (row.creatorId === who.acct.id && (who.acct.listingIds || []).includes(id)) return row;
  if (ownerMaker(row) && (await isMaster(env, who))) return row;
  return null;
}

function view(row, extra = {}) {
  return {
    ...creatorListing(row),
    makerName: String(row.makerName || "").slice(0, 80),
    version: row.version || 0,
    images: galleryList(row).map((img) => ({ id: img.id, alt: img.alt || "", w: img.w || 0, h: img.h || 0, src: gimgUrl(row, img) })),
    legacyImage: !galleryList(row).length && row.imageUrl ? (row.imageUrl.startsWith("data:") ? `/api/community/img?id=${encodeURIComponent(row.id)}&v=${row.updatedAt || 0}` : row.imageUrl) : "",
    ...extra,
  };
}

function takeGalleryBudget(row) {
  const day = utcDay();
  const b = row.galleryBudget && row.galleryBudget.day === day ? row.galleryBudget : { day, n: 0 };
  if (b.n >= GALLERY_OPS_PER_DAY) return false;
  b.n += 1; row.galleryBudget = b; return true;
}

const ipHits = new Map();
function ipAllowed(ip, limit = 200, windowMs = 3600_000) {
  const now = Date.now();
  let b = ipHits.get(ip);
  if (!b || now > b.reset) ipHits.set(ip, (b = { n: 0, reset: now + windowMs }));
  b.n += 1;
  if (ipHits.size > 5000) ipHits.clear();
  return b.n <= limit;
}

async function commit(kv, row) {
  row.version = (row.version || 0) + 1;
  row.updatedAt = Date.now();
  await saveListing(kv, row);
  return json({ ok: true, listing: view(row) });
}

export async function onRequest(context) {
  const { request, env } = context;
  const kv = getKv(env);
  if (!kv) return json({ error: "Storage not configured." }, 503);
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "";
  // Profile and account-level actions are unchanged: hand them to the v1 handler.
  if (request.method === "GET" && action === "profile") return v1(context);

  const who = await authCreatorEx(request, env, kv);
  if (!who) return json({ error: "Sign in to use the dashboard." }, 401);
  const acct = who.acct;

  if (request.method === "GET") {
    const rows = [], have = new Set();
    for (const id of acct.listingIds || []) {
      const row = await kvGetListing(kv, id);
      if (row && row.creatorId === acct.id && !have.has(id)) {
        if (repairVideoHold(row)) await saveListing(kv, row);
        rows.push(view(row, { canEdit: row.status !== "flagged" })); have.add(id);
      }
    }
    const master = await isMaster(env, who);
    if (master) {
      const idx = await kvGetIndex(kv);
      for (const id of [...idx.approved, ...idx.pending, ...idx.unpublished, ...idx.flagged]) {
        if (have.has(id)) continue;
        const row = await kvGetListing(kv, id);
        if (row && ownerMaker(row)) { rows.push(view(row, { canEdit: row.status !== "flagged", ownerEdit: true })); have.add(id); }
      }
    }
    rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const stats = await readStats(kv, rows.map((r) => r.id));
    const extra = {};
    if (who.via === "link") { const c = await sessionCookie(env, acct); if (c) extra["Set-Cookie"] = c; }
    return json({ account: accountView(acct), master, listings: rows, stats }, 200, { "Cache-Control": "no-store", ...extra });
  }
  if (request.method !== "POST") return json({ error: "Use GET or POST." }, 405);
  if (!ipAllowed(clientIp(request))) return json({ error: "Too many changes. Try again later." }, 429);

  // ---- Image upload: raw bytes, so the browser can show real upload progress. ----
  if (action === "img_upload") {
    const row = await writableListing(env, kv, who, url.searchParams.get("id") || "");
    if (!row) return json({ error: "Listing not found." }, 404);
    if (row.status === "flagged") return json({ error: "This listing is on hold after visitor reports." }, 409);
    if (galleryList(row).length >= GIMG_MAX_PER_LISTING) return json({ error: `Up to ${GIMG_MAX_PER_LISTING} images per listing.` }, 400);
    const len = Number(request.headers.get("Content-Length") || 0);
    if (len > GIMG_MAX_BYTES) return json({ error: "Image is too large (max 3 MB after resizing)." }, 413);
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (!bytes.length) return json({ error: "Empty upload." }, 400);
    if (bytes.length > GIMG_MAX_BYTES) return json({ error: "Image is too large (max 3 MB after resizing)." }, 413);
    const type = sniffImage(bytes);
    if (!type) return json({ error: "Image must be JPEG, PNG or WebP." }, 415);
    if (!takeGalleryBudget(row)) return json({ error: "Daily gallery change limit reached for this listing. Try tomorrow." }, 429);
    // Same AI image check the single listing image gets; a rejected image is never stored.
    let guard;
    try { guard = await runImageGuard(env.AI, toDataUrl(bytes, type)); } catch (e) { guard = { decision: "pending", reasons: ["Image check failed."] }; }
    if (guard.decision === "rejected") return json({ error: "This image didn't pass the content check for the marketplace." }, 422);
    const w = Math.max(0, Math.min(10000, parseInt(url.searchParams.get("w"), 10) || 0));
    const h = Math.max(0, Math.min(10000, parseInt(url.searchParams.get("h"), 10) || 0));
    const iid = newIid();
    await putGalleryImage(kv, { iid, listingId: row.id, type, bytes, w, h });
    // Re-read right before writing: screening takes seconds, and another change may have landed meanwhile (KV has no transactions).
    const fresh = await kvGetListing(kv, row.id);
    if (fresh) { fresh.galleryBudget = row.galleryBudget; Object.keys(row).forEach((k) => delete row[k]); Object.assign(row, fresh); }
    if (galleryList(row).length >= GIMG_MAX_PER_LISTING) { await deleteGalleryImage(kv, iid); return json({ error: `Up to ${GIMG_MAX_PER_LISTING} images per listing.` }, 400); }
    row.images = [...galleryList(row), { id: iid, alt: cleanAlt(url.searchParams.get("alt")), w, h, type, size: bytes.length, at: Date.now(), ...(guard.decision === "approved" ? {} : { check: "pending" }) }];
    return commit(kv, row);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  const act = body.action;
  const row = await writableListing(env, kv, who, body.id);
  if (!row) return json({ error: "Listing not found." }, 404);
  if (row.status === "flagged") return json({ error: "This listing is on hold after visitor reports while we take a look. Contact support if you have questions." }, 409);

  if (act === "save") {
    const cur = row.version || 0;
    if (Number(body.version) !== cur) return json({ error: "This listing was changed somewhere else (another tab or device). Reload to get the latest version, then reapply your changes.", conflict: true, listing: view(row) }, 409);
    const { takeEditBudget } = await import("../../_lib/creator.js");
    if (!takeEditBudget(row)) return json({ error: "Daily change limit reached for this listing. Try tomorrow." }, 429);
    const res = await applyEdit(context, kv, acct, row, body.fields || {});
    if (!res.ok) return res;
    return json({ ok: true, listing: view(row) });
  }

  const imgs = galleryList(row);
  if (act === "img_remove" || act === "img_cover" || act === "img_alt") {
    const iid = String(body.imageId || "");
    const i = imgs.findIndex((x) => x.id === iid);
    if (!isIid(iid) || i < 0) return json({ error: "Image not found." }, 404);
    if (!takeGalleryBudget(row)) return json({ error: "Daily gallery change limit reached for this listing. Try tomorrow." }, 429);
    if (act === "img_remove") {
      row.images = imgs.filter((x) => x.id !== iid);
      context.waitUntil(deleteGalleryImage(kv, iid).catch(() => {}));
    } else if (act === "img_cover") {
      row.images = [imgs[i], ...imgs.filter((x) => x.id !== iid)];
    } else {
      imgs[i] = { ...imgs[i], alt: cleanAlt(body.alt) };
      row.images = imgs;
    }
    return commit(kv, row);
  }
  if (act === "img_reorder") {
    const order = Array.isArray(body.order) ? body.order.map(String) : [];
    const ids = imgs.map((x) => x.id);
    if (order.length !== ids.length || new Set(order).size !== order.length || !order.every((x) => ids.includes(x))) {
      return json({ error: "Order must list every image once.", listing: view(row) }, 400);
    }
    if (!takeGalleryBudget(row)) return json({ error: "Daily gallery change limit reached for this listing. Try tomorrow." }, 429);
    row.images = order.map((x) => imgs.find((y) => y.id === x));
    return commit(kv, row);
  }
  return json({ error: "Unknown action." }, 400);
}
