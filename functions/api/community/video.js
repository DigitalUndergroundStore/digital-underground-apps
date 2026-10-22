/**
 * Listing video uploads (KV-chunked) and playback.
 *   GET/HEAD /api/community/video?v={vid}                    play (Range supported)
 *   POST     /api/community/video?action=init   {id,size,type}   creator owns listing → { vid, chunk, parts }
 *   PUT      /api/community/video?v={vid}&n={part}  raw bytes
 *   POST     /api/community/video?action=finish {vid,frames?}  attach to listing; with frames → instant auto-screen
 *   POST     /api/community/video?action=screen {vid}         creator retry after a screening error
 */
import { getKv, json, kvGetListing, promotePendingVideo, saveListing } from "../../_lib/community.js";
import { FRAME_COUNT, FRAME_MAX_BYTES, FRAMES_KEY, autoScreenPendingVideo } from "../../_lib/video-screening.js";
import { authCreatorEx, creatorListing, ownedListing, putAccount } from "../../_lib/creator.js";
import {
  UPLOADS_PER_DAY, VIDEO_CHUNK, VIDEO_MAX_BYTES, VIDEO_TYPES, reserveSiteVideoQuota,
  deleteVideo, getVideoMeta, getVideoPart, newVid, putVideoMeta, putVideoPart, serveVideo, sniffVideo, uploadVid,
} from "../../_lib/video.js";

function today() { return new Date().toISOString().slice(0, 10).replace(/-/g, ""); }

export async function onRequest(context) {
  const { request, env } = context;
  const kv = getKv(env);
  if (!kv) return json({ error: "Storage not configured." }, 503);
  const url = new URL(request.url);
  const vid = url.searchParams.get("v") || "";
  const action = url.searchParams.get("action") || "";

  if (request.method === "GET" || request.method === "HEAD") {
    const meta = await getVideoMeta(kv, vid);
    if (!meta || !meta.done) return new Response("Not found", { status: 404 });
    const row = await kvGetListing(kv, meta.listingId);
    // Only the listing's current video plays; replaced or removed uploads 404.
    if (!row || (row.videoUrl !== "upload:" + vid && !(row.pendingVideo && row.pendingVideo.url === "upload:" + vid))) return new Response("Not found", { status: 404 });
    return serveVideo(kv, request, meta);
  }

  const who = await authCreatorEx(request, env, kv);
  if (!who) return json({ error: "Log in to upload a video." }, 401);
  const acct = who.acct;

  if (request.method === "POST" && action === "init") {
    let body; try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
    const row = await ownedListing(kv, acct, String(body.id || ""));
    if (!row) return json({ error: "Listing not found." }, 404);
    const size = Number(body.size), type = String(body.type || "").toLowerCase();
    if (!VIDEO_TYPES.includes(type)) return json({ error: "Video must be an MP4 or WebM file." }, 400);
    if (!(size > 0)) return json({ error: "That file is empty." }, 400);
    if (size > VIDEO_MAX_BYTES) return json({ error: "Video is over 50 MB. Trim or compress it and try again." }, 400);
    const day = today();
    const b = acct.videoUploads && acct.videoUploads.day === day ? acct.videoUploads : { day, n: 0 };
    if (b.n >= UPLOADS_PER_DAY) return json({ error: "Daily video upload limit reached. Try again tomorrow." }, 429);
    const siteErr = await reserveSiteVideoQuota(kv, size);
    if (siteErr) return json({ error: siteErr }, 429);
    b.n += 1; acct.videoUploads = b; await putAccount(kv, acct);
    const meta = { vid: newVid(), listingId: row.id, creatorId: acct.id, type, size, chunk: VIDEO_CHUNK, parts: Math.ceil(size / VIDEO_CHUNK), done: false, createdAt: Date.now() };
    await putVideoMeta(kv, meta);
    return json({ ok: true, vid: meta.vid, chunk: meta.chunk, parts: meta.parts });
  }

  const meta = await getVideoMeta(kv, vid || "");
  if (request.method === "PUT") {
    if (!meta || meta.creatorId !== acct.id || meta.done) return json({ error: "Upload not found." }, 404);
    const n = Number(url.searchParams.get("n"));
    if (!Number.isInteger(n) || n < 0 || n >= meta.parts) return json({ error: "Bad part number." }, 400);
    const buf = await request.arrayBuffer();
    const want = n === meta.parts - 1 ? meta.size - n * meta.chunk : meta.chunk;
    if (buf.byteLength !== want) return json({ error: "Upload interrupted. Try again." }, 400);
    if (n === 0 && sniffVideo(buf) !== meta.type) return json({ error: "That file doesn't look like a real " + (meta.type === "video/mp4" ? "MP4" : "WebM") + " video." }, 400);
    await putVideoPart(kv, meta.vid, n, buf);
    return json({ ok: true });
  }

  if (request.method === "POST" && action === "finish") {
    let body; try { body = await request.json(); } catch { body = {}; }
    const m = await getVideoMeta(kv, String(body.vid || ""));
    if (!m || m.creatorId !== acct.id || m.done) return json({ error: "Upload not found." }, 404);
    const listed = await kv.list({ prefix: `video:${m.vid}:` });
    if ((listed.keys || []).length < m.parts) return json({ error: "Upload incomplete. Try again." }, 400);
    const row = await ownedListing(kv, acct, m.listingId);
    if (!row) return json({ error: "Listing not found." }, 404);
    // The listing stays exactly as it is (live stays live); the new video waits for a moderator.
    const old = uploadVid(row.pendingVideo && row.pendingVideo.url);
    m.done = true; await putVideoMeta(kv, m);
    row.pendingVideo = { url: "upload:" + m.vid, file: { type: m.type, size: m.size }, at: Date.now() };
    row.updatedAt = Date.now();
    await saveListing(kv, row);
    if (old && old !== m.vid) context.waitUntil(deleteVideo(kv, old).catch(() => {}));
    // Auto-screen: frames grabbed by the browser + server-parsed container metadata (see _lib/video-screening.js).
    const frames = Array.isArray(body.frames) ? body.frames.slice(0, FRAME_COUNT + 1) : null;
    if (frames && frames.every((f) => f && typeof f.data === "string" && f.data.length < FRAME_MAX_BYTES * 1.4)) {
      await kv.put(FRAMES_KEY(m.vid), JSON.stringify({ frames: frames.map((f) => ({ t: Number(f.t), data: f.data })), tries: 0, at: Date.now() }), { expirationTtl: 7 * 86400 });
      const screen = await runScreen(env, kv, m.vid);
      const fresh = await kvGetListing(kv, m.listingId);
      return json({ ok: true, screen, listing: creatorListing(fresh || row) });
    }
    return json({ ok: true, listing: creatorListing(row) });
  }

  if (request.method === "POST" && action === "screen") {
    let body; try { body = await request.json(); } catch { body = {}; }
    const m = await getVideoMeta(kv, String(body.vid || ""));
    if (!m || m.creatorId !== acct.id) return json({ error: "Upload not found." }, 404);
    const screen = await runScreen(env, kv, m.vid);
    const fresh = await kvGetListing(kv, m.listingId);
    return json({ ok: true, screen, listing: fresh ? creatorListing(fresh) : null });
  }

  return json({ error: "Unknown action." }, 400);
}

async function runScreen(env, kv, vid) {
  try {
    return await autoScreenPendingVideo(env, kv, vid, { getVideoMeta, getVideoPart, deleteVideo, kvGetListing, saveListing, promotePendingVideo });
  } catch (e) {
    console.error("video auto-screen error", e);
    return { decision: "pending", reasons: ["Automatic video check failed; it will be retried."], retry: true };
  }
}
