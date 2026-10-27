/**
 * Community marketplace helpers (link-out listings, moderation queue).
 */

export const CATEGORIES = ["apps", "ai-tools", "books", "templates", "other"];

const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_IMAGE_BYTES = 750_000;
const MAX_DESC_LONG = 4000;
const MAX_DESC_SHORT = 280;

/** @type {Map<string, { count: number; reset: number }>} */
const rateByIp = new Map();

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function checkRate(ip) {
  const now = Date.now();
  let bucket = rateByIp.get(ip);
  if (!bucket || now > bucket.reset) {
    bucket = { count: 0, reset: now + RATE_WINDOW_MS };
    rateByIp.set(ip, bucket);
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT) return false;
  if (rateByIp.size > 10_000) {
    for (const [key, val] of rateByIp) {
      if (now > val.reset) rateByIp.delete(key);
    }
  }
  return true;
}

export function newListingId() {
  const t = Date.now().toString(36);
  const r = crypto.randomUUID().split("-")[0];
  return `cm_${t}_${r}`;
}

export function appendRefParam(url) {
  try {
    const u = new URL(url);
    u.searchParams.set("ref", "digitalunderground");
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Identity key for a product URL. Host is lowercased, hash and trailing slash
 * are dropped, and the marketplace `ref` param is ignored. https only.
 */
export function canonicalProjectUrl(raw) {
  try {
    const u = new URL(String(raw || "").trim());
    if (u.protocol !== "https:") return "";
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
    const entries = [...u.searchParams.entries()].filter(([k]) => k !== "ref");
    entries.sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) : a[0] < b[0] ? -1 : 1));
    u.search = "";
    for (const [k, v] of entries) u.searchParams.append(k, v);
    return u.toString();
  } catch {
    return "";
  }
}

export function normalizeXHandle(raw) {
  if (!raw || typeof raw !== "string") return "";
  const s = raw.trim().replace(/^@+/, "").replace(/\s+/g, "");
  if (!s || s.length > 40) return "";
  if (!/^[A-Za-z0-9_]{1,15}$/.test(s)) return "";
  return s;
}

export function sanitizeText(raw, maxLen) {
  if (raw == null) return "";
  const s = String(raw).replace(/\0/g, "").trim();
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

export function isValidEmail(raw) {
  if (!raw || typeof raw !== "string") return false;
  const s = raw.trim().toLowerCase();
  if (!s || s.length > 120) return false;
  // Practical RFC-ish check: local@domain.tld, no spaces
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(s);
}

export function normalizeEmail(raw) {
  return isValidEmail(raw) ? String(raw).trim().toLowerCase() : "";
}

export function isHttpsUrl(raw) {
  if (!raw || typeof raw !== "string") return false;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Optional listing video: YouTube, Vimeo, or a direct https .mp4/.webm file.
 * Returns { videoUrl: "" } when empty, { videoUrl } when valid, { error } otherwise.
 */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export function normalizeVideoUrl(raw) {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return { videoUrl: "" };
  if (!isHttpsUrl(s) || s.length > 500) return { error: "Video link must be an https YouTube, Vimeo, or .mp4/.webm URL." };
  return videoEmbed(s) ? { videoUrl: s } : { error: "Video link must be a YouTube or Vimeo page, or a direct .mp4/.webm file." };
}
/** { kind: "youtube"|"vimeo"|"file", src, type? } for a stored video URL, or null. */
export function videoEmbed(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let m;
  if (host === "youtu.be" && (m = u.pathname.match(/^\/([\w-]{11})/))) return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0` };
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v = u.searchParams.get("v");
    if (v && /^[\w-]{11}$/.test(v)) return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${v}?rel=0` };
    if ((m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/))) return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0` };
    return null;
  }
  if ((host === "vimeo.com" || host === "player.vimeo.com") && (m = u.pathname.match(/(?:^|\/)(\d{6,12})(?:\/|$)/))) return { kind: "vimeo", src: `https://player.vimeo.com/video/${m[1]}?dnt=1` };
  const ext = u.pathname.toLowerCase().match(/\.(mp4|webm)$/);
  if (ext) return { kind: "file", src: u.href, type: "video/" + ext[1] };
  return null;
}

export function parseImageField(body) {
  const url = body?.imageUrl;
  if (url && typeof url === "string" && isHttpsUrl(url)) {
    return { imageUrl: url.trim(), imageData: null };
  }
  const data = body?.imageData;
  if (data && typeof data === "string" && data.startsWith("data:image/")) {
    const comma = data.indexOf(",");
    if (comma < 0) return { error: "Invalid image upload." };
    const meta = data.slice(0, comma);
    if (!/^data:image\/(jpeg|png|webp|gif);base64$/i.test(meta)) {
      return { error: "Image must be JPEG, PNG, WebP, or GIF." };
    }
    const b64 = data.slice(comma + 1);
    const approxBytes = (b64.length * 3) / 4;
    if (approxBytes > MAX_IMAGE_BYTES) {
      return { error: "Image is too large (max about 750 KB). Use an image URL instead." };
    }
    return { imageUrl: data, imageData: data };
  }
  return { error: "Add an image URL or upload a small image." };
}

/**
 * @param {Record<string, unknown>} body
 * @returns {{ listing?: object; error?: string; status?: number }}
 */
export function validateSubmission(body) {
  if (!body || typeof body !== "object") {
    return { error: "Invalid submission.", status: 400 };
  }
  if (body.website) {
    return { error: "Rejected.", status: 400 };
  }
  const name = sanitizeText(body.name, 120);
  const projectUrl = typeof body.projectUrl === "string" ? body.projectUrl.trim() : "";
  const makerName = sanitizeText(body.makerName, 80);
  const email = normalizeEmail(body.email);
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const priceLabel = sanitizeText(body.priceLabel ?? body.price, 40) || "See site";
  const pitchShort = sanitizeText(body.pitchShort ?? body.shortDescription, MAX_DESC_SHORT);
  const descriptionLong = sanitizeText(body.descriptionLong ?? body.longDescription, MAX_DESC_LONG);
  const xHandle = normalizeXHandle(body.xHandle ?? body.twitter);
  const tags = normalizeTags(body.tags);
  const terms = body.terms === true || body.terms === "true" || body.termsAccepted === true;

  if (!name) return { error: "Project name is required.", status: 400 };
  if (!isHttpsUrl(projectUrl)) return { error: "Project URL must be a valid https link.", status: 400 };
  if (!makerName) return { error: "Maker name is required.", status: 400 };
  if (!email) {
    return { error: "A valid email is required.", status: 400 };
  }
  if (!CATEGORIES.includes(category)) {
    return { error: "Pick a category.", status: 400 };
  }
  if (!pitchShort) return { error: "Short pitch is required.", status: 400 };
  if (!descriptionLong) return { error: "Longer description is required.", status: 400 };
  if (!terms) return { error: "Accept the listing terms to continue.", status: 400 };

  const img = parseImageField(body);
  if (img.error) return { error: img.error, status: 400 };
  const vid = normalizeVideoUrl(body.videoUrl);
  if (vid.error) return { error: vid.error, status: 400 };

  const now = Date.now();
  const listing = {
    id: newListingId(),
    status: "pending",
    name,
    projectUrl,
    visitUrl: appendRefParam(projectUrl),
    makerName,
    email,
    xHandle,
    category,
    priceLabel,
    pitchShort,
    descriptionLong,
    imageUrl: img.imageUrl,
    videoUrl: vid.videoUrl,
    tags,
    createdAt: now,
    updatedAt: now,
  };
  return { listing };
}

/** Up to 6 short lowercase tags from an array or comma-separated string. */
export function normalizeTags(raw) {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const out = [];
  for (const t of list) {
    const s = String(t || "").toLowerCase().replace(/[^a-z0-9 +#.-]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= 6) break;
  }
  return out;
}

export function publicListing(row) {
  return {
    id: row.id,
    name: row.name,
    makerName: row.makerName,
    xHandle: row.xHandle || null,
    category: row.category,
    priceLabel: row.priceLabel,
    pitchShort: row.pitchShort,
    imageUrl: row.imageUrl,
    visitUrl: row.visitUrl || appendRefParam(row.projectUrl),
    projectUrl: row.projectUrl,
    tags: Array.isArray(row.tags) ? row.tags : [],
  };
}

/** Public detail view (adds long description). Never includes email or creator ids. */
export function publicListingDetail(row) {
  const up = /^upload:(v_[A-Za-z0-9_-]{16,40})$/.exec(row.videoUrl || "");
  const video = up ? { kind: "file", src: `/api/community/video?v=${up[1]}`, type: row.videoFile?.type || "video/mp4" }
    : row.videoUrl ? videoEmbed(row.videoUrl) : null;
  return { ...publicListing(row), descriptionLong: row.descriptionLong || "", video };
}

const INDEX_KEY = "community:index";

export function getKv(env) {
  return env && env.COMMUNITY_KV;
}

export async function kvGetIndex(kv) {
  const raw = await kv.get(INDEX_KEY, "json");
  if (!raw || typeof raw !== "object") {
    return { pending: [], approved: [], rejected: [], unpublished: [] };
  }
  return {
    pending: Array.isArray(raw.pending) ? raw.pending : [],
    approved: Array.isArray(raw.approved) ? raw.approved : [],
    rejected: Array.isArray(raw.rejected) ? raw.rejected : [],
    unpublished: Array.isArray(raw.unpublished) ? raw.unpublished : [],
  };
}

export async function kvSaveIndex(kv, index) {
  await kv.put(INDEX_KEY, JSON.stringify(index));
}

export async function kvGetListing(kv, id) {
  const raw = await kv.get(`community:item:${id}`, "json");
  return raw && typeof raw === "object" ? raw : null;
}

export async function kvPutListing(kv, listing) {
  await kv.put(`community:item:${listing.id}`, JSON.stringify(listing));
}

export async function kvDeleteListing(kv, id) {
  await kv.delete(`community:item:${id}`);
}

export async function listApproved(kv) {
  const index = await kvGetIndex(kv);
  const out = [];
  for (const id of index.approved) {
    const row = await kvGetListing(kv, id);
    if (row && row.status === "approved") out.push(publicListing(row));
  }
  out.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return out;
}

export async function listPending(kv) {
  const index = await kvGetIndex(kv);
  const out = [];
  for (const id of index.pending) {
    const row = await kvGetListing(kv, id);
    if (row && row.status === "pending") out.push(row);
  }
  out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return out;
}

export async function savePendingListing(kv, listing) {
  const row = { ...listing, status: listing.status || "pending" };
  return saveListing(kv, row);
}

/** Save listing and place id in the index bucket matching listing.status. */
export async function saveListing(kv, listing) {
  const status = listing.status || "pending";
  listing.status = status;
  const index = await kvGetIndex(kv);
  index.pending = index.pending.filter((x) => x !== listing.id);
  index.approved = index.approved.filter((x) => x !== listing.id);
  index.rejected = index.rejected.filter((x) => x !== listing.id);
  index.unpublished = index.unpublished.filter((x) => x !== listing.id);
  if (status === "approved") index.approved.push(listing.id);
  else if (status === "rejected") index.rejected.push(listing.id);
  else if (status === "unpublished") index.unpublished.push(listing.id);
  else index.pending.push(listing.id);
  await kvPutListing(kv, listing);
  await kvSaveIndex(kv, index);
  return listing;
}

const EMAIL_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function communitySiteOrigin(env, request) {
  const fromEnv = env?.COMMUNITY_SITE_URL;
  if (fromEnv && typeof fromEnv === "string") return fromEnv.replace(/\/$/, "");
  if (request) {
    try {
      return new URL(request.url).origin;
    } catch {
      /* ignore */
    }
  }
  return "https://digitalundergroundstore.com";
}

export async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signEmailModerationLink(env, request, id, action) {
  const token = env?.COMMUNITY_ADMIN_TOKEN;
  if (!token || !id || !action) return null;
  const exp = String(Date.now() + EMAIL_LINK_TTL_MS);
  const payload = `${id}:${action}:${exp}`;
  const sig = await hmacHex(token, payload);
  const origin = communitySiteOrigin(env, request);
  const q = new URLSearchParams({ id, action, exp, sig });
  return `${origin}/api/community/moderate-link?${q.toString()}`;
}

export async function verifyEmailModerationToken(env, { id, action, exp, sig }) {
  const token = env?.COMMUNITY_ADMIN_TOKEN;
  if (!token) return { ok: false, error: "Admin token not configured." };
  if (!id || !action || !exp || !sig) return { ok: false, error: "Missing link parameters." };
  if (action !== "approve" && action !== "reject") return { ok: false, error: "Invalid action." };
  const expMs = Number(exp);
  if (!Number.isFinite(expMs) || expMs < Date.now()) return { ok: false, error: "This link has expired." };
  const payload = `${id}:${action}:${exp}`;
  const expected = await hmacHex(token, payload);
  if (!timingSafeEqualStr(expected, sig)) return { ok: false, error: "Invalid signature." };
  return { ok: true };
}

export async function setListingStatus(kv, id, status) {
  const listing = await kvGetListing(kv, id);
  if (!listing) return null;
  const index = await kvGetIndex(kv);
  index.pending = index.pending.filter((x) => x !== id);
  index.approved = index.approved.filter((x) => x !== id);
  index.rejected = index.rejected.filter((x) => x !== id);
  index.unpublished = index.unpublished.filter((x) => x !== id);
  listing.status = status;
  listing.updatedAt = Date.now();
  // A human approval also signs off the current video, so later clean edits stay live.
  if (status === "approved" && listing.videoUrl) listing.videoApprovedUrl = listing.videoUrl;
  if (status === "approved") index.approved.push(id);
  else if (status === "pending") index.pending.push(id);
  else if (status === "rejected") index.rejected.push(id);
  else if (status === "unpublished") index.unpublished.push(id);
  await kvPutListing(kv, listing);
  await kvSaveIndex(kv, index);
  return listing;
}

export async function deleteListing(kv, id) {
  const row = await kvGetListing(kv, id);
  const up = /^upload:(v_[A-Za-z0-9_-]{16,40})$/.exec(row?.videoUrl || "");
  if (up) {
    const { deleteVideo } = await import("./video.js");
    await deleteVideo(kv, up[1]).catch(() => {});
  }
  const index = await kvGetIndex(kv);
  index.pending = index.pending.filter((x) => x !== id);
  index.approved = index.approved.filter((x) => x !== id);
  index.rejected = index.rejected.filter((x) => x !== id);
  index.unpublished = index.unpublished.filter((x) => x !== id);
  await kvDeleteListing(kv, id);
  await kvSaveIndex(kv, index);
}

export function timingSafeEqualStr(a, b) {
  const ea = new TextEncoder().encode(String(a ?? ""));
  const eb = new TextEncoder().encode(String(b ?? ""));
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0;
}

export function adminAuthorized(request, env) {
  const token = env?.COMMUNITY_ADMIN_TOKEN;
  if (!token || typeof token !== "string") return false;
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ") && timingSafeEqualStr(auth.slice(7), token)) return true;
  const header = request.headers.get("X-Community-Admin-Token");
  return header ? timingSafeEqualStr(header, token) : false;
}

export async function verifyTurnstile(env, token, ip) {
  const secret = env?.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };
  if (!token || typeof token !== "string") {
    return { ok: false, error: "Complete the security check." };
  }
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!data.success) return { ok: false, error: "Security check failed. Try again." };
  return { ok: true };
}

function statusLabel(status) {
  if (status === "approved") return "Approved (live)";
  if (status === "rejected") return "Rejected";
  return "Pending review";
}

export async function sendCommunityEmail(env, { to, subject, text, replyTo }) {
  const apiKey = env?.RESEND_API_KEY;
  const from = env?.COMMUNITY_NOTIFY_FROM || "Digital Underground <notify@digitalundergroundstore.com>";
  if (apiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    const out = { sent: res.ok, status: res.status, provider: "resend" };
    if (!res.ok) {
      try {
        out.detail = (await res.text()).slice(0, 300);
      } catch (_) {}
    }
    console.log("community notify resend", out.sent, out.status);
    return out;
  }
  if (env?.COMMUNITY_MAILCHANNELS === "1") {
    const fromEmail =
      typeof env.COMMUNITY_MAIL_FROM === "string"
        ? env.COMMUNITY_MAIL_FROM
        : "notify@digitalundergroundstore.com";
    const res = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: "Digital Underground Community" },
        subject,
        content: [{ type: "text/plain", value: text }],
      }),
    });
    return { sent: res.ok, status: res.status, provider: "mailchannels" };
  }
  return { sent: false, reason: "no_mail_configured" };
}

export async function notifySubmission(env, listing, request) {
  const to = env?.COMMUNITY_NOTIFY_EMAIL || "digitalunderground.store@proton.me";
  const status = listing.status || "pending";
  const reasons = Array.isArray(listing.screening?.reasons) ? listing.screening.reasons : [];
  const approveLink = await signEmailModerationLink(env, request, listing.id, "approve");
  const rejectLink = await signEmailModerationLink(env, request, listing.id, "reject");

  const lines = [
    `Community submission: ${listing.name}`,
    `Result: ${statusLabel(status)}`,
    `ID: ${listing.id}`,
    `Project URL: ${listing.projectUrl}`,
    `Maker: ${listing.makerName} (${listing.email})`,
    `Category: ${listing.category}`,
    "",
    listing.pitchShort,
    "",
  ];
  if (reasons.length) {
    lines.push("Screening notes:", ...reasons.map((r) => `- ${r}`), "");
  }
  if (status === "pending" && approveLink && rejectLink) {
    lines.push("One-tap moderation (7-day links):", `Approve: ${approveLink}`, `Reject: ${rejectLink}`, "");
  } else if (approveLink && rejectLink) {
    lines.push("Override (7-day links):", `Approve: ${approveLink}`, `Reject: ${rejectLink}`, "");
  }
  lines.push("Admin UI: https://digitalundergroundstore.com/owner/");

  const subject = `[Community] ${statusLabel(status)}: ${listing.name}`;
  return sendCommunityEmail(env, { to, subject, text: lines.join("\n") });
}


const CONTACT_PREFIX = "contact:";
const CONTACT_SOURCE = "developer-marketplace";

export function contactKey(email) {
  const e = normalizeEmail(email);
  return e ? CONTACT_PREFIX + e : null;
}

export async function upsertContact(kv, { email, name, listingId }) {
  const normalized = normalizeEmail(email);
  if (!kv || !normalized) return null;
  const key = CONTACT_PREFIX + normalized;
  const now = Date.now();
  let row = await kv.get(key, "json");
  if (!row || typeof row !== "object") {
    row = {
      email: normalized,
      name: "",
      listingIds: [],
      first_seen: now,
      last_seen: now,
      source: CONTACT_SOURCE,
    };
  }
  if (name && typeof name === "string") {
    const n = sanitizeText(name, 80);
    if (n) row.name = n;
  }
  row.email = normalized;
  row.last_seen = now;
  if (!row.first_seen) row.first_seen = now;
  row.source = row.source || CONTACT_SOURCE;
  const ids = Array.isArray(row.listingIds) ? row.listingIds.filter(Boolean) : [];
  if (listingId && !ids.includes(listingId)) ids.push(listingId);
  row.listingIds = ids;
  await kv.put(key, JSON.stringify(row));
  return row;
}

export async function getContact(kv, email) {
  const key = contactKey(email);
  if (!kv || !key) return null;
  const row = await kv.get(key, "json");
  return row && typeof row === "object" ? row : null;
}

export async function deleteContact(kv, email) {
  const key = contactKey(email);
  if (!kv || !key) return false;
  await kv.delete(key);
  return true;
}

export async function listContacts(kv) {
  if (!kv) return [];
  const out = [];
  let cursor;
  do {
    const page = await kv.list({ prefix: CONTACT_PREFIX, cursor, limit: 1000 });
    for (const key of page.keys || []) {
      const name = key.name || key;
      const row = await kv.get(name, "json");
      if (row && typeof row === "object" && row.email) out.push(row);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  out.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
  return out;
}

export async function backfillContactsFromListings(kv) {
  if (!kv) return { upserted: 0 };
  const index = await kvGetIndex(kv);
  const ids = [...new Set([...(index.pending || []), ...(index.approved || []), ...(index.rejected || []), ...(index.unpublished || [])])];
  let upserted = 0;
  for (const id of ids) {
    const row = await kvGetListing(kv, id);
    if (!row || !row.email) continue;
    await upsertContact(kv, { email: row.email, name: row.makerName, listingId: row.id });
    upserted += 1;
  }
  return { upserted, scanned: ids.length };
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function contactsToCsv(rows) {
  const header = ["email", "name", "listing_ids", "first_seen", "last_seen", "source"];
  const lines = [header.join(",")];
  for (const row of rows || []) {
    const ids = Array.isArray(row.listingIds) ? row.listingIds.join(" ") : "";
    lines.push(
      [
        csvEscape(row.email),
        csvEscape(row.name),
        csvEscape(ids),
        csvEscape(row.first_seen),
        csvEscape(row.last_seen),
        csvEscape(row.source || CONTACT_SOURCE),
      ].join(",")
    );
  }
  return lines.join("\n") + "\n";
}
