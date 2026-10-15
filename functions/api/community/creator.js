import {
  appendRefParam,
  clientIp,
  deleteListing,
  getKv,
  isHttpsUrl,
  json,
  kvGetListing,
  normalizeTags,
  sanitizeText,
  saveListing,
} from "../../_lib/community.js";
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
import { storeSupportMessage } from "../../_lib/owner.js";

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

const UNAUTH = () => json({ error: "This dashboard link is not valid. Lost your link? Email digitalunderground.store@proton.me" }, 401);

async function rescreen(env, row) {
  try {
    const s = await screenListing(env, row);
    row.screening = { reasons: s.reasons, detail: s.detail, screenedAt: Date.now() };
    return s.decision;
  } catch (e) {
    console.error("creator rescreen error", e);
    row.screening = { reasons: ["Automatic screening failed; queued for human review."], screenedAt: Date.now() };
    return "pending";
  }
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

  if (request.method === "GET") {
    const rows = [];
    for (const id of acct.listingIds || []) {
      const row = await kvGetListing(kv, id);
      if (row && row.creatorId === acct.id) rows.push(row);
    }
    rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const stats = await readStats(kv, rows.map((r) => r.id));
    // Visiting a private link signs this device in, so the link is a one-time step.
    const extra = {};
    if (who.via === "link") {
      const c = await sessionCookie(env, acct.id);
      if (c) extra["Set-Cookie"] = c;
    }
    return json({
      signedInVia: who.via,
      account: accountView(acct),
      listings: rows.map(creatorListing),
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
    // Claim: an account opened via private link sets its email + password.
    // set_password: change password (requires current password if one exists).
    if (acct.pw && action === "claim") return json({ error: "This account already has a password. Log in with it." }, 400);
    if (acct.pw) {
      const ok = await checkPassword(kv, acct.email, String(body.currentPassword || ""));
      if (!ok || ok.id !== acct.id) return json({ error: "Current password is incorrect." }, 400);
    }
    const r = await setCredentials(kv, acct, action === "claim" ? body.email : acct.email, body.password);
    if (r.error) return json({ error: r.error }, 400);
    const c = await sessionCookie(env, acct.id);
    return json({ ok: true, account: accountView(acct) }, 200, c ? { "Set-Cookie": c } : {});
  }

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

  if (action === "delete") {
    await deleteListing(kv, id);
    acct.listingIds = (acct.listingIds || []).filter((x) => x !== id);
    await putAccount(kv, acct);
    context.waitUntil(purgeStats(kv, id).catch(() => {}));
    return json({ ok: true, deleted: id });
  }

  if (!takeEditBudget(row)) return json({ error: "Daily change limit reached for this listing. Try tomorrow." }, 429);

  if (action === "unpublish") {
    row.status = "unpublished";
    row.updatedAt = Date.now();
    await saveListing(kv, row);
    return json({ ok: true, listing: creatorListing(row) });
  }

  if (action === "republish") {
    if (row.status !== "unpublished") return json({ error: "Listing is not unpublished." }, 400);
    row.status = await rescreen(env, row);
    row.updatedAt = Date.now();
    await saveListing(kv, row);
    return json({ ok: true, listing: creatorListing(row) });
  }

  if (action === "edit") {
    const f = body.fields || {};
    const name = sanitizeText(f.name, 120);
    const pitchShort = sanitizeText(f.pitchShort, 280);
    const descriptionLong = sanitizeText(f.descriptionLong, 4000);
    const projectUrl = typeof f.projectUrl === "string" ? f.projectUrl.trim() : "";
    const imageUrl = typeof f.imageUrl === "string" ? f.imageUrl.trim() : "";
    if (!name) return json({ error: "Title is required." }, 400);
    if (!pitchShort || !descriptionLong) return json({ error: "Both descriptions are required." }, 400);
    if (!isHttpsUrl(projectUrl)) return json({ error: "Link must be a valid https URL." }, 400);
    if (imageUrl && imageUrl !== "(uploaded image)" && !isHttpsUrl(imageUrl)) {
      return json({ error: "Image URL must be https." }, 400);
    }
    row.name = name;
    row.pitchShort = pitchShort;
    row.descriptionLong = descriptionLong;
    row.projectUrl = projectUrl;
    row.visitUrl = appendRefParam(projectUrl);
    if (imageUrl && imageUrl !== "(uploaded image)") row.imageUrl = imageUrl;
    if (!row.imageUrl) return json({ error: "Add an image URL." }, 400);
    row.tags = normalizeTags(f.tags);
    const decision = await rescreen(env, row);
    // Same rules as new submissions; an unpublished listing stays hidden unless screening rejects it.
    row.status = row.status === "unpublished" && decision !== "rejected" ? "unpublished" : decision;
    row.updatedAt = Date.now();
    row.editedByCreatorAt = row.updatedAt;
    await saveListing(kv, row);
    return json({ ok: true, listing: creatorListing(row) });
  }

  return json({ error: "Unknown action." }, 400);
}
