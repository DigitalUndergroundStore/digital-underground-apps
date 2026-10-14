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
    listing.xHandle,
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let res = await fetch(url.trim(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "DigitalUnderground-CommunityScreen/1.0" },
    });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url.trim(), {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "DigitalUnderground-CommunityScreen/1.0" },
      });
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
    block.decision === "rejected"
      ? { decision: "approved", reasons: [], skipped: true }
      : await runImageGuard(ai, listing.imageUrl);

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
  if (typeof imageUrl !== "string") throw new Error("bad image");
  if (imageUrl.startsWith("data:image/")) {
    const comma = imageUrl.indexOf(",");
    if (comma < 0) throw new Error("bad data url");
    const b64 = imageUrl.slice(comma + 1);
    return base64ToBytes(b64);
  }
  if (!imageUrl.startsWith("https://")) throw new Error("image must be https");

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
