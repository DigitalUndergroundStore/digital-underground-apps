/**
 * Owner-only live visitors.
 *
 * Presence keys (`presence:{sessionId}`, TTL 180s) are tab heartbeats.
 * Visitor profiles (`visitor:{key}`, TTL 48h) are people on a network:
 * SHA-256 of CF-Connecting-IP plus device/browser family. No cookies.
 *
 * The public POST response is empty. Full IP is stored on the profile and
 * returned only by the owner GET. Copy this file onto the live worker as
 * functions/_lib/presence.js (new). The live owner router should call
 * ownerPresence(kv) — see owner-presence-route.snippet.js in this folder.
 */

export const PRESENCE_TTL_S = 180;
export const PRESENCE_WINDOW_MS = 180000;
export const PRESENCE_WRITE_GAP_MS = 100000;
export const PROFILE_TTL_S = 48 * 60 * 60;
export const PROFILE_WRITE_GAP_MS = 10 * 60 * 1000;
export const VISIT_GAP_MS = 30 * 60 * 1000;
export const PRIVACY_NOTE =
  "Owner-only. Visitors are keyed by a hash of the connecting IP and device/browser family — no cookies, names, or emails. This view stores country, region, city, network (ASN/org), parsed device, OS, and browser, path, referrer, and first/last seen. The full IP is shown only here and marked owner-private; the public site never receives it. Someone counts as online for 3 minutes after the last heartbeat. The visitor profile lasts 48 hours so a person who already visited today can be marked returning. Bots are ignored.";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit/i;
export const KZ_ORIGIN = /^https:\/\/([a-z0-9-]+\.)?kerzylabs\.pages\.dev$/;
const SID_RE = /^[a-z0-9]{12,32}$/;
const APP_RE = /^[a-z0-9][a-z0-9-]{0,40}$/;
const PATH_RE = /^\/[\w\-./]{0,80}$/;

export function isBotUa(ua) {
  return BOT.test(String(ua || ""));
}

/** Kerzy origins may only beacon kz- apps, and kz- apps only from Kerzy origins. */
export function originAppOk(origin, appId) {
  return KZ_ORIGIN.test(origin || "") === String(appId || "").startsWith("kz-");
}

function clip(s, n) {
  return String(s || "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, n);
}

function dec(s, n) {
  let v = String(s || "");
  try {
    v = decodeURIComponent(v.replace(/\+/g, " "));
  } catch {
    /* keep the raw header */
  }
  return clip(v, n);
}

function countryCode(raw) {
  const c = String(raw || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c) || c === "XX" || c === "T1") return "";
  return c;
}

export function cleanReferrer(raw) {
  if (typeof raw !== "string" || !raw) return "";
  try {
    const u = new URL(raw.slice(0, 180));
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return clip(u.origin + u.pathname, 120);
  } catch {
    return "";
  }
}

export function parsePresenceBody(b) {
  if (!b || typeof b !== "object") return null;
  const sid = typeof b.sessionId === "string" && SID_RE.test(b.sessionId) ? b.sessionId : null;
  const appId = typeof b.appId === "string" && APP_RE.test(b.appId) ? b.appId : null;
  const path = typeof b.path === "string" && PATH_RE.test(b.path) ? b.path : "/";
  if (!sid || !appId) return null;
  return { sid, appId, path, referrer: cleanReferrer(b.referrer) };
}

/**
 * Readable device / OS / browser. `family` is the stable identity part
 * (no versions), so a minor UA bump does not split the visitor.
 */
export function parseUa(ua) {
  const s = String(ua || "").slice(0, 400);
  let device = "";
  let deviceKey = "";
  let os = "";
  let osKey = "";
  let browser = "";
  let browserKey = "";

  if (/iPhone/.test(s)) {
    device = "iPhone";
    deviceKey = "iphone";
  } else if (/iPad/.test(s)) {
    device = "iPad";
    deviceKey = "ipad";
  } else if (/iPod/.test(s)) {
    device = "iPod";
    deviceKey = "ipod";
  } else if (/Android/.test(s) && /Mobile/.test(s)) {
    device = "Android phone";
    deviceKey = "android-phone";
  } else if (/Android/.test(s)) {
    device = "Android tablet";
    deviceKey = "android-tablet";
  } else if (/Macintosh/.test(s)) {
    device = "Mac";
    deviceKey = "mac";
  } else if (/Windows/.test(s)) {
    device = "Windows PC";
    deviceKey = "windows";
  } else if (/CrOS/.test(s)) {
    device = "Chromebook";
    deviceKey = "chromebook";
  } else if (/Linux/.test(s)) {
    device = "Linux PC";
    deviceKey = "linux";
  } else if (/SmartTV|SMART-TV|HbbTV|AppleTV|PlayStation|Xbox/i.test(s)) {
    device = "TV";
    deviceKey = "tv";
  }

  const ios = /OS (\d+[_.]\d+(?:[_.]\d+)?)/.exec(s);
  const android = /Android (\d+(?:\.\d+)?)/.exec(s);
  const win = /Windows NT (\d+\.\d+)/.exec(s);
  const mac = /Mac OS X (\d+[_.]\d+(?:[_.]\d+)?)/.exec(s);
  if (/iPhone|iPad|iPod/.test(s) && ios) {
    const ver = ios[1].replace(/_/g, ".");
    if (deviceKey === "ipad") {
      os = "iPadOS " + ver;
      osKey = "ipados";
    } else {
      os = "iOS " + ver;
      osKey = "ios";
    }
  } else if (android) {
    os = "Android " + android[1];
    osKey = "android";
  } else if (win) {
    const map = { "10.0": "10/11", "6.3": "8.1", "6.2": "8", "6.1": "7", "6.0": "Vista", "5.1": "XP" };
    os = "Windows " + (map[win[1]] || win[1]);
    osKey = "windows";
  } else if (mac) {
    os = "macOS " + mac[1].replace(/_/g, ".");
    osKey = "macos";
  } else if (/CrOS/.test(s)) {
    os = "ChromeOS";
    osKey = "chromeos";
  } else if (/Linux/.test(s)) {
    os = "Linux";
    osKey = "linux";
  }

  if (/Edg\//.test(s)) {
    browser = "Edge";
    browserKey = "edge";
  } else if (/OPR\/|Opera/.test(s)) {
    browser = "Opera";
    browserKey = "opera";
  } else if (/SamsungBrowser/.test(s)) {
    browser = "Samsung Internet";
    browserKey = "samsung";
  } else if (/DuckDuckGo/.test(s)) {
    browser = "DuckDuckGo";
    browserKey = "duckduckgo";
  } else if (/CriOS\//.test(s)) {
    browser = "Chrome";
    browserKey = "chrome";
  } else if (/FxiOS\/|Firefox\//.test(s)) {
    browser = "Firefox";
    browserKey = "firefox";
  } else if (/Chrome\//.test(s)) {
    browser = "Chrome";
    browserKey = "chrome";
  } else if (/Safari\//.test(s)) {
    browser = "Safari";
    browserKey = "safari";
  }

  const family = [deviceKey || "unknown", osKey || "unknown", browserKey || "unknown"].join("|");
  return { device, os, browser, family };
}

export function readGeo(request) {
  const h = request && request.headers;
  const cf = (request && request.cf) || {};
  const header = (name) => {
    const v = h && h.get ? h.get(name) : "";
    return v == null ? "" : String(v);
  };
  const country = countryCode(header("CF-IPCountry")) || countryCode(cf.country);
  const region = dec(header("CF-Region"), 40) || dec(cf.region, 40);
  const city = dec(header("CF-IPCity"), 40) || dec(cf.city, 40);
  const asnRaw = header("CF-ASN") || (cf.asn == null ? "" : String(cf.asn));
  const asn = String(asnRaw).replace(/[^\d]/g, "").slice(0, 10);
  const org = dec(header("CF-ASOrganization"), 48) || dec(cf.asOrganization, 48);
  return { country, region, city, asn, org };
}

export function visitorLabel(p) {
  const bits = ["Visitor"];
  if (p.country) bits.push(p.country);
  if (p.city) bits.push(p.city);
  else if (p.region) bits.push(p.region);
  if (p.device) bits.push(p.device);
  if (p.browser) bits.push(p.browser);
  return bits.join(" · ");
}

/** Last two IPv4 octets, or last two IPv6 groups. Full IP stays behind expand. */
export function truncateIp(ip) {
  const s = String(ip || "").trim();
  if (!s || s === "unknown") return "";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) {
    const o = s.split(".");
    return "·.·." + o[2] + "." + o[3];
  }
  if (s.includes(":")) {
    const g = s.split(":").filter(Boolean);
    if (g.length >= 2) return "··:" + g.slice(-2).join(":");
  }
  return "";
}

export async function visitorKeyFor(ip, family) {
  const material = String(ip || "").trim() + "|" + String(family || "");
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function utcDate(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

export function visitorStatus(profile, now) {
  if (!profile || !profile.firstSeen) return "new";
  const today = utcDate(now);
  const firstDay = utcDate(profile.firstSeen);
  if (firstDay < today || (profile.visits || 1) > 1) return "returning";
  return "new";
}

export function mergeProfile(prev, patch, now) {
  const p = prev && typeof prev === "object" ? prev : null;
  const gap = p ? now - (p.lastSeen || 0) : Infinity;
  const newVisit = !p || gap > VISIT_GAP_MS;
  const pages = newVisit ? [] : Array.isArray(p.pages) ? p.pages.slice(0, 8) : [];
  if (patch.path && !pages.includes(patch.path)) {
    pages.push(patch.path);
    if (pages.length > 8) pages.shift();
  }
  const firstSeen = p && p.firstSeen ? p.firstSeen : now;
  return {
    firstSeen,
    lastSeen: now,
    visitStart: newVisit ? now : p.visitStart || firstSeen,
    visits: (p && p.visits ? p.visits : 0) + (newVisit ? 1 : 0),
    country: patch.country || (p && p.country) || "",
    region: patch.region || (p && p.region) || "",
    city: patch.city || (p && p.city) || "",
    asn: patch.asn || (p && p.asn) || "",
    org: patch.org || (p && p.org) || "",
    device: patch.device || (p && p.device) || "",
    os: patch.os || (p && p.os) || "",
    browser: patch.browser || (p && p.browser) || "",
    family: patch.family || (p && p.family) || "",
    ip: patch.ip || (p && p.ip) || "",
    referrer: newVisit ? (patch.referrer || "") : ((p && p.referrer) || patch.referrer || ""),
    pages,
  };
}

/**
 * Whether this heartbeat needs a KV write. Same app+path inside 100s is a skip
 * so idle tabs do not burn the write quota. Pass `seen` (isolate cache).
 */
export async function presenceDecision({ kv, sid, appId, path, seen, now = Date.now() }) {
  const sig = appId + "|" + path;
  const c = seen.get(sid);
  if (c && c.sig === sig && now - c.t < PRESENCE_WRITE_GAP_MS) return { skip: true };
  let md = null;
  if (!c) {
    const m = await kv.getWithMetadata("presence:" + sid).catch(() => null);
    md = m && m.metadata;
    if (md && md.a === appId && md.p === path && now - md.w < PRESENCE_WRITE_GAP_MS) {
      seen.set(sid, { sig, t: md.w, vw: md.vw || 0 });
      // Legacy rows have no visitor key and no enrich marker. Fall through once
      // so the profile is created; `e` stops that from repeating inside the window.
      if (md.k || md.e) return { skip: true };
    }
  }
  return { skip: false, sig, c: c || null, md };
}

function profileDue(decision, pathSig, now) {
  const c = decision.c;
  const md = decision.md;
  const vw = (c && c.vw) || (md && md.vw) || 0;
  const samePath = (c && c.sig === pathSig) || (md && md.a && md.a + "|" + md.p === pathSig);
  const recent = vw && now - vw < PROFILE_WRITE_GAP_MS;
  return !(samePath && recent);
}

export async function commitPresence({ kv, request, ip, ua, sid, appId, path, referrer, decision, seen, now = Date.now() }) {
  const geo = readGeo(request);
  const parsed = parseUa(ua);
  const safeRef = cleanReferrer(referrer);
  const usableIp = ip && ip !== "unknown" ? String(ip).trim() : "";
  const visitorKey = usableIp ? await visitorKeyFor(usableIp, parsed.family) : "";
  const due = visitorKey && profileDue(decision, decision.sig, now);
  if (due) {
    const prev = await kv.get("visitor:" + visitorKey, "json").catch(() => null);
    const next = mergeProfile(
      prev,
      {
        path,
        referrer: safeRef,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        asn: geo.asn,
        org: geo.org,
        device: parsed.device,
        os: parsed.os,
        browser: parsed.browser,
        family: parsed.family,
        ip: usableIp,
      },
      now
    );
    await kv.put("visitor:" + visitorKey, JSON.stringify(next), { expirationTtl: PROFILE_TTL_S }).catch(() => {});
  }
  const vw = due ? now : (decision.c && decision.c.vw) || (decision.md && decision.md.vw) || 0;
  const meta = {
    a: appId,
    p: path,
    w: now,
    k: visitorKey,
    c: geo.country,
    n: geo.region,
    y: geo.city,
    d: parsed.device,
    o: parsed.os,
    b: parsed.browser,
    f: safeRef,
    s: geo.asn,
    g: geo.org,
    vw,
    e: 1,
  };
  await kv.put("presence:" + sid, "1", { expirationTtl: PRESENCE_TTL_S, metadata: meta }).catch(() => {});
  seen.set(sid, { sig: decision.sig, t: now, vw });
  if (seen.size > 5000) seen.clear();
  return { visitorKey, wroteProfile: !!due };
}

function shapeVisitor(key, sessions, profile, now) {
  const list = sessions.slice().sort((a, b) => a.agoS - b.agoS);
  const top = list[0];
  const prof = profile && typeof profile === "object" ? profile : {};
  const country = prof.country || top.country || "";
  const region = prof.region || top.region || "";
  const city = prof.city || top.city || "";
  const device = prof.device || top.device || "";
  const os = prof.os || top.os || "";
  const browser = prof.browser || top.browser || "";
  const ip = prof.ip || "";
  const lastSeen = Math.max(prof.lastSeen || 0, ...list.map((s) => s.lastSeen || 0));
  const firstSeen = prof.firstSeen || lastSeen;
  const pages = Array.isArray(prof.pages) && prof.pages.length ? prof.pages.slice(0, 8) : [...new Set(list.map((s) => s.path))];
  const visits = prof.visits || 1;
  const status = visitorStatus({ firstSeen, visits }, now);
  const visitorKey = key.startsWith("sid:") ? "" : key;
  return {
    visitorKey,
    label: visitorLabel({ country, region, city, device, browser }),
    country,
    region,
    city,
    asn: prof.asn || top.asn || "",
    org: prof.org || top.org || "",
    device,
    os,
    browser,
    ip,
    ipShort: truncateIp(ip),
    ipPrivate: true,
    firstSeen,
    lastSeen,
    agoS: Math.max(0, Math.round((now - lastSeen) / 1000)),
    referrer: prof.referrer || top.referrer || "",
    pages,
    currentPath: top.path || "/",
    status,
    newToday: status === "new",
    returning: status === "returning",
    visits,
    sessions: list.map((s) => ({
      id: s.shortId,
      appId: s.appId,
      path: s.path,
      lastSeen: s.lastSeen,
      agoS: s.agoS,
    })),
  };
}

export async function ownerPresence(kv, now = Date.now()) {
  const sessions = [];
  let cursor;
  let loops = 0;
  do {
    if (++loops > 8) break;
    const r = await kv.list({ prefix: "presence:", cursor, limit: 1000 });
    for (const k of r.keys || []) {
      const m = k.metadata || {};
      if (!m.a || now - (m.w || 0) > PRESENCE_WINDOW_MS) continue;
      const full = String(k.name || "").slice(9);
      sessions.push({
        full,
        shortId: full.slice(0, 8),
        appId: m.a,
        path: m.p || "/",
        lastSeen: m.w,
        agoS: Math.max(0, Math.round((now - m.w) / 1000)),
        visitorKey: m.k || "",
        country: m.c || "",
        region: m.n || "",
        city: m.y || "",
        device: m.d || "",
        os: m.o || "",
        browser: m.b || "",
        referrer: m.f || "",
        asn: m.s || "",
        org: m.g || "",
      });
    }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);

  const groups = new Map();
  for (const s of sessions) {
    const key = s.visitorKey || "sid:" + s.full;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  const keys = [...groups.keys()].slice(0, 200);
  const visitors = await Promise.all(
    keys.map(async (key) => {
      let profile = null;
      if (!key.startsWith("sid:")) {
        profile = await kv.get("visitor:" + key, "json").catch(() => null);
      }
      return shapeVisitor(key, groups.get(key), profile, now);
    })
  );
  visitors.sort((a, b) => a.agoS - b.agoS);

  const appsMap = new Map();
  for (const v of visitors) {
    const byApp = new Map();
    for (const s of v.sessions) {
      if (!byApp.has(s.appId)) byApp.set(s.appId, []);
      byApp.get(s.appId).push(s);
    }
    for (const [appId, appSessions] of byApp) {
      if (!appsMap.has(appId)) appsMap.set(appId, []);
      const agoS = appSessions.reduce((min, s) => Math.min(min, s.agoS), appSessions[0].agoS);
      appsMap.get(appId).push({
        ...v,
        agoS,
        currentPath: appSessions.slice().sort((a, b) => a.agoS - b.agoS)[0].path,
        sessions: appSessions.slice().sort((a, b) => a.agoS - b.agoS),
      });
    }
  }

  const apps = [...appsMap.entries()]
    .map(([appId, list]) => ({
      appId,
      count: list.length,
      sessionCount: list.reduce((n, v) => n + v.sessions.length, 0),
      visitors: list.sort((a, b) => a.agoS - b.agoS),
    }))
    .sort((a, b) => b.count - a.count || a.appId.localeCompare(b.appId));

  return {
    online: visitors.length,
    sessionCount: sessions.length,
    apps,
    visitors,
    generatedAt: now,
    windowS: PRESENCE_TTL_S,
    privacyNote: PRIVACY_NOTE,
  };
}
