/**
 * Automatic community listing screening (rules + Workers AI).
 */

const FETCH_TIMEOUT_MS = 12_000;
const MAX_IMAGE_FETCH_BYTES = 750_000;

const BLOCKLIST = [
  { label: "adult content", re: /\b(porn|xxx|nsfw|hentai|onlyfans|adult\s*content|nude|naked)\b/i },
  { label: "scam", re: /\b(scam|phishing|pyramid\s*scheme|get\s*rich\s*quick)\b/i },
  { label: "crypto pump", re: /\b(crypto\s*pump|pump\s*and\s*dump|pump\s*coin|rug\s*pull)\b/i },
  { label: "gambling", re: /\b(casino|gambling|sportsbet|sports\s*bet|online\s*bet(?:ting)?)\b/i },
  { label: "malware", re: /\b(malware|ransomware|keylogger|trojan|virus\s*download)\b/i },
  { label: "piracy", re: /\b(piracy|warez|cracked\s*software|torrent\s*download)\b/i },
  { label: "drugs", re: /\b(cocaine|heroin|methamphetamine|buy\s*weed|darknet\s*market)\b/i },
  { label: "weapons", re: /\b(buy\s*guns|illegal\s*weapons|firearms?\s*for\s*sale)\b/i },
];

const TEXT_GUARD_MODEL = "@cf/meta/llama-guard-3-8b";
const VISION_MODEL = "@cf/llava-hf/llava-1.5-7b-hf";

/**
 * @typedef {'approved'|'rejected'|'pending'} ScreenDecision
 */

/**
 * @param {object} listing
 * @returns {{ text: string; haystack: string }}
 */
export function submissionTextBundle(listing) {
  const parts = [
    listing.name,
    listing.pitchShort,
    listing.descriptionLong,
    listing.projectUrl,
    listing.makerName,
    listing.priceLabel,
    listing.statusLabel,
    listing.xHandle,
    listing.videoUrl,
    listing.pendingVideo && listing.pendingVideo.url,
  ].filter(Boolean);
  const haystack = parts.join("\n");
  return { text: haystack, haystack: haystack.toLowerCase() };
}

/**
 * @param {string} haystack
 * @returns {{ decision: ScreenDecision; reasons: string[] }}
 */
export function runBlocklist(haystack) {
  const reasons = [];
  for (const rule of BLOCKLIST) {
    if (rule.re.test(haystack)) reasons.push(`Blocked: ${rule.label}.`);
  }
  if (reasons.length) return { decision: "rejected", reasons };
  return { decision: "approved", reasons: [] };
}

/**
 * @param {string} url
 * @returns {Promise<{ decision: ScreenDecision; reasons: string[] }>}
 */
/** Reject IP literals, localhost and internal-looking hostnames (screening never fetches those). */
export function isPublicHost(raw) {
  let h;
  try { h = new URL(raw).hostname.toLowerCase(); } catch { return false; }
  if (!h || h.startsWith("[") || h.includes(":")) return false; // IPv6 literal
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || /^\d+$/.test(h) || /^0x[0-9a-f]+$/i.test(h)) return false; // IPv4 / numeric
  if (!h.includes(".")) return false;
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain|arpa)$/.test(h)) return false;
  return true;
}

export async function checkProjectUrlReachable(url) {
  if (!url || typeof url !== "string") {
    return { decision: "rejected", reasons: ["Project URL must be https."] };
  }
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:") {
      return { decision: "rejected", reasons: ["Project URL must use https."] };
    }
  } catch {
    return { decision: "rejected", reasons: ["Project URL is not valid."] };
  }

  if (!isPublicHost(url.trim())) {
    return { decision: "pending", reasons: ["Project URL points at an IP address or private host; needs manual review."] };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Follow at most 3 redirects by hand, re-checking each hop's host.
    const get = async (method) => {
      let target = url.trim();
      for (let hop = 0; hop <= 3; hop++) {
        const r = await fetch(target, {
          method,
          redirect: "manual",
          signal: controller.signal,
          headers: { "User-Agent": "DigitalUnderground-CommunityScreen/1.0" },
        });
        const loc = r.status >= 300 && r.status < 400 ? r.headers.get("Location") : null;
        if (!loc) return r;
        let next;
        try { next = new URL(loc, target); } catch { return r; }
        if (next.protocol !== "https:" || !isPublicHost(next.href)) return { status: 0, blockedHop: true };
        target = next.href;
      }
      return { status: 0, tooMany: true };
    };
    let res = await get("GET");
    if (res.status === 405 || res.status === 501) res = await get("HEAD");
    if (res.blockedHop || res.tooMany) {
      return { decision: "pending", reasons: [res.tooMany ? "Project URL redirects too many times; needs manual review." : "Project URL redirects to a non-https or private host; needs manual review."] };
    }
    if (res.status >= 200 && res.status < 300) {
      return { decision: "approved", reasons: [] };
    }
    return {
      decision: "rejected",
      reasons: [`Project URL returned HTTP ${res.status} (expected 2xx).`],
    };
  } catch (e) {
    const msg = e && e.name === "AbortError" ? "timed out" : "could not be reached";
    return {
      decision: "pending",
      reasons: [`Project URL ${msg}; needs manual review.`],
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {unknown} ai
 * @param {string} text
 * @returns {Promise<{ decision: ScreenDecision; reasons: string[] }>}
 */
export async function runTextGuard(ai, text) {
  if (!ai || !text) return { decision: "pending", reasons: ["Text moderation unavailable."] };
  const prompt = [
    "You are moderating a family-friendly indie software marketplace listing.",
    "Flag unsafe content: adult, scams, crypto pumps, gambling, malware, piracy, drugs, weapons.",
    "Listing text:",
    text.slice(0, 6000),
  ].join("\n\n");

  try {
    const out = await ai.run(TEXT_GUARD_MODEL, {
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: "I will classify this listing." },
        { role: "user", content: "Reply with safe or unsafe only." },
      ],
      max_tokens: 64,
    });
    const raw = extractModelText(out).toLowerCase();
    if (!raw) return { decision: "pending", reasons: ["Text moderation returned empty output."] };
    if (raw.includes("unsafe")) {
      return { decision: "rejected", reasons: ["AI text check: policy concern (unsafe)."] };
    }
    if (raw.includes("safe")) {
      return { decision: "approved", reasons: [] };
    }
    return { decision: "pending", reasons: ["Text moderation inconclusive."] };
  } catch (e) {
    console.error("community text guard error", e);
    return { decision: "pending", reasons: ["Text moderation error; queued for human review."] };
  }
}

/**
 * @param {unknown} ai
 * @param {string} imageUrl
 * @returns {Promise<{ decision: ScreenDecision; reasons: string[]; skipped?: boolean }>}
 */
export async function runImageGuard(ai, imageUrl) {
  if (!imageUrl) return { decision: "pending", reasons: ["No image to check."] };
  if (!ai) return { decision: "pending", reasons: ["Image moderation unavailable."] };

  let bytes;
  try {
    bytes = await loadImageBytes(imageUrl);
  } catch (e) {
    console.error("community image load error", e);
    return { decision: "pending", reasons: ["Could not load image for screening."] };
  }
  if (!bytes || !bytes.length) {
    return { decision: "pending", reasons: ["Empty image payload."] };
  }

  const prompt =
    "Is this image appropriate for a general-audience software marketplace card (no nudity, porn, gore, drugs, or hate symbols)? Answer with exactly one word: SAFE or UNSAFE.";

  try {
    const out = await ai.run(VISION_MODEL, {
      image: [...bytes],
      prompt,
      max_tokens: 16,
    });
    const raw = extractModelText(out).toUpperCase();
    if (raw.includes("UNSAFE")) {
      return { decision: "rejected", reasons: ["AI image check: not appropriate for marketplace."] };
    }
    if (raw.includes("SAFE")) {
      return { decision: "approved", reasons: [] };
    }
    return { decision: "pending", reasons: ["Image moderation inconclusive."] };
  } catch (e) {
    console.error("community image guard error", e);
    return { decision: "pending", reasons: ["Image moderation error; queued for human review."] };
  }
}

/**
 * Merge screening partial results (rejected beats pending beats approved).
 * @param {Array<{ decision: ScreenDecision; reasons: string[] }>} parts
 */
export function mergeScreenResults(parts) {
  const reasons = [];
  let decision = "approved";
  for (const p of parts) {
    if (!p) continue;
    if (p.reasons?.length) reasons.push(...p.reasons);
    if (p.decision === "rejected") decision = "rejected";
    else if (p.decision === "pending" && decision !== "rejected") decision = "pending";
  }
  return { decision, reasons: dedupeReasons(reasons) };
}

/**
 * @param {object} env
 * @param {object} listing
 * @returns {Promise<{ decision: ScreenDecision; reasons: string[]; detail: object }>}
 */
export async function screenListing(env, listing) {
  const { haystack, text } = submissionTextBundle(listing);
  const block = runBlocklist(haystack);
  const urlCheck = await checkProjectUrlReachable(listing.projectUrl);

  const ai = env.AI;
  const textGuard = block.decision === "rejected"
    ? { decision: "approved", reasons: [], skipped: true }
    : await runTextGuard(ai, text);
  const imageGuard =
    block.decision === "rejected" || !listing.imageUrl
      ? { decision: "approved", reasons: [], skipped: true }
      : await runImageGuard(ai, listing.imageUrl);

  // Videos are reviewed separately (pendingVideo); they never take a live listing down.
  const merged = mergeScreenResults([block, urlCheck, textGuard, imageGuard]);
  return {
    decision: merged.decision,
    reasons: merged.reasons,
    detail: {
      blocklist: block,
      url: urlCheck,
      textGuard,
      imageGuard,
      screenedAt: Date.now(),
    },
  };
}

function dedupeReasons(list) {
  const seen = new Set();
  const out = [];
  for (const r of list) {
    const s = String(r).trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function extractModelText(out) {
  if (out == null) return "";
  if (typeof out === "string") return out;
  if (typeof out.response === "string") return out.response;
  if (typeof out.result === "string") return out.result;
  if (typeof out.description === "string") return out.description;
  if (Array.isArray(out)) return out.map((x) => extractModelText(x)).join(" ");
  if (typeof out === "object") {
    for (const key of ["response", "result", "text", "output", "description"]) {
      if (typeof out[key] === "string") return out[key];
    }
  }
  return String(out);
}

async function loadImageBytes(imageUrl) {
  if (imageUrl instanceof Uint8Array) return imageUrl;
  if (typeof imageUrl !== "string") throw new Error("bad image");
  if (imageUrl.startsWith("data:image/")) {
    const comma = imageUrl.indexOf(",");
    if (comma < 0) throw new Error("bad data url");
    const b64 = imageUrl.slice(comma + 1);
    return base64ToBytes(b64);
  }
  if (!imageUrl.startsWith("https://")) throw new Error("image must be https");
  if (!isPublicHost(imageUrl)) throw new Error("image host not allowed");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "DigitalUnderground-CommunityScreen/1.0" },
    });
    if (!res.ok) throw new Error(`image http ${res.status}`);
    const len = Number(res.headers.get("content-length") || 0);
    if (len > MAX_IMAGE_FETCH_BYTES) throw new Error("image too large");
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_FETCH_BYTES) throw new Error("image too large");
    return new Uint8Array(buf);
  } finally {
    clearTimeout(timer);
  }
}

function base64ToBytes(b64) {
  const binary = atob(b64.replace(/\s/g, ""));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Video screening. We can't run the AI guard on video frames, so a new or changed
 * video always goes to a quick human review (status pending). Once a moderator
 * approves, that exact URL is remembered (videoApprovedUrl) and later edits stay live.
 * Direct files must be reachable, video/* and at most 50 MB.
 */
export async function checkVideo(listing) {
  const url = listing && (listing.pendingVideo ? listing.pendingVideo.url : listing.videoUrl);
  if (!url) return { decision: "approved", reasons: [] };
  const reasons = [];
  if (url.startsWith("https://") && /\.(mp4|webm)(\?|#|$)/i.test(new URL(url).pathname)) {
    try {
      if (!isPublicHost(url)) return { decision: "pending", reasons: ["Video link points at an IP address or private host; needs manual review."] };
      const res = await fetch(url, { method: "HEAD", redirect: "follow", cf: { cacheTtl: 0 } });
      const type = res.headers.get("content-type") || "";
      const len = Number(res.headers.get("content-length") || 0);
      if (!res.ok) return { decision: "rejected", reasons: ["Video file could not be loaded (HTTP " + res.status + ")."] };
      if (type && !/^video\/(mp4|webm)/i.test(type) && !/octet-stream/i.test(type)) return { decision: "rejected", reasons: ["Video link is not an mp4 or webm file."] };
      if (len > 50 * 1024 * 1024) return { decision: "rejected", reasons: ["Video file is over 50 MB."] };
    } catch {
      return { decision: "pending", reasons: ["Video file could not be checked automatically; queued for review."] };
    }
  }
  if (url !== listing.videoApprovedUrl) reasons.push("New video: queued for a quick human review.");
  return { decision: reasons.length ? "pending" : "approved", reasons };
}

/** Pantry Week meal-photo prompt (category) — exported for audit/report. */
export const MEAL_PHOTO_PROMPT =
  "Classify this photo with exactly one word. FOOD = the main subject is a real cooked or plated meal or food dish. " +
  "PERSON = a person's face is the main subject. TEXT = a screenshot, meme, document, ID card or mostly text. " +
  "UNSAFE = nudity, gore, drugs, weapons or hate symbols. OTHER = anything else. Answer FOOD, PERSON, TEXT, UNSAFE or OTHER.";

/**
 * Screen a Pantry Week "meal I made" photo. Two vision calls: category + the shared SAFE/UNSAFE guard.
 * approved only if category FOOD and guard SAFE; rejected on UNSAFE/PERSON/TEXT/OTHER; pending on error/unclear.
 * @param {unknown} ai @param {Uint8Array|string} bytesOrDataUrl
 */
export async function screenMealPhoto(ai, bytesOrDataUrl) {
  const at = new Date().toISOString();
  if (!ai) return { decision: "pending", reasons: ["Image screening unavailable."], detail: { at } };
  let bytes;
  try { bytes = typeof bytesOrDataUrl === "string" ? await loadImageBytes(bytesOrDataUrl) : bytesOrDataUrl; }
  catch { return { decision: "pending", reasons: ["Could not read image."], detail: { at } }; }
  if (!bytes || !bytes.length) return { decision: "pending", reasons: ["Empty image."], detail: { at } };
  let cat = "", catRaw = "";
  try {
    const out = await ai.run(VISION_MODEL, { image: [...bytes], prompt: MEAL_PHOTO_PROMPT, max_tokens: 12 });
    catRaw = extractModelText(out).trim().slice(0, 80);
    const up = catRaw.toUpperCase();
    const hits = ["UNSAFE", "PERSON", "TEXT", "OTHER", "FOOD"].filter((w) => new RegExp("\\b" + w + "\\b").test(up));
    cat = hits.includes("UNSAFE") ? "UNSAFE" : hits.length === 1 ? hits[0] : hits.length ? "MIXED" : "";
  } catch (e) {
    console.error("meal photo category error", e);
    return { decision: "pending", reasons: ["Image screening error; queued for review."], detail: { at, model: VISION_MODEL } };
  }
  const detail = { at, model: VISION_MODEL, category: cat || "unclear", categoryRaw: catRaw };
  if (cat === "UNSAFE") return { decision: "rejected", reasons: ["Not appropriate for Pantry Week."], detail };
  if (cat === "PERSON") return { decision: "rejected", reasons: ["Main subject is a person, not a meal."], detail };
  if (cat === "TEXT") return { decision: "rejected", reasons: ["Screenshot / text image, not a meal."], detail };
  if (cat === "OTHER") return { decision: "rejected", reasons: ["Doesn't look like a meal."], detail };
  if (cat !== "FOOD") return { decision: "pending", reasons: ["Screening inconclusive."], detail };
  const guard = await runImageGuard(ai, bytes);
  detail.safety = guard.decision;
  if (guard.decision === "rejected") return { decision: "rejected", reasons: ["Not appropriate for Pantry Week."], detail };
  if (guard.decision !== "approved") return { decision: "pending", reasons: guard.reasons, detail };
  return { decision: "approved", reasons: ["Looks like a meal; safety check passed."], detail };
}
