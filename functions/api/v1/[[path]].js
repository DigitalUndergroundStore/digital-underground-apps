/**
 * Public Creator Listings API v1 (Bearer API key). Same validation, screening and owner approval queue
 * as the web form. New listings are never auto-published: they always wait for owner approval.
 *   GET    /api/v1/openapi.json
 *   GET    /api/v1/listings            list own listings
 *   POST   /api/v1/listings            create (status: pending)
 *   GET    /api/v1/listings/{id}       status + fields
 *   PATCH  /api/v1/listings/{id}       update own listing (re-screened; approved listings stay live)
 */
import { getKv, json, saveListing, validateSubmission, notifySubmission, kvPutListing, appendRefParam } from "../../_lib/community.js";
import { attachListing, creatorListing, ownedListing, signSession, SESSION_COOKIE } from "../../_lib/creator.js";
import { screenListing } from "../../_lib/community-screening.js";
import { authKey, takeWrite, WRITES_PER_DAY, WRITES_PER_HOUR } from "../../_lib/apikeys.js";
import { onRequest as creatorApi } from "../community/creator.js";
import { OPENAPI } from "../../_lib/openapi.js";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS" };
const out = (d, s = 200, h = {}) => json(d, s, { ...CORS, "Cache-Control": "no-store", ...h });

async function readBody(request) {
  const t = await request.text();
  if (t.length > 1_100_000) return { error: "Body too large (max ~1 MB)." };
  try { const b = JSON.parse(t || "{}"); return b && typeof b === "object" && !Array.isArray(b) ? { body: b } : { error: "Body must be a JSON object." }; }
  catch { return { error: "Invalid JSON body." }; }
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/v1\/?/, "").split("/").filter(Boolean);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (parts[0] === "openapi.json" && request.method === "GET") return out(OPENAPI, 200, { "Cache-Control": "public, max-age=3600" });
  if (parts[0] !== "listings") return out({ error: "Not found. See /api/v1/openapi.json" }, 404);

  const kv = getKv(env);
  if (!kv) return out({ error: "Storage not configured." }, 503);
  const auth = await authKey(request, kv);
  if (!auth) return out({ error: "Missing or invalid API key. Send: Authorization: Bearer duk_..." }, 401, { "WWW-Authenticate": "Bearer" });
  const { acct, key } = auth;
  const id = parts[1] || "";

  // ---- reads (not rate limited beyond Cloudflare defaults) ----
  if (request.method === "GET" && !id) {
    const rows = [];
    for (const lid of acct.listingIds || []) { const r = await ownedListing(kv, acct, lid); if (r) rows.push(creatorListing(r)); }
    return out({ listings: rows });
  }
  if (request.method === "GET" && id) {
    const r = await ownedListing(kv, acct, id);
    return r ? out({ listing: creatorListing(r) }) : out({ error: "Listing not found." }, 404);
  }

  // ---- writes ----
  if (!((request.method === "POST" && !id) || (request.method === "PATCH" && id))) return out({ error: "Method not allowed." }, 405);
  const rl = await takeWrite(kv, key.id);
  const rlh = { "X-RateLimit-Limit-Hour": String(WRITES_PER_HOUR), "X-RateLimit-Limit-Day": String(WRITES_PER_DAY), "X-RateLimit-Remaining-Hour": String(rl.remainingHour), "X-RateLimit-Remaining-Day": String(rl.remainingDay) };
  if (!rl.ok) return out({ error: "Rate limit reached for this key." }, 429, { ...rlh, "Retry-After": String(rl.retryAfter) });
  const rb = await readBody(request);
  if (rb.error) return out({ error: rb.error }, 400, rlh);
  const b = rb.body;

  if (request.method === "POST") {
    if (!acct.email) return out({ error: "Add an email to your creator account (Creator dashboard) before using the API." }, 400, rlh);
    let makerName = b.makerName || acct.name || "";
    if (!makerName) for (const lid of acct.listingIds || []) { const r = await ownedListing(kv, acct, lid); if (r && r.makerName) { makerName = r.makerName; break; } }
    if (!makerName) return out({ error: "makerName is required (your name or studio)." }, 400, rlh);
    const v = validateSubmission({ ...b, email: acct.email, makerName, website: "" });
    if (v.error) return out({ error: v.error }, v.status || 400, rlh);
    const listing = v.listing;
    listing.creatorId = acct.id;
    listing.source = "api";
    listing.apiKeyId = key.id;
    try {
      const s = await screenListing(env, listing);
      // API submissions always go to the owner approval queue, even when screening passes.
      listing.status = s.decision === "rejected" ? "rejected" : "pending";
      listing.screening = { reasons: s.decision === "approved" ? ["Submitted via API: waiting for owner approval."] : s.reasons, detail: s.detail, screenedAt: Date.now() };
    } catch {
      listing.status = "pending";
      listing.screening = { reasons: ["Automatic screening failed; queued for human review."], screenedAt: Date.now() };
    }
    await saveListing(kv, listing);
    await attachListing(kv, acct, listing.id);
    context.waitUntil(notifySubmission(env, listing, request).catch(() => {}));
    return out({ ok: true, listing: creatorListing(listing) }, 201, { ...rlh, Location: `/api/v1/listings/${listing.id}` });
  }

  // PATCH: reuse the Creator dashboard's edit action (same validation, screening, media rules, edit budget).
  const row = await ownedListing(kv, acct, id);
  if (!row) return out({ error: "Listing not found." }, 404, rlh);
  if (row.status === "approved") return revise(context, kv, acct, key, row, b, rlh);
  const fields = {
    name: b.name ?? row.name, projectUrl: b.projectUrl ?? row.projectUrl, pitchShort: b.pitchShort ?? row.pitchShort,
    descriptionLong: b.descriptionLong ?? row.descriptionLong, tags: b.tags ?? (row.tags || []).join(", "),
    imageUrl: typeof b.imageUrl === "string" ? b.imageUrl : "", videoUrl: typeof b.videoUrl === "string" ? b.videoUrl : "",
  };
  if (Array.isArray(fields.tags)) fields.tags = fields.tags.join(", ");
  if (typeof b.imageData === "string") fields.imageData = b.imageData;
  if (b.removeMedia === true) fields.removeMedia = true;
  const sess = await signSession(env, acct);
  const inner = new Request(new URL("/api/community/creator", url), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-DU-Via-Api": "1", Cookie: `${SESSION_COOKIE}=${sess}`, "CF-Connecting-IP": request.headers.get("CF-Connecting-IP") || "" },
    body: JSON.stringify({ action: "edit", id, fields }),
  });
  const r = await creatorApi({ ...context, request: inner });
  const d = await r.json().catch(() => ({}));
  return out(d.ok ? { ok: true, listing: d.listing } : { error: d.error || "Update failed." }, r.status, rlh);
}

/**
 * API edits to an approved listing never go live directly. The approved version stays public unchanged and the
 * edit is stored as row.pendingRevision for the owner to approve (applies it) or reject (discards it).
 * A newer API edit replaces an older pending revision.
 */
async function revise(context, kv, acct, key, row, b, rlh) {
  const { env, request } = context;
  const base = row.pendingRevision ? { ...row, ...row.pendingRevision.fields } : row;
  const merged = {
    name: b.name ?? base.name, projectUrl: b.projectUrl ?? base.projectUrl, pitchShort: b.pitchShort ?? base.pitchShort,
    descriptionLong: b.descriptionLong ?? base.descriptionLong, tags: b.tags ?? base.tags ?? [],
    category: row.category, priceLabel: row.priceLabel, makerName: row.makerName || "Creator", email: row.email || acct.email || "x@example.com",
    terms: true, website: "",
  };
  const hasImg = (typeof b.imageUrl === "string" && b.imageUrl) || typeof b.imageData === "string";
  if (!hasImg) merged.imageUrl = "https://digitalundergroundstore.com/store/logo.png"; // placeholder for validation only; existing image is kept
  if (hasImg) { if (typeof b.imageUrl === "string") merged.imageUrl = b.imageUrl; if (typeof b.imageData === "string") merged.imageData = b.imageData; }
  if (typeof b.videoUrl === "string" && b.videoUrl) merged.videoUrl = b.videoUrl;
  const v = validateSubmission(merged);
  if (v.error) return out({ error: v.error }, v.status || 400, rlh);
  const L = v.listing;
  const fields = { name: L.name, projectUrl: L.projectUrl, visitUrl: appendRefParam(L.projectUrl), pitchShort: L.pitchShort, descriptionLong: L.descriptionLong, tags: L.tags };
  if (hasImg) fields.imageUrl = L.imageUrl;
  else if (base.imageUrl !== row.imageUrl) fields.imageUrl = base.imageUrl;
  if (L.pendingVideo && L.pendingVideo.url) fields.videoUrl = L.pendingVideo.url;
  else if (row.pendingRevision && row.pendingRevision.fields.videoUrl) fields.videoUrl = row.pendingRevision.fields.videoUrl;
  if (b.removeMedia === true) { fields.imageUrl = ""; fields.videoUrl = ""; }
  let screening;
  try {
    const sc = await screenListing(env, { ...row, ...fields });
    if (sc.decision === "rejected") return out({ error: "This edit did not pass screening.", reasons: sc.reasons || [] }, 422, rlh);
    screening = { reasons: ["API edit: waiting for owner approval. The approved version stays live."], detail: sc.detail, screenedAt: Date.now() };
  } catch {
    screening = { reasons: ["API edit: automatic screening failed; queued for owner review."], screenedAt: Date.now() };
  }
  row.pendingRevision = { fields, at: Date.now(), keyId: key.id, screening };
  await kvPutListing(kv, row);
  context.waitUntil(notifySubmission(env, { ...row, ...fields, id: row.id, status: "pending" }, request).catch(() => {}));
  return out({ ok: true, status: "pending owner approval", message: "Your edit is waiting for owner approval. The approved version stays live until then.", listing: creatorListing(row) }, 202, rlh);
}
