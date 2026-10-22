/**
 * Automatic screening for creator-uploaded listing videos (KV-chunked uploads).
 *
 * Workers cannot decode H.264/VP9 (no ffmpeg, and a WASM decoder would blow the free-tier CPU
 * budget), so the server cannot re-extract frames itself. Instead:
 *   1. The browser grabs FRAME_COUNT frames (JPEG, canvas) spread over the video and sends them with
 *      `finish`.
 *   2. The server parses the uploaded container itself (MP4 mvhd/tkhd, WebM Duration/PixelWidth/Height)
 *      and checks that the frames are consistent with it: count, JPEG validity, frame dimensions vs the
 *      video's aspect ratio, timestamps spread across the real duration, frames not all identical.
 *      These checks stop accidental or lazy fakes, NOT a determined attacker who renders clean frames
 *      at the right size. That residual risk is bounded by the trust gate below (only creators whose
 *      listing is already live and approved get instant approval) and by the owner keeping the power
 *      to pull a video afterwards.
 *   3. Every frame goes through the same Workers AI image check as listing images; title/description go
 *      through the blocklist. Any UNSAFE frame or blocklist hit → auto-reject. Everything passing →
 *      instant approval. Anything doubtful → stays in the owner queue.
 */
import { mergeScreenResults, runBlocklist, runImageGuard, submissionTextBundle } from "./community-screening.js";

export const FRAME_COUNT = 5;
export const FRAME_MAX_BYTES = 220 * 1024; // per frame (decoded)
export const AUTO_MAX_DURATION_S = 300; // longer videos go to the owner (we only sample 5 frames)
export const FRAMES_KEY = (vid) => `vframes:${vid}`; // separate prefix: never counted as a video part

/* ---------------- container parsing (server side, from the bytes we stored) ---------------- */

function findAscii(u, s, from = 0) {
  const a = s.charCodeAt(0), b = s.charCodeAt(1), c = s.charCodeAt(2), d = s.charCodeAt(3);
  for (let i = from; i + 3 < u.length; i++) if (u[i] === a && u[i + 1] === b && u[i + 2] === c && u[i + 3] === d) return i;
  return -1;
}
const u32 = (u, i) => ((u[i] << 24) >>> 0) + (u[i + 1] << 16) + (u[i + 2] << 8) + u[i + 3];

/** MP4: duration from mvhd, display size from the first tkhd with a non-zero size. */
export function parseMp4Info(u) {
  const t = findAscii(u, "mvhd");
  if (t < 4) return null;
  const s = t - 4, ver = u[s + 8];
  let timescale, duration;
  if (ver === 1) { timescale = u32(u, s + 28); duration = u32(u, s + 32) * 4294967296 + u32(u, s + 36); }
  else { timescale = u32(u, s + 20); duration = u32(u, s + 24); }
  if (!timescale) return null;
  let width = 0, height = 0, from = 0;
  for (;;) {
    const k = findAscii(u, "tkhd", from);
    if (k < 4) break;
    const size = u32(u, k - 4), end = k - 4 + size;
    if (size >= 84 && end <= u.length) {
      const w = u32(u, end - 8) / 65536, h = u32(u, end - 4) / 65536;
      if (w > 0 && h > 0) { width = Math.round(w); height = Math.round(h); break; }
    }
    from = k + 4;
  }
  return { duration: duration / timescale, width, height };
}

function readVint(u, i) {
  const first = u[i]; let len = 1, mask = 0x80;
  while (len <= 8 && !(first & mask)) { len++; mask >>= 1; }
  if (len > 8) return null;
  let v = first & (mask - 1);
  for (let k = 1; k < len; k++) v = v * 256 + u[i + k];
  return { len, v };
}
function readUint(u, i, n) { let v = 0; for (let k = 0; k < n; k++) v = v * 256 + u[i + k]; return v; }

/** WebM/Matroska: Duration (0x4489) × TimecodeScale (0x2AD7B1), PixelWidth (0xB0) / PixelHeight (0xBA) inside Video (0xE0). */
export function parseWebmInfo(u) {
  let scale = 1e6, duration = 0, width = 0, height = 0;
  for (let i = 0; i + 12 < u.length && i < 65536; i++) {
    if (u[i] === 0x2a && u[i + 1] === 0xd7 && u[i + 2] === 0xb1) {
      const sz = readVint(u, i + 3); if (sz && sz.v <= 8) scale = readUint(u, i + 3 + sz.len, sz.v) || scale;
    } else if (!duration && u[i] === 0x44 && u[i + 1] === 0x89) {
      const sz = readVint(u, i + 2), p = i + 2 + (sz ? sz.len : 0);
      if (sz && (sz.v === 4 || sz.v === 8)) {
        const dv = new DataView(u.buffer, u.byteOffset + p, sz.v);
        duration = sz.v === 4 ? dv.getFloat32(0) : dv.getFloat64(0);
      }
    } else if (!width && u[i] === 0xe0) {
      // Video element: look for PixelWidth/PixelHeight in the next few bytes.
      const sz = readVint(u, i + 1); if (!sz || sz.v > 200) continue;
      const start = i + 1 + sz.len, end = Math.min(u.length, start + sz.v);
      for (let j = start; j < end;) {
        const id = u[j], ln = readVint(u, j + 1); if (!ln) break;
        const val = j + 1 + ln.len;
        if (id === 0xb0) width = readUint(u, val, ln.v);
        else if (id === 0xba) height = readUint(u, val, ln.v);
        j = val + ln.v;
        if (id !== 0xb0 && id !== 0xba && id < 0x80) break;
      }
    }
  }
  if (!(duration > 0)) return width ? { duration: 0, width, height } : null;
  return { duration: (duration * scale) / 1e9, width, height };
}

/** Parse from the first stored part plus (for MP4s without faststart) the last part. */
export function parseVideoInfo(type, firstPart, lastPart) {
  const a = new Uint8Array(firstPart || new ArrayBuffer(0));
  if (type === "video/mp4") return parseMp4Info(a) || (lastPart ? parseMp4Info(new Uint8Array(lastPart)) : null);
  if (type === "video/webm") return parseWebmInfo(a);
  return null;
}

/* ---------------- frame checks ---------------- */

function b64ToBytes(b64) {
  const bin = atob(b64); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
/** JPEG SOFn → { width, height } or null. */
export function jpegSize(u) {
  if (u[0] !== 0xff || u[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < u.length) {
    if (u[i] !== 0xff) return null;
    const m = u[i + 1], len = (u[i + 2] << 8) + u[i + 3];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { height: (u[i + 5] << 8) + u[i + 6], width: (u[i + 7] << 8) + u[i + 8] };
    i += 2 + len;
  }
  return null;
}
async function sha256Hex(u) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", u));
  return [...h].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate client frames against the server-parsed container info.
 * @returns {Promise<{ ok: boolean, reasons: string[], frames: Array<{t:number,data:string,hash:string,width:number,height:number}> }>}
 */
export async function verifyFrames(frames, info) {
  const reasons = [];
  if (!Array.isArray(frames) || frames.length !== FRAME_COUNT) return { ok: false, reasons: [`Expected ${FRAME_COUNT} preview frames from the uploader.`], frames: [] };
  if (!info || !(info.duration > 0) || !info.width || !info.height) return { ok: false, reasons: ["Could not read the video's duration/size from the file."], frames: [] };
  const out = [], hashes = new Set(), aspect = info.width / info.height;
  for (const f of frames) {
    const data = f && typeof f.data === "string" ? f.data : "";
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(data);
    if (!m) { reasons.push("A preview frame is not a JPEG."); continue; }
    let bytes; try { bytes = b64ToBytes(m[1]); } catch { reasons.push("A preview frame is corrupt."); continue; }
    if (bytes.length > FRAME_MAX_BYTES) { reasons.push("A preview frame is too large."); continue; }
    const dim = jpegSize(bytes);
    if (!dim || !dim.width || !dim.height) { reasons.push("A preview frame is not a valid image."); continue; }
    if (dim.width > info.width + 2 || dim.height > info.height + 2) reasons.push("A preview frame is larger than the video itself.");
    if (Math.abs(dim.width / dim.height - aspect) / aspect > 0.04) reasons.push("Preview frame shape doesn't match the video.");
    const t = Number(f.t);
    if (!(t >= 0 && t <= info.duration + 0.5)) reasons.push("Preview frame time is outside the video.");
    const hash = await sha256Hex(bytes);
    hashes.add(hash);
    out.push({ t, data, hash, width: dim.width, height: dim.height });
  }
  if (out.length === FRAME_COUNT) {
    const ts = out.map((f) => f.t).sort((a, b) => a - b);
    // Must cover the video: first frame in the first 25%, last in the final 25%, and distinct times.
    if (ts[0] > info.duration * 0.25 || ts[ts.length - 1] < info.duration * 0.75) reasons.push("Preview frames don't cover the whole video.");
    if (new Set(ts.map((x) => x.toFixed(2))).size !== ts.length) reasons.push("Preview frames repeat the same moment.");
    if (hashes.size < 2) reasons.push("All preview frames are identical; needs a human look.");
  }
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)], frames: out };
}

/* ---------------- decision ---------------- */

/**
 * @param {object} env  needs env.AI
 * @param {object} listing  the listing row (status, name, pitch…)
 * @param {object} meta     stored video meta {type,size}
 * @param {object} info     server-parsed container info
 * @param {Array} frames    verified frames from verifyFrames().frames
 * @param {string[]} frameIssues  reasons from verifyFrames()
 * @returns {Promise<{ decision: 'approved'|'rejected'|'pending', reasons: string[], error?: boolean, detail: object }>}
 */
export async function screenUploadedVideo(env, listing, meta, info, frames, frameIssues = [], opts = {}) {
  const runImg = opts.runImageGuard || runImageGuard;
  const { haystack } = submissionTextBundle(listing || {});
  const block = runBlocklist(haystack);
  const gates = [];
  if (!listing || listing.status !== "approved") gates.push("Listing isn't live/approved yet; the owner reviews its first video.");
  if (listing && listing.flagged) gates.push("Listing has open reports.");
  if (!meta || !["video/mp4", "video/webm"].includes(meta.type)) gates.push("Unexpected video type.");
  if (meta && meta.size > 50 * 1024 * 1024) gates.push("Video over 50 MB.");
  if (info && info.duration > AUTO_MAX_DURATION_S) gates.push(`Video is longer than ${AUTO_MAX_DURATION_S / 60} minutes; only short videos are auto-approved.`);
  const meta_ = { decision: gates.length || frameIssues.length ? "pending" : "approved", reasons: [...gates, ...frameIssues] };

  // Always run the image check on whatever valid frames we have: an UNSAFE frame rejects even if
  // other gates would only have queued it.
  const results = await Promise.all((frames || []).map((f) => runImg(env && env.AI, f.data)));
  let error = false;
  const imgReasons = [];
  let imgDecision = frames && frames.length ? "approved" : "pending";
  results.forEach((r, i) => {
    if (r.decision === "rejected") { imgDecision = "rejected"; imgReasons.push(`Frame at ${frames[i].t.toFixed(1)}s: ${r.reasons[0] || "unsafe"}`); }
    else if (r.decision === "pending") {
      if (imgDecision !== "rejected") imgDecision = "pending";
      if (/error|unavailable|empty/i.test(r.reasons.join(" "))) error = true;
      imgReasons.push(`Frame at ${frames[i].t.toFixed(1)}s: ${r.reasons[0] || "inconclusive"}`);
    }
  });
  const merged = mergeScreenResults([block, meta_, { decision: imgDecision, reasons: imgReasons }]);
  return {
    decision: merged.decision,
    reasons: merged.reasons,
    error: merged.decision === "pending" && error,
    detail: { info, frameHashes: (frames || []).map((f) => f.hash), screenedAt: Date.now() },
  };
}

/* ---------------- apply (shared by the finish endpoint, the creator retry and the cron sweep) ---------------- */

export const MAX_TRIES = 6;

/**
 * Screen the listing's pending uploaded video `vid` and act on it.
 * Only acts when a frames record exists (i.e. the upload went through the new flow), so older
 * pending videos already in the owner queue are never touched.
 * @returns {Promise<{ decision: string, reasons: string[], retry?: boolean } | null>}
 */
export async function autoScreenPendingVideo(env, kv, vid, deps) {
  const { getVideoMeta, getVideoPart, deleteVideo, kvGetListing, saveListing, promotePendingVideo } = deps;
  const rec = await kv.get(FRAMES_KEY(vid), "json");
  if (!rec) return null;
  const meta = await getVideoMeta(kv, vid);
  const row = meta && (await kvGetListing(kv, meta.listingId));
  if (!meta || !row || !row.pendingVideo || row.pendingVideo.url !== "upload:" + vid) { await kv.delete(FRAMES_KEY(vid)); return null; }

  const first = await getVideoPart(kv, vid, 0);
  const last = meta.parts > 1 ? await getVideoPart(kv, vid, meta.parts - 1) : null;
  const info = parseVideoInfo(meta.type, first, last);
  const v = await verifyFrames(rec.frames, info);
  const res = await screenUploadedVideo(env, row, meta, info, v.frames, v.reasons, deps);
  const tries = (rec.tries || 0) + 1;

  if (res.decision === "approved") {
    const drop = promotePendingVideo(row);
    row.videoAuto = { vid, at: Date.now(), hashes: res.detail.frameHashes, info };
    row.updatedAt = Date.now();
    await saveListing(kv, row);
    await kv.delete(FRAMES_KEY(vid));
    if (drop) await deleteVideo(kv, drop).catch(() => {});
    return { decision: "approved", reasons: [] };
  }
  if (res.decision === "rejected") {
    delete row.pendingVideo;
    row.videoAutoRejected = { at: Date.now(), reasons: res.reasons };
    row.updatedAt = Date.now();
    await saveListing(kv, row);
    await kv.delete(FRAMES_KEY(vid));
    await deleteVideo(kv, vid).catch(() => {});
    return { decision: "rejected", reasons: res.reasons };
  }
  // Doubtful → owner queue. Screening errors get retried (creator retry / hourly sweep) a few times.
  row.pendingVideo.screen = { decision: "pending", reasons: res.reasons, at: Date.now(), info };
  await saveListing(kv, row);
  if (res.error && tries < MAX_TRIES) {
    await kv.put(FRAMES_KEY(vid), JSON.stringify({ ...rec, tries, retryAt: Date.now() }));
    return { decision: "pending", reasons: res.reasons, retry: true };
  }
  await kv.delete(FRAMES_KEY(vid));
  return { decision: "pending", reasons: res.reasons };
}
