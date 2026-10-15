/**
 * Free listing-video storage in KV (R2 is not enabled on this account).
 * A video is split into CHUNK-sized values:
 *   video:{vid}        { vid, listingId, creatorId, type, size, chunk, parts, done, createdAt }
 *   video:{vid}:{n}    raw bytes of part n
 * 4 MB parts keep each write small and let Range requests read only what they need.
 * A 50 MB video costs 13 KV writes (free plan: 1,000 writes/day, 1 GB storage).
 */
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const VIDEO_CHUNK = 4 * 1024 * 1024;
export const VIDEO_TYPES = ["video/mp4", "video/webm"];
export const UPLOADS_PER_DAY = 6;

const META = (vid) => `video:${vid}`;
const PART = (vid, n) => `video:${vid}:${n}`;

export function isVid(v) { return /^v_[A-Za-z0-9_-]{16,40}$/.test(v || ""); }
export function newVid() {
  const b = crypto.getRandomValues(new Uint8Array(15));
  let s = ""; for (const x of b) s += String.fromCharCode(x);
  return "v_" + btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function uploadVid(videoUrl) {
  const m = /^upload:(v_[A-Za-z0-9_-]{16,40})$/.exec(videoUrl || "");
  return m ? m[1] : null;
}
export async function getVideoMeta(kv, vid) {
  if (!isVid(vid)) return null;
  const m = await kv.get(META(vid), "json");
  return m && typeof m === "object" ? m : null;
}
export async function putVideoMeta(kv, meta) { await kv.put(META(meta.vid), JSON.stringify(meta)); }
export async function putVideoPart(kv, vid, n, buf) { await kv.put(PART(vid, n), buf); }
export async function getVideoPart(kv, vid, n) { return kv.get(PART(vid, n), "arrayBuffer"); }

/** Delete a stored video (meta + every part). Safe to call on unknown ids. */
export async function deleteVideo(kv, vid) {
  const meta = await getVideoMeta(kv, vid);
  if (!meta) return;
  const parts = Math.ceil(meta.size / meta.chunk);
  for (let n = 0; n < parts; n++) await kv.delete(PART(vid, n));
  await kv.delete(META(vid));
}

/** Magic-byte check on the first part: MP4 "ftyp" box or WebM/EBML header. */
export function sniffVideo(bytes) {
  const u = new Uint8Array(bytes.slice(0, 16));
  if (u.length >= 12 && u[4] === 0x66 && u[5] === 0x74 && u[6] === 0x79 && u[7] === 0x70) return "video/mp4";
  if (u.length >= 4 && u[0] === 0x1a && u[1] === 0x45 && u[2] === 0xdf && u[3] === 0xa3) return "video/webm";
  return null;
}

/** Stream a stored video with HTTP Range support. */
export async function serveVideo(kv, request, meta) {
  const size = meta.size, chunk = meta.chunk;
  let start = 0, end = size - 1, partial = false;
  const range = request.headers.get("Range");
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m || (m[1] === "" && m[2] === "")) return rangeError(size);
    if (m[1] === "") { start = Math.max(0, size - Number(m[2])); }
    else { start = Number(m[1]); if (m[2] !== "") end = Math.min(size - 1, Number(m[2])); }
    if (start > end || start >= size) return rangeError(size);
    partial = true;
  }
  // Cap one response at 2 parts so a Worker never buffers much; players request the rest.
  if (partial) end = Math.min(end, Math.floor(start / chunk) * chunk + chunk * 2 - 1);
  const headers = {
    "Content-Type": meta.type,
    "Accept-Ranges": "bytes",
    "Content-Length": String(end - start + 1),
    "Cache-Control": "public, max-age=86400",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
  };
  if (partial) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  if (request.method === "HEAD") return new Response(null, { status: partial ? 206 : 200, headers });
  const first = Math.floor(start / chunk), last = Math.floor(end / chunk);
  const stream = new ReadableStream({
    async pull(ctrl) {
      if (this.n === undefined) this.n = first;
      if (this.n > last) { ctrl.close(); return; }
      const n = this.n++;
      const buf = await getVideoPart(kv, meta.vid, n);
      if (!buf) { ctrl.error(new Error("missing part")); return; }
      const from = n === first ? start - n * chunk : 0;
      const to = n === last ? end - n * chunk + 1 : buf.byteLength;
      ctrl.enqueue(new Uint8Array(buf, from, to - from));
    },
  });
  return new Response(stream, { status: partial ? 206 : 200, headers });
}
function rangeError(size) {
  return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}`, "Accept-Ranges": "bytes" } });
}
