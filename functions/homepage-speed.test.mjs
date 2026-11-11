import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { coverSrc, coverVersion, EAGER_COVER_COUNT, isSameOriginCover } from "./_lib/cover-src.js";
import { edgeCached, hasAuthCookie } from "./_lib/edgecache.js";
import { isSafeCoverTarget, serveHostedCover, fetchCoverBytes, hostedFallback, onRequestGet as imgGet } from "./api/community/img.js";
import { serveVideo, VIDEO_CACHE_CONTROL } from "./_lib/video.js";
import { cachedListingGet, listingCacheKey, LISTING_CACHE_TTL, LISTING_CACHE_SWR } from "./community/p/[slug].js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const listingHtml = readFileSync(join(root, "community/p/index.html"), "utf8");
const homeJs = readFileSync(join(root, "assets/home-v3/home.js"), "utf8");
const headersFile = readFileSync(join(root, "_headers"), "utf8");

let failed = 0;
function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", name);
  } else console.log("ok", name);
}

function makeCache() {
  const map = new Map();
  const keyOf = (req) => (typeof req === "string" ? req : req.url);
  return {
    map,
    async match(req) { const v = map.get(keyOf(req)); return v ? v.clone() : undefined; },
    async put(req, res) { map.set(keyOf(req), res.clone()); },
  };
}

const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

// --- coverSrc rewrite ---
const ext = "https://debutdock.com/cover.webp";
const id = "cm_mwexample_9c916df8";
const proxied = coverSrc(ext, { id, index: 0 });
check("first card cover rewritten to img proxy", proxied.startsWith("/api/community/img?id=" + encodeURIComponent(id)));
check("proxy URL keeps a version token", proxied.includes("&v=") && proxied.includes(encodeURIComponent(coverVersion(ext))));
check("eager card 3 is proxied", coverSrc(ext, { id, index: 3 }).startsWith("/api/community/img?"));
check("card 4 (lazy) keeps original URL", coverSrc(ext, { id, index: 4 }) === ext);
check("eager count is 4", EAGER_COVER_COUNT === 4);
check("remap still wins over proxy", coverSrc("https://food-hunt.org/og-image.png", { id, index: 0 }) === "/community/media/food-hunt-cover.webp?v=20261107a");
check("same-origin path not proxied", coverSrc("/community/media/x.webp", { id, index: 0 }) === "/community/media/x.webp");
check("uploaded img proxy not re-proxied", isSameOriginCover("/api/community/img?id=cm_x&v=1"));
check("same-origin absolute not proxied", coverSrc("https://digitalundergroundstore.com/assets/logo/du-mark.png", { id, index: 0 }).endsWith("/assets/logo/du-mark.png"));
check("missing id leaves original", coverSrc(ext, { index: 0 }) === ext);
check("empty cover is empty", !coverSrc("") && !coverSrc(null));

check("home.js coverSrc proxies first cards", /\/api\/community\/img\?id=/.test(homeJs) && /i >= 4/.test(homeJs));
check("home.js toProject passes id and index", /coverSrc\(r\.imageUrl,\s*r\.id,\s*i\)/.test(homeJs));

// --- SSRF ---
check("https public host allowed", isSafeCoverTarget("https://debutdock.com/og.webp") === true);
check("http rejected", isSafeCoverTarget("http://debutdock.com/og.webp") === false);
check("localhost rejected", isSafeCoverTarget("https://localhost/x") === false);
check("private dns suffix rejected", isSafeCoverTarget("https://foo.internal/x") === false);
check("ipv4 rejected", isSafeCoverTarget("https://127.0.0.1/x") === false);
check("link-local ipv4 rejected", isSafeCoverTarget("https://169.254.169.254/latest") === false);
check("credentials rejected", isSafeCoverTarget("https://user:pass@debutdock.com/x") === false);
check("self img endpoint rejected", isSafeCoverTarget("https://digitalundergroundstore.com/api/community/img?id=x") === false);
check("junk rejected", isSafeCoverTarget("not a url") === false);

const fetches = [];
function mockFetchFactory(handler) {
  return async (url, opts = {}) => {
    fetches.push({ url: String(url), opts });
    return handler(String(url), opts);
  };
}

fetches.length = 0;
const okFetch = mockFetchFactory(() => new Response(PNG, { status: 200, headers: { "Content-Type": "image/webp" } }));
const proxiedRes = await serveHostedCover(ext, new URL("https://digitalundergroundstore.com/api/community/img?id=" + id + "&v=1"), { fetchImpl: okFetch });
check("proxy returns 200 image", proxiedRes.status === 200 && (proxiedRes.headers.get("Content-Type") || "").includes("image/"));
const cc = proxiedRes.headers.get("Cache-Control") || "";
check("proxy long cache", cc.includes("public") && /max-age=604800/.test(cc));
check("proxy fetched the third-party URL", fetches.some((f) => f.url === ext));
const body = new Uint8Array(await proxiedRes.arrayBuffer());
check("proxy body is the image", body.byteLength === PNG.byteLength);

fetches.length = 0;
const badHost = await serveHostedCover("https://127.0.0.1/secret", new URL("https://digitalundergroundstore.com/api/community/img?id=x"), { fetchImpl: okFetch });
check("unsafe host does not fetch", fetches.length === 0);
check("unsafe host falls back to 302", badHost.status === 302 && badHost.headers.get("Location") === "https://127.0.0.1/secret");

fetches.length = 0;
const hopFetch = mockFetchFactory((url) => {
  if (url === "https://debutdock.com/cover.webp") {
    return new Response(null, { status: 302, headers: { Location: "https://169.254.169.254/meta" } });
  }
  return new Response(PNG, { status: 200, headers: { "Content-Type": "image/png" } });
});
const hopRes = await serveHostedCover("https://debutdock.com/cover.webp", new URL("https://digitalundergroundstore.com/api/community/img?id=x&v=1"), { fetchImpl: hopFetch });
check("redirect to private host is not followed", !fetches.some((f) => /169\.254/.test(f.url)));
check("private redirect falls back to original URL", hopRes.status === 302 && hopRes.headers.get("Location") === "https://debutdock.com/cover.webp");

fetches.length = 0;
const failFetch = mockFetchFactory(() => new Response("nope", { status: 500 }));
const failRes = await serveHostedCover(ext, new URL("https://digitalundergroundstore.com/api/community/img?id=x"), { fetchImpl: failFetch });
check("failed fetch falls back to original URL", failRes.status === 302 && failRes.headers.get("Location") === ext);
check("fallback is short-cached", /max-age=60/.test(failRes.headers.get("Cache-Control") || ""));

// img handler: approved listing with hosted cover
const row = { id, status: "approved", imageUrl: ext };
const kv = { async get(key, type) { return key === `community:item:${id}` ? row : null; } };
const prevFetch = globalThis.fetch;
let handlerFetches = 0;
globalThis.fetch = async (url) => {
  handlerFetches += 1;
  return new Response(PNG, { status: 200, headers: { "Content-Type": "image/webp" } });
};
const imgRes = await imgGet({
  request: new Request(`https://digitalundergroundstore.com/api/community/img?id=${id}&v=abc`),
  env: { COMMUNITY_KV: kv },
  waitUntil() {},
});
globalThis.fetch = prevFetch;
check("img handler serves hosted cover as 200", imgRes.status === 200 && (imgRes.headers.get("Content-Type") || "").includes("image/"));
check("img handler long cache", /max-age=604800/.test(imgRes.headers.get("Cache-Control") || ""));
check("img handler fetched cover", handlerFetches >= 1);

// data URI still works
const jpeg64 = Buffer.from(PNG).toString("base64"); // not a real jpeg; type comes from the data URI prefix
const dataRow = { id: "cm_data_aaa", status: "approved", imageUrl: `data:image/png;base64,${jpeg64}` };
const kv2 = { async get(key, type) { return key === "community:item:cm_data_aaa" ? dataRow : null; } };
const dataRes = await imgGet({
  request: new Request("https://digitalundergroundstore.com/api/community/img?id=cm_data_aaa&v=2"),
  env: { COMMUNITY_KV: kv2 },
  waitUntil() {},
});
check("data URI upload still served", dataRes.status === 200 && dataRes.headers.get("Content-Type") === "image/png");
check("data URI long cache with v", /max-age=604800/.test(dataRes.headers.get("Cache-Control") || ""));

const missRes = await imgGet({
  request: new Request("https://digitalundergroundstore.com/api/community/img?id=cm_missing_xxx"),
  env: { COMMUNITY_KV: { async get() { return null; } } },
  waitUntil() {},
});
check("unknown listing falls back to logo", missRes.status === 302 && /du-mark\.png/.test(missRes.headers.get("Location") || ""));

// --- listing video preload / autoplay ---
check("listing video preload is metadata", /preload="metadata"/.test(listingHtml));
check("listing video no preload=auto", !/preload="auto"/.test(listingHtml));
check("listing file video has no autoplay attribute", !/<video[^>]*autoplay/.test(listingHtml));
check("listing file video keeps poster/muted/loop/controls", /poster=/.test(listingHtml) && /muted loop playsinline controls preload="metadata"/.test(listingHtml));
check("listing video plays when in view", /IntersectionObserver/.test(listingHtml) && /data-du-listing/.test(listingHtml) && /fileVid\.play\(/.test(listingHtml));

// --- video endpoint headers + Range 206 ---
const vid = "v_testvideo1";
const chunk = 100;
const bytes = Uint8Array.from({ length: 250 }, (_, i) => i % 256);
const parts = {
  [`video:${vid}:0`]: bytes.slice(0, 100).buffer,
  [`video:${vid}:1`]: bytes.slice(100, 200).buffer,
  [`video:${vid}:2`]: bytes.slice(200).buffer,
};
const vkv = {
  async get(key, type) { return parts[key] || null; },
};
const meta = { vid, listingId: id, type: "video/mp4", size: 250, chunk, parts: 3, done: true };

const mem = makeCache();
const prevCaches = globalThis.caches;
globalThis.caches = { default: mem };

const fullReq = new Request("https://digitalundergroundstore.com/api/community/video?v=" + vid);
const full = await serveVideo(vkv, fullReq, meta);
check("full video 200", full.status === 200);
check("video cache-control public long", (full.headers.get("Cache-Control") || "") === VIDEO_CACHE_CONTROL && /s-maxage=604800/.test(VIDEO_CACHE_CONTROL));
check("video accept-ranges", full.headers.get("Accept-Ranges") === "bytes");
const fullBuf = new Uint8Array(await full.arrayBuffer());
check("full video body length", fullBuf.byteLength === 250 && fullBuf[0] === 0 && fullBuf[249] === 249 % 256);

const rangeReq = new Request("https://digitalundergroundstore.com/api/community/video?v=" + vid, { headers: { Range: "bytes=0-19" } });
const partial = await serveVideo(vkv, rangeReq, meta);
check("range is 206", partial.status === 206);
check("range content-range", partial.headers.get("Content-Range") === "bytes 0-19/250");
check("range accept-ranges and cache", partial.headers.get("Accept-Ranges") === "bytes" && /public/.test(partial.headers.get("Cache-Control") || ""));
const partBuf = new Uint8Array(await partial.arrayBuffer());
check("range body is the requested slice", partBuf.byteLength === 20 && partBuf[0] === 0 && partBuf[19] === 19);

const range2 = await serveVideo(vkv, rangeReq, meta);
check("second range request is cache HIT", range2.status === 206 && mem.map.size >= 1);
const part2 = new Uint8Array(await range2.arrayBuffer());
check("cached range body still seeks correctly", part2.byteLength === 20 && part2[19] === 19);

const badRange = await serveVideo(vkv, new Request(fullReq.url, { headers: { Range: "bytes=9000-9010" } }), meta);
check("unsatisfiable range is 416", badRange.status === 416);

// --- listing page edge cache ---
check("listing cache is 120s + 600s swr", LISTING_CACHE_TTL === 120 && LISTING_CACHE_SWR === 600);
check("listing cache key is per slug", listingCacheKey("https://ex.com", "debutdock-9c916df8") === "https://ex.com/__du_cache/listing-ssr-v1/debutdock-9c916df8");

check("no auth cookie", hasAuthCookie(new Request("https://ex.com/x")) === false);
check("creator cookie is auth", hasAuthCookie(new Request("https://ex.com/x", { headers: { Cookie: "du_creator=abc" } })) === true);
check("owner cookie is auth", hasAuthCookie(new Request("https://ex.com/x", { headers: { Cookie: "other=1; du_owner_sess=tok" } })) === true);
check("unrelated cookie is not auth", hasAuthCookie(new Request("https://ex.com/x", { headers: { Cookie: "theme=dark" } })) === false);

let produces = 0;
const slowProduce = async () => {
  produces += 1;
  await new Promise((r) => setTimeout(r, 40));
  return new Response("<html>listing</html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
};
const publicCtx = {
  request: new Request("https://digitalundergroundstore.com/community/p/debutdock-9c916df8/"),
  params: { slug: "debutdock-9c916df8" },
  waitUntil() {},
};
const tMiss0 = Date.now();
const miss = await cachedListingGet(publicCtx, slowProduce);
const tMiss = Date.now() - tMiss0;
const tHit0 = Date.now();
const hit = await cachedListingGet(publicCtx, slowProduce);
const tHit = Date.now() - tHit0;
check("listing first request is MISS with swr headers", miss.status === 200 && miss.headers.get("x-du-cache") === "MISS" && /s-maxage=120/.test(miss.headers.get("Cache-Control") || "") && /stale-while-revalidate=600/.test(miss.headers.get("Cache-Control") || ""));
check("listing second request is HIT", hit.status === 200 && hit.headers.get("x-du-cache") === "HIT" && produces === 1);
check("HIT is faster than MISS (isolated)", tHit < tMiss && tHit < 25);
console.log("timing listing cache miss_ms=" + tMiss + " hit_ms=" + tHit);

const authCtx = {
  request: new Request("https://digitalundergroundstore.com/community/p/debutdock-9c916df8/", { headers: { Cookie: "du_creator=sess" } }),
  params: { slug: "debutdock-9c916df8" },
  waitUntil() {},
};
const bypass = await cachedListingGet(authCtx, slowProduce);
check("auth cookie bypasses edge cache", bypass.headers.get("x-du-cache") === "BYPASS" && /private/.test(bypass.headers.get("Cache-Control") || "") && /no-store/.test(bypass.headers.get("Cache-Control") || ""));
check("auth request was not served from public HIT and was not stored as public", produces === 2);

const setCookieProduce = async () => new Response("x", { status: 200, headers: { "set-cookie": "du_creator=nope", "content-type": "text/html" } });
const cookieRes = await edgeCached(
  { request: new Request("https://ex.com/"), waitUntil() {} },
  "https://ex.com/__du_cache/should-not-store",
  120,
  600,
  setCookieProduce,
);
check("set-cookie responses are not stored in edge cache", cookieRes.headers.get("x-du-cache") !== "MISS" && !(await mem.match(new Request("https://ex.com/__du_cache/should-not-store"))));

globalThis.caches = prevCaches;

// --- static asset cache headers ---
check("featured images cached", /\/assets\/featured\/\*\n\s+Cache-Control: public, max-age=86400/.test(headersFile));
check("logos cached", /\/assets\/logo\/\*\n\s+Cache-Control: public, max-age=86400/.test(headersFile));
check("site-nav cached", /\/assets\/site-nav\/\*\n\s+Cache-Control: public, max-age=86400/.test(headersFile));
check("headers do not cache planetview html/js specially as immutable", !/\/planetview\/\*[\s\S]{0,80}max-age=31536000, immutable/.test(headersFile));

const indexHtml = readFileSync(join(root, "index.html"), "utf8");
check("homepage home.js cache-bust bumped", indexHtml.includes("/assets/home-v3/home.js?v=20261110speed1"));
check("homepage still has Featured and MotW hooks", indexHtml.includes("this-spot-could-be-yours-wide.webp") && indexHtml.includes('id="motw-slot"'));


if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all checks passed");
