import { isOwnerEmail } from "../../_lib/account-profile.js";
import {
  appendRefParam,
  clientIp,
  deleteListing,
  getKv,
  isHttpsUrl,
  json,
  kvGetListing,
  kvGetIndex,
  normalizeTags,
  normalizeVideoUrl,
  parseImageField,
  repairVideoHold,
  sanitizeText,
  saveListing, normalizeStage, normalizeStatusLabel, isReturningMaker, notifySubmission } from "../../_lib/community.js";
import { screenListing } from "../../_lib/community-screening.js";
import {
  accountView,
  authCreatorEx,
  checkPassword,
  setCredentials,
  clearSessionCookie,
  sessionCookie,
  creatorListing,
  ownedListing,
  purgeStats,
  putAccount,
  readStats,
  screenSupportMessage,
  sendSupportEmail,
  takeEditBudget,
  takeSupportBudget,
} from "../../_lib/creator.js";
import { deleteVideo, uploadVid } from "../../_lib/video.js";
import { storeSupportMessage } from "../../_lib/owner.js";
import { creatorProfileView, getMaker, makerSlugFor, sanitizeProfile, slugify, submitProfile, validSlug } from "../../_lib/makers.js";

/** Maker pages this account may edit: one per distinct maker name across its own listings. */
async function ownedMakers(kv, acct) {
  const out = new Map();
  for (const id of acct.listingIds || []) {
    const row = await kvGetListing(kv, id);
    if (!row || row.creatorId !== acct.id) continue;
    const slug = makerSlugFor(row) || slugify(row.makerName);
    if (validSlug(slug) && !out.has(slug)) out.set(slug, row.makerName || slug);
  }
  return out;
}

/** Per-IP burst limit for creator write actions (per isolate). */
const ipHits = new Map();
function ipAllowed(ip, limit = 30, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  let b = ipHits.get(ip);
  if (!b || now > b.reset) ipHits.set(ip, (b = { n: 0, reset: now + windowMs }));
  b.n += 1;
  if (ipHits.size > 5000) ipHits.clear();
  return b.n <= limit;
}


/** Maker page editor: read (GET ?action=profile, not rate-limited) or submit for review (POST action=profile_save). */
async function profileAction(env, kv, acct, body, save) {
  const makers = await ownedMakers(kv, acct);
  if (!makers.size) return json({ error: "Publish a listing first; your maker page is built from your listings." }, 400);
  const slug = validSlug(body.slug) && makers.has(body.slug) ? body.slug : [...makers.keys()][0];
  let rec = await getMaker(kv, slug);
  if (rec && rec.ownerAcct && rec.ownerAcct !== acct.id) return json({ error: "This maker page belongs to another account. Contact support." }, 403);
  if (save) {
    const v = sanitizeProfile(body.profile || {}, makers.get(slug));
    if (v.error) return json({ error: v.error }, 400);
    const r = await submitProfile(env, kv, acct, slug, v.profile);
    if (r.error) return json({ error: r.error }, 400);
    rec = r.rec;
  }
  return json({ ok: true, makers: [...makers].map(([s, n]) => ({ slug: s, name: n })), profile: creatorProfileView(rec, slug, makers.get(slug)) });
}

const UNAUTH = () => json({ error: "This dashboard link is not valid. Lost your link? Email digitalunderground.store@proton.me" }, 401);

export async function rescreen(env, row, returning = false) {
  try {
    const s = await screenListing(env, row);
    row.screening = { reasons: s.reasons, detail: s.detail, screenedAt: Date.now() };
    // A listing the owner already approved can stay live on a passing re-screen, and so can a
    // returning maker's (another listing already approved) pending/unpublished one. Rejected
    // listings and first-time makers' listings go to the owner queue.
    // Any maker's listing goes live once it passes the automatic checks.
    if (s.decision === "approved" && row.status !== "approved" && row.status !== "rejected") {
      row.screening.reasons = ["Passed automatic checks: auto-approved."];
      row.autoApprovedAt = Date.now();
      return "approved";
    }
    if (s.decision === "approved" && row.status !== "approved" && !(row.status === "unpublished" && row.ownerApprovedAt)) {
      row.screening.reasons = ["Passed automatic checks: waiting for owner approval."];
      return "pending";
    }
    return s.decision;
  } catch (e) {
    console.error("creator rescreen error", e);
    row.screening = { reasons: ["Automatic screening failed; queued for human review."], screenedAt: Date.now() };
    return "pending";
  }
}

export const OWNER_MAKERS = new Set(["digital underground", "kerzy labs"]);

/** Shared edit logic (current dashboard "edit" and dashboard v2 "save"). Caller has already checked write access. */
export async function applyEdit(context, kv, acct, row, f) {
  const { request, env } = context;
  const name = sanitizeText(f.name, 120);
  const pitchShort = sanitizeText(f.pitchShort, 280);
  const descriptionLong = sanitizeText(f.descriptionLong, 4000);
  const projectUrl = typeof f.projectUrl === "string" ? f.projectUrl.trim() : "";
  const imageUrl = typeof f.imageUrl === "string" ? f.imageUrl.trim() : "";
  if (!name) return json({ error: "Title is required." }, 400);
  const stage = f.stage === undefined || f.stage === null || f.stage === "" ? (row.stage || "Released") : normalizeStage(f.stage);
  if (!stage) return json({ error: "Pick a valid stage." }, 400);
  if (!pitchShort || !descriptionLong) return json({ error: "Both descriptions are required." }, 400);
  if (!isHttpsUrl(projectUrl)) return json({ error: "Link must be a valid https URL." }, 400);
  if (imageUrl && imageUrl !== "(uploaded image)" && !isHttpsUrl(imageUrl)) {
    return json({ error: "Image URL must be https." }, 400);
  }
  row.name = name;
  row.stage = stage;
  if (f.statusLabel !== undefined) { const sl = normalizeStatusLabel(f.statusLabel); if (sl) row.statusLabel = sl; else delete row.statusLabel; }
  row.pitchShort = pitchShort;
  row.descriptionLong = descriptionLong;
  row.projectUrl = projectUrl;
  row.visitUrl = appendRefParam(projectUrl);
  // One media slot: a video (when present) is the display media; the image is its poster/fallback.
  const drop = [];
  const curVid = uploadVid(row.videoUrl), penVid = uploadVid(row.pendingVideo && row.pendingVideo.url);
  const clearVideos = () => {
    if (curVid) drop.push(curVid);
    if (penVid) drop.push(penVid);
    delete row.videoUrl; delete row.videoFile; delete row.pendingVideo; delete row.videoApprovedUrl;
  };
  if (f.removeMedia === true || f.removeImage === true) {
    row.imageUrl = "";
    if (f.removeMedia === true) clearVideos();
  } else if (typeof f.imageData === "string" && f.imageData) {
    const img = parseImageField({ imageData: f.imageData });
    if (img.error) return json({ error: img.error }, 400);
    row.imageUrl = img.imageUrl;
    if (f.replaceVideo !== false) clearVideos();
  } else if (imageUrl && imageUrl !== "(uploaded image)") {
    row.imageUrl = imageUrl;
  }
  const v = typeof f.videoUrl === "string" ? f.videoUrl.trim() : "";
  if (v && !v.startsWith("upload:") && v !== row.videoUrl && v !== (row.pendingVideo && row.pendingVideo.url)) {
    const vid = normalizeVideoUrl(v);
    if (vid.error) return json({ error: vid.error }, 400);
    if (penVid) drop.push(penVid);
    row.pendingVideo = { url: vid.videoUrl, at: Date.now() };
    if (vid.videoUrl === row.videoApprovedUrl) { row.videoUrl = vid.videoUrl; delete row.videoFile; delete row.pendingVideo; }
  }
  const decision = await rescreen(env, row, await isReturningMaker(kv, acct, row.id));
  // Same rules as new submissions; an unpublished listing stays hidden unless screening rejects it.
  const prevStatus = row.status;
  row.status = row.status === "unpublished" && decision !== "rejected" ? "unpublished" : decision;
  // API edits never publish: a listing that wasn't already approved stays in the owner queue.
  row.version = (row.version || 0) + 1; // optimistic-concurrency counter shared with dashboard v2
  row.updatedAt = Date.now();
  row.editedByCreatorAt = row.updatedAt;
  await saveListing(kv, row);
  // Owner gets the usual email when an edit takes a not-yet-live listing live (returning maker).
  if (prevStatus !== "approved" && row.status === "approved") context.waitUntil(notifySubmission(env, row, request).catch(() => {}));
  if (drop.length) context.waitUntil(Promise.all(drop.map((d) => deleteVideo(kv, d).catch(() => {}))));
  return json({ ok: true, listing: creatorListing(row) });
}

export async function onRequest(context) {
  const { request, env } = context;
  const kv = getKv(env);
  if (!kv) return json({ error: "Storage not configured." }, 503);
  if (request.method === "POST" && new URL(request.url).searchParams.get("action") === "signout") {
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
  }
  const who = await authCreatorEx(request, env, kv);
  if (!who) return UNAUTH();
  const acct = who.acct;

  if (request.method === "GET" && new URL(request.url).searchParams.get("action") === "profile") {
    return profileAction(env, kv, acct, { slug: new URL(request.url).searchParams.get("slug") }, false);
  }
  if (request.method === "GET") {
    const rows = [];
    for (const id of acct.listingIds || []) {
      const row = await kvGetListing(kv, id);
      if (row && row.creatorId === acct.id) {
        if (repairVideoHold(row)) await saveListing(kv, row);
        rows.push(row);
      }
    }
    // Owner master view (server-side check only): also every Digital Underground + Kerzy Labs listing, read-only
    // unless the owner account already owns it. No KV ownership changes.
    let master = false;
    if (who.via === "cookie" && (await isOwnerEmail(env, acct.email))) {
      master = true;
      const have = new Set(rows.map((r) => r.id)), idx = await kvGetIndex(kv);
      for (const id of [...idx.approved, ...idx.pending, ...idx.unpublished, ...idx.flagged]) {
        if (have.has(id)) continue;
        const row = await kvGetListing(kv, id);
        if (row && OWNER_MAKERS.has(String(row.makerName || "").trim().toLowerCase())) { rows.push({ ...row, _viewOnly: true }); have.add(id); }
      }
    }
    rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const stats = await readStats(kv, rows.map((r) => r.id));
    // Visiting a private link signs this device in, so the link is a one-time step.
    const extra = {};
    if (who.via === "link") {
      const c = await sessionCookie(env, acct);
      if (c) extra["Set-Cookie"] = c;
    }
    return json({
      signedInVia: who.via,
      account: accountView(acct),
      listings: rows.map((r) => ({ ...creatorListing(r), makerName: String(r.makerName || "").slice(0, 80), ...(r._viewOnly ? { viewOnly: true } : {}) })),
      ...(master ? { master: true } : {}),
      stats,
      supportLeftToday: Math.max(0, 5 - (acct.support?.day === new Date().toISOString().slice(0, 10).replace(/-/g, "") ? acct.support.n : 0)),
    }, 200, extra);
  }
  if (request.method !== "POST") return json({ error: "Use GET or POST." }, 405);
  if (!ipAllowed(clientIp(request))) return json({ error: "Too many changes. Try again later." }, 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const action = body.action;

  if (action === "claim" || action === "set_password") {
    if (body.passwordConfirm != null && body.passwordConfirm !== body.password) {
      return json({ error: "Passwords don't match." }, 400);
    }
    // Claim: an account opened via private link sets its email + password.
    // set_password: change password (requires current password if one exists).
    if (acct.pw && action === "claim") return json({ error: "This account already has a password. Log in with it." }, 400);
    if (acct.pw) {
      const ok = await checkPassword(kv, acct.email, String(body.currentPassword || ""));
      if (!ok || ok.id !== acct.id) return json({ error: "Current password is incorrect." }, 400);
    }
    const r = await setCredentials(kv, acct, action === "claim" ? body.email : acct.email, body.password);
    if (r.error) return json({ error: r.error }, 400);
    const c = await sessionCookie(env, acct);
    return json({ ok: true, account: accountView(acct) }, 200, c ? { "Set-Cookie": c } : {});
  }

  if (action === "api_keys" || action === "api_key_create" || action === "api_key_revoke") {
    const { createKey, revokeKey, publicKey } = await import("../../_lib/apikeys.js");
    if (action === "api_key_create") {
      const r = await createKey(kv, acct, body.label);
      if (r.error) return json({ error: r.error }, 400);
      return json({ ok: true, key: r.key, info: r.info, keys: (acct.apiKeys || []).map(publicKey) });
    }
    if (action === "api_key_revoke") {
      if (!(await revokeKey(kv, acct, String(body.keyId || "")))) return json({ error: "Key not found." }, 404);
    }
    return json({ ok: true, keys: (acct.apiKeys || []).map(publicKey) });
  }

  if (action === "profile_save") return profileAction(env, kv, acct, body, true);

  if (action === "support") {
    const subject = sanitizeText(body.subject, 120);
    const message = sanitizeText(body.message, 4000);
    if (!subject || !message) return json({ error: "Add a subject and a message." }, 400);
    const flagged = screenSupportMessage(subject, message);
    if (flagged) return json({ error: flagged }, 400);
    let listing = null;
    if (body.listingId) {
      listing = await ownedListing(kv, acct, String(body.listingId));
      if (!listing) return json({ error: "Pick one of your listings." }, 400);
    }
    if (!takeSupportBudget(acct)) return json({ error: "Daily message limit reached (5). Email digitalunderground.store@proton.me instead." }, 429);
    await putAccount(kv, acct);
    // Reply-to: the email on the selected listing, else the most recent listing's email.
    let replyTo = acct.email || listing?.email || "";
    if (!replyTo) {
      for (const id of [...(acct.listingIds || [])].reverse()) {
        const r = await kvGetListing(kv, id);
        if (r?.email) { replyTo = r.email; break; }
      }
    }
    try {
      await storeSupportMessage(kv, {
        subject,
        message,
        replyTo,
        creatorId: acct.id,
        listingId: listing?.id || "",
        listingName: listing?.name || "",
      });
    } catch (e) {
      console.error("support kv store error", e);
    }
    const out = await sendSupportEmail(env, { acct, replyTo, subject, message, listing });
    if (!out.sent) return json({ ok: true, message: "Saved in your Owner inbox. Email delivery failed — we'll still see it there.", stored: true, emailed: false });
    return json({ ok: true, message: "Sent, we'll reply by email.", stored: true, emailed: true });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const row = await ownedListing(kv, acct, id);
  if (!row) return json({ error: "Listing not found." }, 404);
  if (row.status === "flagged" && action !== "delete") {
    return json({ error: "This listing is on hold after visitor reports while we take a look. Contact support if you have questions." }, 409);
  }

  if (action === "delete") {
    await deleteListing(kv, id);
    acct.listingIds = (acct.listingIds || []).filter((x) => x !== id);
    await putAccount(kv, acct);
    context.waitUntil(purgeStats(kv, id).catch(() => {}));
    return json({ ok: true, deleted: id });
  }

  if (!takeEditBudget(row)) return json({ error: "Daily change limit reached for this listing. Try tomorrow." }, 429);

  if (action === "set_cover") {
    // Cover (poster) frame captured client-side from the creator's own uploaded video.
    const img = parseImageField({ imageData: typeof body.imageData === "string" ? body.imageData : "" });
    if (img.error || !img.imageData) return json({ error: img.error || "Cover must be an uploaded image." }, 400);
    const toPending = body.target === "pending" && row.pendingVideo && row.pendingVideo.url;
    if (toPending) row.pendingVideo.poster = img.imageData;
    else if (row.videoUrl) row.imageUrl = img.imageData;
    else return json({ error: "This listing has no video to set a cover for." }, 400);
    row.updatedAt = Date.now();
    await saveListing(kv, row);
    return json({ ok: true, listing: creatorListing(row) });
  }

  if (action === "unpublish") {
    row.status = "unpublished";
    row.updatedAt = Date.now();
    await saveListing(kv, row);
    return json({ ok: true, listing: creatorListing(row) });
  }

  if (action === "republish") {
    if (row.status !== "unpublished") return json({ error: "Listing is not unpublished." }, 400);
    row.status = await rescreen(env, row, await isReturningMaker(kv, acct, row.id));
    row.updatedAt = Date.now();
    await saveListing(kv, row);
    if (row.status === "approved") context.waitUntil(notifySubmission(env, row, request).catch(() => {}));
    return json({ ok: true, listing: creatorListing(row) });
  }

  if (action === "edit") return applyEdit(context, kv, acct, row, body.fields || {});

  return json({ error: "Unknown action." }, 400);
}
