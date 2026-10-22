/**
 * Multi-image listing gallery stored in KV (R2 is not enabled), chunked like videos:
 *   gimg:{iid}       { iid, listingId, type, size, w, h, chunk, parts, createdAt }
 *   gimg:{iid}:{n}   raw bytes of part n
 * The listing row keeps the ordered list: row.images = [{ id, alt, w, h, type, size }], images[0] = cover.
 * Images are resized in the browser first, so almost every image is a single part.
 */
export const GIMG_MAX_BYTES = 3 * 1024 * 1024;
export const GIMG_CHUNK = 4 * 1024 * 1024;
export const GIMG_MAX_PER_LISTING = 8;
export const GIMG_TYPES = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
export const GALLERY_OPS_PER_DAY = 80;

const META = (iid) => `gimg:${iid}`;
const PART = (iid, n) => `gimg:${iid}:${n}`;
export const isIid = (v) => /^g_[A-Za-z0-9_-]{16,40}$/.test(v || "");
export function newIid() {
  const b = crypto.getRandomValues(new Uint8Array(15));
  let s = ""; for (const x of b) s += String.fromCharCode(x);
  return "g_" + btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Magic-byte check: returns the real MIME type or null. */
export function sniffImage(u8) {
  if (u8.length > 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) return "image/jpeg";
  if (u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) return "image/png";
  if (u8.length > 12 && String.fromCharCode(...u8.slice(0, 4)) === "RIFF" && String.fromCharCode(...u8.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export function cleanAlt(raw) {
  return String(raw == null ? "" : raw).replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

export function toDataUrl(u8, type) {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return `data:${type};base64,${btoa(s)}`;
}

export async function putGalleryImage(kv, { iid, listingId, type, bytes, w, h }) {
  const parts = Math.max(1, Math.ceil(bytes.length / GIMG_CHUNK));
  for (let n = 0; n < parts; n++) await kv.put(PART(iid, n), bytes.slice(n * GIMG_CHUNK, (n + 1) * GIMG_CHUNK));
  const meta = { iid, listingId, type, size: bytes.length, w: w || 0, h: h || 0, chunk: GIMG_CHUNK, parts, createdAt: Date.now() };
  await kv.put(META(iid), JSON.stringify(meta));
  return meta;
}
export async function getGalleryMeta(kv, iid) {
  if (!isIid(iid)) return null;
  const m = await kv.get(META(iid), "json");
  return m && typeof m === "object" ? m : null;
}
export async function readGalleryBytes(kv, meta) {
  const out = new Uint8Array(meta.size);
  let off = 0;
  for (let n = 0; n < meta.parts; n++) {
    const b = await kv.get(PART(meta.iid, n), "arrayBuffer");
    if (!b) return null;
    out.set(new Uint8Array(b), off); off += b.byteLength;
  }
  return out;
}
export async function deleteGalleryImage(kv, iid) {
  const meta = await getGalleryMeta(kv, iid);
  if (!meta) return;
  for (let n = 0; n < meta.parts; n++) await kv.delete(PART(iid, n));
  await kv.delete(META(iid));
}

export const galleryList = (row) => (Array.isArray(row && row.images) ? row.images.filter((x) => x && isIid(x.id)) : []);
export const gimgUrl = (row, img) => `/api/community/gimg?id=${encodeURIComponent(img.id)}&l=${encodeURIComponent(row.id)}`;
/** Public gallery view (cover first). */
export function publicImages(row) {
  return galleryList(row).map((img) => ({ src: gimgUrl(row, img), alt: img.alt || "", w: img.w || 0, h: img.h || 0 }));
}
