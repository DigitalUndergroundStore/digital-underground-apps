import {
  PRIVACY_NOTE,
  PROFILE_TTL_S,
  cleanReferrer,
  commitPresence,
  isBotUa,
  originAppOk,
  ownerPresence,
  parsePresenceBody,
  parseUa,
  presenceDecision,
  readGeo,
  truncateIp,
  visitorKeyFor,
  visitorLabel,
  visitorStatus,
} from "./presence.js";

let failed = 0;
function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", name);
  } else console.log("ok", name);
}

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const EDGE =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const FIREFOX =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0";
const SAMSUNG =
  "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36";
const CRIOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.6613.92 Mobile/15E148 Safari/604.1";

const iphone = parseUa(IPHONE);
check("iphone device", iphone.device === "iPhone" && iphone.os === "iOS 17.5" && iphone.browser === "Safari");
check("iphone family", iphone.family === "iphone|ios|safari");
const edge = parseUa(EDGE);
check("edge not chrome", edge.browser === "Edge" && edge.device === "Windows PC" && edge.os === "Windows 10/11");
check("chrome", parseUa(CHROME).browser === "Chrome" && parseUa(CHROME).family === "windows|windows|chrome");
check("ipad", parseUa(IPAD).device === "iPad" && parseUa(IPAD).os === "iPadOS 17.5" && parseUa(IPAD).browser === "Safari");
check("android", parseUa(ANDROID).device === "Android phone" && parseUa(ANDROID).os === "Android 14" && parseUa(ANDROID).browser === "Chrome");
check("mac safari", parseUa(MAC).device === "Mac" && parseUa(MAC).os === "macOS 10.15.7" && parseUa(MAC).browser === "Safari");
check("firefox", parseUa(FIREFOX).browser === "Firefox" && parseUa(FIREFOX).device === "Mac");
check("samsung", parseUa(SAMSUNG).browser === "Samsung Internet" && parseUa(SAMSUNG).device === "Android phone");
check("crios", parseUa(CRIOS).browser === "Chrome" && parseUa(CRIOS).family === "iphone|ios|chrome");
check("empty ua", visitorLabel(parseUa("")) === "Visitor");

check("label", visitorLabel({ country: "CA", region: "Ontario", city: "Toronto", device: "iPhone", browser: "Safari" }) === "Visitor · CA · Toronto · iPhone · Safari");
check("label region fallback", visitorLabel({ country: "CA", region: "Ontario", device: "Mac", browser: "Safari" }) === "Visitor · CA · Ontario · Mac · Safari");
check("truncate v4", truncateIp("203.0.113.10") === "·.·.113.10");
check("truncate v6", truncateIp("2001:db8::1") === "··:db8:1");
check("truncate unknown", truncateIp("unknown") === "" && truncateIp("") === "");

check("bot", isBotUa("Mozilla/5.0 (compatible; Googlebot/2.1)"));
check("not bot", !isBotUa(IPHONE));

check("kz origin ok", originAppOk("https://kerzylabs.pages.dev", "kz-quad-pong"));
check("kz subdomain ok", originAppOk("https://play.kerzylabs.pages.dev", "kz-hub"));
check("kz origin blocks du app", !originAppOk("https://kerzylabs.pages.dev", "pantry-week"));
check("du origin ok", originAppOk("https://digitalunderground.pages.dev", "pantry-week"));
check("du origin blocks kz app", !originAppOk("https://digitalunderground.pages.dev", "kz-hub"));
check("http kz rejected", !originAppOk("http://kerzylabs.pages.dev", "kz-hub"));

const parsed = parsePresenceBody({
  sessionId: "abc123xyz789",
  appId: "pantry-week",
  path: "/pantry-week/",
  referrer: "https://news.example/story?token=secret&utm=1",
});
check("body", parsed && parsed.path === "/pantry-week/" && parsed.sid === "abc123xyz789");
check("referrer strips query", parsed.referrer === "https://news.example/story");
check("bad sid", parsePresenceBody({ sessionId: "short", appId: "home", path: "/" }) === null);
check("bad path falls back", parsePresenceBody({ sessionId: "abc123xyz789", appId: "home", path: "nope" }).path === "/");
check("bad referrer", cleanReferrer("javascript:alert(1)") === "");

function req(headers, cf) {
  const map = new Map(Object.entries(headers));
  return { headers: { get: (n) => (map.has(n) ? map.get(n) : null) }, cf };
}
const geo = readGeo(req({
  "CF-IPCountry": "CA",
  "CF-Region": "Ontario",
  "CF-IPCity": "S%C3%A3o%20Paulo",
  "CF-ASN": "AS16509",
  "CF-ASOrganization": "Example ISP",
}, { country: "US", city: "Ignored", asn: 1, asOrganization: "Other" }));
check("geo headers win", geo.country === "CA" && geo.city === "São Paulo" && geo.region === "Ontario" && geo.asn === "16509" && geo.org === "Example ISP");
const geoCf = readGeo(req({ "CF-IPCountry": "XX" }, { country: "US", region: "California", city: "San Jose", asn: 13335, asOrganization: "Cloudflare" }));
check("geo cf fallback", geoCf.country === "US" && geoCf.city === "San Jose" && geoCf.asn === "13335" && geoCf.org === "Cloudflare");

function memKv() {
  const values = new Map();
  const metas = new Map();
  const ttls = new Map();
  return {
    puts: [],
    async get(key, type) {
      if (!values.has(key)) return null;
      const raw = values.get(key);
      return type === "json" ? JSON.parse(raw) : raw;
    },
    async getWithMetadata(key) {
      return { value: values.has(key) ? values.get(key) : null, metadata: metas.get(key) || null };
    },
    async put(key, value, opts) {
      this.puts.push(key);
      values.set(key, value);
      if (opts && Object.prototype.hasOwnProperty.call(opts, "metadata")) metas.set(key, opts.metadata);
      if (opts && opts.expirationTtl) ttls.set(key, opts.expirationTtl);
    },
    async list() {
      const keys = [];
      for (const [name, metadata] of metas) {
        if (String(name).startsWith("presence:")) keys.push({ name, metadata });
      }
      return { keys, list_complete: true };
    },
    ttl: (key) => ttls.get(key),
    meta: (key) => metas.get(key),
  };
}

function beatRequest(extra) {
  return req({
    "CF-IPCountry": "CA",
    "CF-Region": "Ontario",
    "CF-IPCity": "Toronto",
    "CF-ASN": "16509",
    "CF-ASOrganization": "Example ISP",
    ...extra,
  });
}

async function beat(kv, seen, opts) {
  const decision = await presenceDecision({
    kv,
    sid: opts.sid,
    appId: opts.appId,
    path: opts.path,
    seen,
    now: opts.now,
  });
  if (decision.skip) return { skipped: true };
  const wrote = await commitPresence({
    kv,
    request: opts.request,
    ip: opts.ip,
    ua: opts.ua,
    sid: opts.sid,
    appId: opts.appId,
    path: opts.path,
    referrer: opts.referrer || "",
    decision,
    seen,
    now: opts.now,
  });
  return { skipped: false, ...wrote };
}

const now = Date.parse("2026-10-30T18:00:00.000Z");
const kv = memKv();
const seen = new Map();
const ip = "203.0.113.10";
const sidA = "aaaaaaaabbbb";
const sidB = "cccccccddddd";

const first = await beat(kv, seen, {
  now,
  sid: sidA,
  appId: "pantry-week",
  path: "/pantry-week/",
  ip,
  ua: IPHONE,
  request: beatRequest(),
  referrer: "https://news.example/story?token=secret",
});
check("first write", first.skipped === false && first.wroteProfile === true && first.visitorKey && !first.visitorKey.includes(ip));
check("presence ttl", kv.ttl("presence:" + sidA) === 180);
check("profile ttl", kv.ttl("visitor:" + first.visitorKey) === PROFILE_TTL_S);
const meta = kv.meta("presence:" + sidA);
check("metadata hides ip", meta && meta.k === first.visitorKey && !JSON.stringify(meta).includes(ip));
const profile = await kv.get("visitor:" + first.visitorKey, "json");
check("profile stores ip", profile.ip === ip && profile.city === "Toronto" && profile.pages[0] === "/pantry-week/");
check("profile referrer clean", profile.referrer === "https://news.example/story");

const throttled = await beat(kv, seen, {
  now: now + 50000,
  sid: sidA,
  appId: "pantry-week",
  path: "/pantry-week/",
  ip,
  ua: IPHONE,
  request: beatRequest(),
});
check("throttle 50s", throttled.skipped === true);

const samePathLater = await beat(kv, seen, {
  now: now + 120000,
  sid: sidA,
  appId: "pantry-week",
  path: "/pantry-week/",
  ip,
  ua: IPHONE,
  request: beatRequest(),
});
const profileAfter = await kv.get("visitor:" + first.visitorKey, "json");
check("presence refresh skips profile", samePathLater.skipped === false && samePathLater.wroteProfile === false && profileAfter.lastSeen === now);

const page2 = await beat(kv, seen, {
  now: now + 130000,
  sid: sidA,
  appId: "pantry-week",
  path: "/pantry-week/print/",
  ip,
  ua: IPHONE,
  request: beatRequest(),
});
const profilePages = await kv.get("visitor:" + first.visitorKey, "json");
check("path adds page", page2.wroteProfile === true && profilePages.pages.join(",") === "/pantry-week/,/pantry-week/print/" && profilePages.visits === 1);

const otherTab = await beat(kv, new Map(), {
  now: now + 140000,
  sid: sidB,
  appId: "home",
  path: "/",
  ip,
  ua: IPHONE,
  request: beatRequest(),
});
check("same network same key", otherTab.visitorKey === first.visitorKey);

const otherBrowser = await beat(kv, new Map(), {
  now: now + 140000,
  sid: "eeeeeeeeffff",
  appId: "home",
  path: "/",
  ip,
  ua: MAC,
  request: beatRequest(),
});
check("other browser other key", otherBrowser.visitorKey && otherBrowser.visitorKey !== first.visitorKey);

const stable = await visitorKeyFor(ip, iphone.family);
check("key stable", stable === first.visitorKey && stable !== (await visitorKeyFor(ip, parseUa(MAC).family)));

const view = await ownerPresence(kv, now + 150000);
check("online unique", view.online === 2 && view.sessionCount === 3);
const person = view.visitors.find((v) => v.visitorKey === first.visitorKey);
check("card label", person && person.label === "Visitor · CA · Toronto · iPhone · Safari");
check("card not session id", person && !person.label.startsWith("#") && person.label !== sidA.slice(0, 8));
check("owner ip", person && person.ip === ip && person.ipShort === "·.·.113.10" && person.ipPrivate === true);
check("two tabs", person && person.sessions.length === 2);
check("new today", person && person.status === "new" && person.newToday === true && person.returning === false);
const apps = Object.fromEntries(view.apps.map((a) => [a.appId, a.count]));
check("per app visitors", apps["pantry-week"] === 1 && apps.home === 2);
check("privacy note", view.privacyNote === PRIVACY_NOTE && /hash/i.test(view.privacyNote) && /emails/i.test(view.privacyNote) && /full IP/i.test(view.privacyNote) && /no cookies/i.test(view.privacyNote));

const kv2 = memKv();
const seen2 = new Map();
await beat(kv2, seen2, {
  now: now - 24 * 60 * 60 * 1000,
  sid: sidA,
  appId: "home",
  path: "/",
  ip,
  ua: IPHONE,
  request: beatRequest(),
});
await beat(kv2, seen2, {
  now,
  sid: sidA,
  appId: "home",
  path: "/store/",
  ip,
  ua: IPHONE,
  request: beatRequest(),
});
const back = await ownerPresence(kv2, now);
check("returning", back.online === 1 && back.visitors[0].status === "returning" && back.visitors[0].returning === true);
check("visit pages reset", back.visitors[0].pages.join(",") === "/store/");

const kv3 = memKv();
await kv3.put("presence:" + sidA, "1", {
  metadata: { a: "home", p: "/", w: now, d: "iPhone", b: "Safari", c: "CA", y: "Toronto" },
  expirationTtl: 180,
});
const legacy = await presenceDecision({ kv: kv3, sid: sidA, appId: "home", path: "/", seen: new Map(), now: now + 1000 });
check("legacy enriches once", legacy.skip === false);
await commitPresence({
  kv: kv3,
  request: beatRequest(),
  ip,
  ua: IPHONE,
  sid: sidA,
  appId: "home",
  path: "/",
  referrer: "",
  decision: legacy,
  seen: new Map(),
  now: now + 1000,
});
const after = await presenceDecision({ kv: kv3, sid: sidA, appId: "home", path: "/", seen: new Map(), now: now + 2000 });
check("enriched then throttle", after.skip === true && kv3.meta("presence:" + sidA).k);

const kv4 = memKv();
await kv4.put("presence:oldsession11", "1", {
  metadata: { a: "home", p: "/old", w: now - 200000, u: "deadbeef" },
  expirationTtl: 180,
});
await kv4.put("presence:freshsess111", "1", {
  metadata: { a: "home", p: "/now", w: now, d: "Mac", b: "Safari", c: "CA", y: "Toronto" },
  expirationTtl: 180,
});
const stale = await ownerPresence(kv4, now);
check("stale dropped", stale.online === 1 && stale.visitors[0].label === "Visitor · CA · Toronto · Mac · Safari");
check("no ua hash lead", !stale.visitors[0].label.includes("deadbeef") && stale.visitors[0].visitorKey === "");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all ok");
