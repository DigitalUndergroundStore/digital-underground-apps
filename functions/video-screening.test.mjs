import { FRAME_COUNT, autoScreenPendingVideo, jpegSize, parseMp4Info, parseWebmInfo, screenUploadedVideo, verifyFrames } from "../../_lib/video-screening.js";

let failed = 0;
function check(name, cond) { if (!cond) { failed += 1; console.error("FAIL", name); } else console.log("ok", name); }

// --- minimal fixtures ---
function box(type, payload) { const u = new Uint8Array(8 + payload.length); new DataView(u.buffer).setUint32(0, u.length); for (let i = 0; i < 4; i++) u[4 + i] = type.charCodeAt(i); u.set(payload, 8); return u; }
function cat(...a) { const n = a.reduce((s, x) => s + x.length, 0), u = new Uint8Array(n); let o = 0; for (const x of a) { u.set(x, o); o += x.length; } return u; }
function mp4(durationS, w, h) {
  const mv = new Uint8Array(100); const dv = new DataView(mv.buffer); dv.setUint32(12, 1000); dv.setUint32(16, durationS * 1000);
  const tk = new Uint8Array(84); const tv = new DataView(tk.buffer); tv.setUint32(76, w * 65536); tv.setUint32(80, h * 65536);
  return cat(box("ftyp", new Uint8Array(8)), box("moov", cat(box("mvhd", mv), box("trak", box("tkhd", tk))))).buffer;
}
function jpeg(w, h, salt = 0) { return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, salt, 0, 0xff, 0xc0, 0, 11, 8, h >> 8, h & 255, w >> 8, w & 255, 3, 0, 0, 0, 0xff, 0xd9]); }
const dataUrl = (u) => "data:image/jpeg;base64," + btoa(String.fromCharCode(...u));
const goodFrames = (d, w, h) => [0.1, 0.3, 0.5, 0.7, 0.9].map((f, i) => ({ t: d * f, data: dataUrl(jpeg(w, h, i)) }));

const info = parseMp4Info(new Uint8Array(mp4(30, 1280, 720)));
check("mp4 duration", info && Math.abs(info.duration - 30) < 0.01);
check("mp4 dims", info && info.width === 1280 && info.height === 720);
check("jpeg size", jpegSize(jpeg(512, 288)).width === 512);

// WebM: EBML header, TimecodeScale 1e6, Duration float64 5000 (=5s), Video{PixelWidth 640, PixelHeight 360}
const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x80, 0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40, 0x44, 0x89, 0x88, 0x40, 0xb3, 0x88, 0, 0, 0, 0, 0, 0xe0, 0x88, 0xb0, 0x82, 0x02, 0x80, 0xba, 0x82, 0x01, 0x68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const wi = parseWebmInfo(webm);
check("webm duration", wi && Math.abs(wi.duration - 5) < 0.01);
check("webm dims", wi && wi.width === 640 && wi.height === 360);

const v1 = await verifyFrames(goodFrames(30, 512, 288), info);
check("good frames verify", v1.ok && v1.frames.length === FRAME_COUNT);
check("wrong count", !(await verifyFrames(goodFrames(30, 512, 288).slice(0, 3), info)).ok);
check("wrong aspect", !(await verifyFrames(goodFrames(30, 512, 512), info)).ok);
check("bigger than video", !(await verifyFrames(goodFrames(30, 2560, 1440), info)).ok);
check("times outside video", !(await verifyFrames(goodFrames(300, 512, 288), info)).ok);
const same = goodFrames(30, 512, 288).map((f) => ({ ...f, data: dataUrl(jpeg(512, 288, 9)) }));
check("identical frames", !(await verifyFrames(same, info)).ok);
check("png rejected", !(await verifyFrames(goodFrames(30, 512, 288).map((f) => ({ ...f, data: f.data.replace("jpeg", "png") })), info)).ok);
check("no container info", !(await verifyFrames(goodFrames(30, 512, 288), null)).ok);

const live = { status: "approved", name: "Task Helper", pitchShort: "Calm study app", projectUrl: "https://example.com" };
const meta = { type: "video/mp4", size: 1e6, parts: 1 };
const safe = async () => ({ decision: "approved", reasons: [] });
const unsafe = async () => ({ decision: "rejected", reasons: ["AI image check: not appropriate for marketplace."] });
const err = async () => ({ decision: "pending", reasons: ["Image moderation error; queued for human review."] });
const meh = async () => ({ decision: "pending", reasons: ["Image moderation inconclusive."] });

check("all pass → approved", (await screenUploadedVideo({}, live, meta, info, v1.frames, [], { runImageGuard: safe })).decision === "approved");
check("unsafe frame → rejected", (await screenUploadedVideo({}, live, meta, info, v1.frames, [], { runImageGuard: unsafe })).decision === "rejected");
check("blocklist text → rejected", (await screenUploadedVideo({}, { ...live, pitchShort: "free onlyfans leaks" }, meta, info, v1.frames, [], { runImageGuard: safe })).decision === "rejected");
check("inconclusive → owner", (await screenUploadedVideo({}, live, meta, info, v1.frames, [], { runImageGuard: meh })).decision === "pending");
const e1 = await screenUploadedVideo({}, live, meta, info, v1.frames, [], { runImageGuard: err });
check("AI error → pending + retry", e1.decision === "pending" && e1.error);
check("listing not live → owner", (await screenUploadedVideo({}, { ...live, status: "pending" }, meta, info, v1.frames, [], { runImageGuard: safe })).decision === "pending");
check("frame issues → owner", (await screenUploadedVideo({}, live, meta, info, v1.frames, ["x"], { runImageGuard: safe })).decision === "pending");
check("long video → owner", (await screenUploadedVideo({}, live, meta, { ...info, duration: 900 }, v1.frames, [], { runImageGuard: safe })).decision === "pending");
check("unsafe beats gate", (await screenUploadedVideo({}, { ...live, status: "pending" }, meta, info, v1.frames, [], { runImageGuard: unsafe })).decision === "rejected");

// --- autoScreenPendingVideo with a fake KV ---
function fakeKv() { const m = new Map(); return { m, async get(k, t) { const v = m.get(k); return v == null ? null : t === "json" ? JSON.parse(v) : v; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); } }; }
async function scenario(guard, rowExtra = {}, withFrames = true) {
  const kv = fakeKv(), vid = "v_abcdefghijklmnopqrst";
  const row = { id: "L1", ...live, videoUrl: "", pendingVideo: { url: "upload:" + vid }, ...rowExtra };
  const store = { L1: row }, deleted = [];
  if (withFrames) await kv.put("vframes:" + vid, JSON.stringify({ frames: goodFrames(30, 512, 288), tries: 0, at: 0 }));
  const deps = {
    getVideoMeta: async () => ({ vid, listingId: "L1", type: "video/mp4", size: 1e6, parts: 1 }),
    getVideoPart: async () => mp4(30, 1280, 720),
    deleteVideo: async (_kv, v) => deleted.push(v),
    kvGetListing: async (_kv, id) => store[id],
    saveListing: async (_kv, r) => { store[r.id] = r; },
    promotePendingVideo: (r) => { r.videoUrl = r.pendingVideo.url; r.videoApprovedUrl = r.videoUrl; delete r.pendingVideo; return null; },
    runImageGuard: guard,
  };
  const res = await autoScreenPendingVideo({}, kv, vid, deps);
  return { res, row: store.L1, kv, deleted, vid };
}
let s = await scenario(safe);
check("apply approve promotes", s.res.decision === "approved" && s.row.videoUrl === "upload:" + s.vid && !s.row.pendingVideo && !s.kv.m.size);
s = await scenario(unsafe);
check("apply reject deletes video", s.res.decision === "rejected" && !s.row.pendingVideo && s.deleted.includes(s.vid));
s = await scenario(meh);
check("apply doubtful stays queued", s.res.decision === "pending" && s.row.pendingVideo && s.row.pendingVideo.screen && !s.kv.m.size);
s = await scenario(err);
check("apply error keeps retry record", s.res.retry && s.kv.m.size === 1);
s = await scenario(safe, {}, false);
check("legacy pending video untouched", s.res === null && s.row.pendingVideo && !s.row.videoUrl);

if (failed) { console.error(failed, "failed"); process.exit(1); }
console.log("all video-screening tests passed");
