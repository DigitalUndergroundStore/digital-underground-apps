/** Hourly fallback sweep for listing videos whose instant auto-screen errored (see functions/_lib/video-screening.js). */
import { kvGetListing, promotePendingVideo, saveListing } from "../../../functions/_lib/community.js";
import { deleteVideo, getVideoMeta, getVideoPart } from "../../../functions/_lib/video.js";
import { autoScreenPendingVideo } from "../../../functions/_lib/video-screening.js";

const PER_RUN = 6, MIN_AGE_MS = 10 * 60 * 1000;

export async function sweep(env) {
  const kv = env.COMMUNITY_KV, done = [];
  const page = await kv.list({ prefix: "vframes:", limit: 100 });
  for (const k of page.keys) {
    if (done.length >= PER_RUN) break;
    const vid = k.name.slice("vframes:".length);
    const rec = await kv.get(k.name, "json");
    if (!rec || Date.now() - (rec.retryAt || rec.at || 0) < MIN_AGE_MS) continue; // let the instant path finish first
    try { done.push({ vid, ...(await autoScreenPendingVideo(env, kv, vid, { getVideoMeta, getVideoPart, deleteVideo, kvGetListing, saveListing, promotePendingVideo })) }); }
    catch (e) { console.error("sweep", vid, e); }
  }
  return done;
}

export default {
  async scheduled(_event, env, ctx) { ctx.waitUntil(sweep(env).then((r) => console.log("video sweep", JSON.stringify(r)))); },
  async fetch() { return new Response("du-video-sweep: cron only", { status: 404 }); },
};
