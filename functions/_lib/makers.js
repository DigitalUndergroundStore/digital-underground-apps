// Creator (maker) profiles: /makers/ directory and /makers/<slug>/ pages.
// KV layout: "maker:<slug>" = { slug, ownerAcct, live, pending, updatedAt }, "maker:index" = { approved:[], pending:[] }.
// A maker page is created automatically when the maker's first listing goes live (ensureMakerForListing).
// Later profile edits go live right away when they pass automatic screening; only flagged ones wait for the owner.
import { isHttpsUrl, normalizeEmail, publicListing } from "./community.js";
import { runBlocklist, runTextGuard, runImageGuard, isPublicHost } from "./community-screening.js";

export const MAX_LOGO_BYTES = 100 * 1024;
export const MAX_BANNER_BYTES = 300 * 1024;
const LIMITS = { name: 60, bio: 400, url: 200 };
export const SOCIALS = ["x", "github", "youtube", "linkedin", "instagram", "mastodon", "bluesky", "discord"];
const SOCIAL_LABEL = { x: "X", github: "GitHub", youtube: "YouTube", linkedin: "LinkedIn", instagram: "Instagram", mastodon: "Mastodon", bluesky: "Bluesky", discord: "Discord" };
export const socialLabel = (k) => SOCIAL_LABEL[k] || k;

export function slugify(name) {
  return String(name || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}
export const validSlug = (s) => typeof s === "string" && /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(s);

/** Owner-curated seed profiles (shown until/unless an approved KV profile replaces them). Plain text only. */
export const SEED = {
  wolfitway: {
    slug: "wolfitway", name: "Wolfitway",
    bio: "One-person software studio run by Dan in Timișoara, Romania. Builds small, focused tools for developers, founders and YouTube creators, plus fixed-price landing pages, websites and MVPs.",
    logo: "/makers/media/wolfitway-logo.webp", banner: "/makers/media/wolfitway-banner.webp",
    website: "https://wolfitway.com", socials: { x: "https://x.com/Wolfitway" }, featured: true,
  },
  "digital-underground": {
    slug: "digital-underground", name: "Digital Underground",
    bio: "Small, useful apps, tools and books built around you. Buy once, no subscription.",
    logo: "/makers/media/digital-underground-logo.webp", banner: "/makers/media/digital-underground-banner.webp",
    website: "https://digitalundergroundstore.com/", socials: {},
  },
  "kerzy-labs": {
    slug: "kerzy-labs", name: "Kerzy Labs",
    bio: "Neon arcade games you play right in your browser. No download, no sign-up.",
    logo: "/makers/media/kerzy-labs-logo.webp", banner: "/makers/media/kerzy-labs-banner.webp",
    website: "https://kerzylabs.pages.dev/", socials: {},
  },
};

/** Which maker page a listing belongs to (null = no page). Sync so publicListing stays cheap. */
export function makerSlugFor(row) {
  if (!row) return null;
  if (validSlug(row.makerSlug)) return row.makerSlug;
  if (typeof row.id === "string" && row.id.startsWith("cm_kerzy_") && row.id !== "cm_kerzy_easytracker") return "kerzy-labs";
  const s = slugify(row.makerName);
  return SEED[s] ? s : null;
}

/** Slug a maker name maps to for auto pages (seed rules first). */
export function autoSlugFor(row) {
  const seeded = makerSlugFor(row);
  if (seeded) return seeded;
  if (/kerzy/i.test(row?.makerName || "")) return "kerzy-labs";
  const s = slugify(row?.makerName);
  return validSlug(s) ? s : null;
}

/** Default public profile built from a live listing. */
export function profileFromListing(row) {
  const name = cleanText(row.makerName, LIMITS.name);
  const pick = (v) => (typeof v === "string" && (/^https:\/\//i.test(v) || /^\/(?!\/)/.test(v)) ? v : "");
  let cover = "";
  try { cover = pick(publicListing(row).imageUrl); } catch {}
  const logo = pick(row.makerLogo) || pick(row.makerAvatar) || pick(row.avatarUrl) || pick(row.iconUrl) || cover;
  const website = cleanUrl(row.makerUrl) || cleanUrl(row.projectUrl) || "";
  return { name, bio: `${name} on the Digital Underground marketplace`, website, socials: {}, logo, banner: "" };
}

/**
 * Called whenever a listing is (or becomes) live. Creates maker:<slug> if missing and not owned by
 * another account, sets row.makerSlug (caller persists the row). Seed makers keep their seed pages.
 * Returns the slug linked, or null.
 */
export async function ensureMakerForListing(kv, row) {
  if (!kv || !row || row.status !== "approved" || !row.makerName) return null;
  const slug = autoSlugFor(row);
  if (!slug) return null;
  if (SEED[slug]) { if (slug !== makerSlugFor(row)) row.makerSlug = slug; return slug; }
  const acctId = row.creatorId || null;
  let rec = await getMaker(kv, slug);
  if (rec && rec.ownerAcct && acctId && rec.ownerAcct !== acctId) return null; // someone else's page
  if (rec && rec.ownerAcct && !acctId) { if (!rec.live) return null; } // unowned listing can't claim
  if (!rec) rec = { slug, ownerAcct: acctId, live: null, pending: null };
  if (!rec.ownerAcct && acctId) rec.ownerAcct = acctId;
  let changed = false;
  if (!rec.live) {
    const p = profileFromListing(row);
    if (!p.name) return null;
    rec.live = { ...p, approvedAt: Date.now(), auto: true, fromListing: row.id };
    changed = true;
  } else if (!rec.live.logo) {
    const logo = profileFromListing(row).logo; // every maker page shows a logo
    if (logo) { rec.live = { ...rec.live, logo }; changed = true; }
  }
  if (changed || !(await getIndex(kv)).approved.includes(slug)) await putMaker(kv, rec);
  row.makerSlug = slug;
  return slug;
}

const EMAIL_RX = /[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}/gi;
/** Plain text only: no tags, no control chars, no email addresses, collapsed whitespace. */
export function cleanText(raw, max) {
  return String(raw == null ? "" : raw).replace(/[\u0000-\u0008\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/<[^>]*>?/g, "").replace(/[<>]/g, "").replace(EMAIL_RX, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

/** https only, public host, no credentials, no javascript/data. Returns normalized URL or "". */
export function cleanUrl(raw) {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "";
  if (s.length > LIMITS.url || !isHttpsUrl(s)) return null;
  try {
    const u = new URL(s);
    if (u.username || u.password || !isPublicHost(s)) return null;
    return u.toString();
  } catch { return null; }
}

function cleanImage(raw, maxBytes, label) {
  if (raw == null || raw === "") return { v: "" };
  if (typeof raw !== "string") return { error: `${label}: invalid image.` };
  if (raw.startsWith("/makers/media/") && /^\/makers\/media\/[a-z0-9-]+\.(webp|png|jpg)$/.test(raw)) return { v: raw }; // existing seed file
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(raw);
  if (!m) return { error: `${label} must be a JPEG, PNG or WebP upload.` };
  if ((m[2].length * 3) / 4 > maxBytes) return { error: `${label} is too large (max ${Math.round(maxBytes / 1024)} KB).` };
  return { v: raw };
}

/** Validate a creator-submitted profile. Returns { profile } or { error }. */
export function sanitizeProfile(body, fallbackName) {
  const name = cleanText(body?.name || fallbackName, LIMITS.name);
  if (!name) return { error: "Add a display name." };
  const bio = cleanText(body?.bio, LIMITS.bio);
  const website = cleanUrl(body?.website);
  if (website === null) return { error: "Website must be a full https:// link." };
  const socials = {};
  for (const k of SOCIALS) {
    const v = cleanUrl(body?.socials?.[k]);
    if (v === null) return { error: `${socialLabel(k)} link must be a full https:// link.` };
    if (v) socials[k] = v;
  }
  const logo = cleanImage(body?.logo, MAX_LOGO_BYTES, "Logo");
  if (logo.error) return logo;
  const banner = cleanImage(body?.banner, MAX_BANNER_BYTES, "Banner");
  if (banner.error) return banner;
  return { profile: { name, bio, website: website || "", socials, logo: logo.v, banner: banner.v } };
}

export async function getMaker(kv, slug) {
  if (!validSlug(slug)) return null;
  const r = await kv.get("maker:" + slug, "json");
  return r && typeof r === "object" ? r : null;
}
async function getIndex(kv) {
  const r = (await kv.get("maker:index", "json")) || {};
  return { approved: Array.isArray(r.approved) ? r.approved : [], pending: Array.isArray(r.pending) ? r.pending : [] };
}
async function putMaker(kv, rec) {
  rec.updatedAt = Date.now();
  await kv.put("maker:" + rec.slug, JSON.stringify(rec));
  const ix = await getIndex(kv);
  ix.approved = ix.approved.filter((s) => s !== rec.slug);
  ix.pending = ix.pending.filter((s) => s !== rec.slug);
  if (rec.live) ix.approved.push(rec.slug);
  if (rec.pending) ix.pending.push(rec.slug);
  await kv.put("maker:index", JSON.stringify(ix));
}

/** Screen text + images. "approved" = passed every automatic check (goes live); "pending" = held for the owner. */
export async function screenProfile(env, p) {
  const text = [p.name, p.bio, p.website, ...Object.values(p.socials || {})].join("\n");
  const reasons = [];
  const block = runBlocklist(text.toLowerCase());
  if (block.decision === "rejected") return { decision: "rejected", reasons: block.reasons || ["Flagged by filters."] };
  try {
    const t = await runTextGuard(env.AI, text);
    if (t.decision !== "approved") reasons.push(...(t.reasons || ["Text needs review."]));
    for (const img of [p.logo, p.banner]) {
      if (img && img.startsWith("data:")) {
        const g = await runImageGuard(env.AI, img);
        if (g.decision !== "approved") reasons.push(...(g.reasons || ["Image needs review."]));
      }
    }
  } catch { reasons.push("Automatic screening failed; queued for human review."); }
  if (!env || !env.AI) reasons.push("Automatic screening unavailable; queued for human review.");
  return reasons.length ? { decision: "pending", reasons } : { decision: "approved", reasons: ["Passed automatic checks."] };
}

/** Creator submits a profile change: live immediately if screening passes, else held (live version stays up). */
export async function submitProfile(env, kv, acct, slug, profile) {
  const rec = (await getMaker(kv, slug)) || { slug, ownerAcct: acct.id, live: null, pending: null };
  if (rec.ownerAcct && rec.ownerAcct !== acct.id) return { error: "This maker page belongs to another account. Contact support." };
  rec.ownerAcct = acct.id;
  const base = rec.live || SEED[slug] || {};
  // Keep existing images when the creator didn't upload new ones.
  const p = { ...profile, logo: profile.logo || base.logo || "", banner: profile.banner || base.banner || "" };
  const s = await screenProfile(env, p);
  if (s.decision === "rejected") return { error: "Your profile was flagged by our filters. Edit it or contact support." };
  if (s.decision === "approved") {
    rec.live = { ...p, approvedAt: Date.now(), autoScreened: true };
    rec.pending = null;
    await putMaker(kv, rec);
    return { ok: true, rec, live: true };
  }
  rec.pending = { ...p, at: Date.now(), screening: s.reasons };
  await putMaker(kv, rec);
  return { ok: true, rec, live: false };
}

export async function approveProfile(kv, slug) {
  const rec = await getMaker(kv, slug);
  if (!rec || !rec.pending) return null;
  const { at, screening, ...p } = rec.pending;
  rec.live = { ...p, approvedAt: Date.now() };
  rec.pending = null;
  await putMaker(kv, rec);
  return rec;
}
export async function rejectProfile(kv, slug, reason) {
  const rec = await getMaker(kv, slug);
  if (!rec || !rec.pending) return null;
  rec.lastRejected = { at: Date.now(), reason: cleanText(reason, 300) };
  rec.pending = null;
  await putMaker(kv, rec);
  return rec;
}

export async function listPendingProfiles(kv) {
  const ix = await getIndex(kv);
  const out = [];
  for (const s of ix.pending) { const r = await getMaker(kv, s); if (r && r.pending) out.push({ slug: s, ownerAcct: r.ownerAcct, live: r.live ? publicView(r.live, s, r.updatedAt) : null, pending: r.pending }); }
  return out;
}

const imgUrl = (slug, k, v, src) => (src && src.startsWith("data:") ? `/api/community/maker-img?slug=${slug}&k=${k}&v=${v}` : src || "");
function publicView(p, slug, v) {
  return { slug, name: p.name, bio: p.bio || "", website: p.website || "", socials: p.socials || {}, logo: imgUrl(slug, "logo", v, p.logo), banner: imgUrl(slug, "banner", v, p.banner), featured: !!p.featured };
}

/** Live public profile: approved KV version, else the owner seed. */
export async function liveProfile(kv, slug) {
  const rec = kv ? await getMaker(kv, slug) : null;
  if (rec && rec.live) return publicView(rec.live, slug, rec.updatedAt || 0);
  return SEED[slug] ? publicView(SEED[slug], slug, 0) : null;
}
export async function allLiveProfiles(kv) {
  const slugs = new Set(Object.keys(SEED));
  if (kv) (await getIndex(kv)).approved.forEach((s) => slugs.add(s));
  const out = [];
  for (const s of slugs) { const p = await liveProfile(kv, s); if (p) out.push(p); }
  return out;
}

/** Raw image for /api/community/maker-img (live profile only). */
export async function liveImage(kv, slug, k) {
  const rec = await getMaker(kv, slug);
  const src = rec && rec.live && (k === "logo" || k === "banner") ? rec.live[k] : "";
  return /^data:image\/(jpeg|png|webp);base64,/.test(src || "") ? src : "";
}

/** Creator-side view for the dashboard editor. */
export function creatorProfileView(rec, slug, fallbackName) {
  const live = rec?.live || SEED[slug] || null;
  const v = rec?.updatedAt || 0;
  const pv = (p) => p && { name: p.name, bio: p.bio || "", website: p.website || "", socials: p.socials || {}, logo: p.logo ? (p.logo.startsWith("data:") ? p.logo : p.logo) : "", banner: p.banner || "" };
  return { slug, url: `/makers/${slug}/`, live: pv(live) || null, pending: rec?.pending ? { ...pv(rec.pending), at: rec.pending.at } : null,
    lastRejected: rec?.lastRejected || null, defaultName: fallbackName, limits: { logoKB: MAX_LOGO_BYTES / 1024, bannerKB: MAX_BANNER_BYTES / 1024, bio: LIMITS.bio, name: LIMITS.name }, socials: SOCIALS };
}
export { normalizeEmail };
