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

export function isHttpsUrl(raw) {
  if (!raw || typeof raw !== "string") return false;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:";
  } catch {
    return false;
  }
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
  const email = sanitizeText(body.email, 120);
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const priceLabel = sanitizeText(body.priceLabel ?? body.price, 40) || "See site";
  const pitchShort = sanitizeText(body.pitchShort ?? body.shortDescription, MAX_DESC_SHORT);
  const descriptionLong = sanitizeText(body.descriptionLong ?? body.longDescription, MAX_DESC_LONG);
  const xHandle = normalizeXHandle(body.xHandle ?? body.twitter);
  const terms = body.terms === true || body.terms === "true" || body.termsAccepted === true;

  if (!name) return { error: "Project name is required.", status: 400 };
  if (!isHttpsUrl(projectUrl)) return { error: "Project URL must be a valid https link.", status: 400 };
  if (!makerName) return { error: "Maker name is required.", status: 400 };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
    createdAt: now,
    updatedAt: now,
  };
  return { listing };
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
  };
}

const INDEX_KEY = "community:index";

export function getKv(env) {
  return env && env.COMMUNITY_KV;
}

export async function kvGetIndex(kv) {
  const raw = await kv.get(INDEX_KEY, "json");
  if (!raw || typeof raw !== "object") {
    return { pending: [], approved: [], rejected: [] };
  }
  return {
    pending: Array.isArray(raw.pending) ? raw.pending : [],
    approved: Array.isArray(raw.approved) ? raw.approved : [],
    rejected: Array.isArray(raw.rejected) ? raw.rejected : [],
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
  const index = await kvGetIndex(kv);
  if (!index.pending.includes(listing.id)) index.pending.push(listing.id);
  await kvPutListing(kv, listing);
  await kvSaveIndex(kv, index);
}

export async function setListingStatus(kv, id, status) {
  const listing = await kvGetListing(kv, id);
  if (!listing) return null;
  const index = await kvGetIndex(kv);
  index.pending = index.pending.filter((x) => x !== id);
  index.approved = index.approved.filter((x) => x !== id);
  index.rejected = index.rejected.filter((x) => x !== id);
  listing.status = status;
  listing.updatedAt = Date.now();
  if (status === "approved") index.approved.push(id);
  else if (status === "pending") index.pending.push(id);
  else if (status === "rejected") index.rejected.push(id);
  await kvPutListing(kv, listing);
  await kvSaveIndex(kv, index);
  return listing;
}

export async function deleteListing(kv, id) {
  const index = await kvGetIndex(kv);
  index.pending = index.pending.filter((x) => x !== id);
  index.approved = index.approved.filter((x) => x !== id);
  index.rejected = index.rejected.filter((x) => x !== id);
  await kvDeleteListing(kv, id);
  await kvSaveIndex(kv, index);
}

export function adminAuthorized(request, env) {
  const token = env?.COMMUNITY_ADMIN_TOKEN;
  if (!token || typeof token !== "string") return false;
  const auth = request.headers.get("Authorization") || "";
  if (auth === `Bearer ${token}`) return true;
  const header = request.headers.get("X-Community-Admin-Token");
  return header === token;
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

export async function notifySubmission(env, listing) {
  const apiKey = env?.RESEND_API_KEY;
  const to = env?.COMMUNITY_NOTIFY_EMAIL || "digitalunderground.store@proton.me";
  if (!apiKey) return { sent: false, reason: "no_mail_configured" };
  const from = env?.COMMUNITY_NOTIFY_FROM || "Digital Underground <notify@digitalundergroundstore.com>";
  const body = {
    from,
    to: [to],
    subject: `[Community] New listing: ${listing.name}`,
    text: [
      `Project: ${listing.name}`,
      `URL: ${listing.projectUrl}`,
      `Maker: ${listing.makerName} (${listing.email})`,
      `Category: ${listing.category}`,
      `ID: ${listing.id}`,
      "",
      listing.pitchShort,
      "",
      "Moderate via /community/admin.html or the admin API.",
    ].join("\n"),
  };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { sent: res.ok, status: res.status };
}
