/**
 * POST /api/community/autofill { url } -> { ok, name, pitchShort, imageUrl, projectUrl, favicon }
 * Reads public page metadata to prefill the submit form. Nothing is stored; the submission
 * itself still goes through /api/community/submit checks and moderation.
 * Safety: http/https only, default ports, private/internal IPs blocked (literal + DNS),
 * redirects re-validated (max 3), 6s timeout, 512 KB cap, HTML only, per-IP rate limit.
 */
import { ipRules, rateAll } from "../../_lib/ratelimit.js";

const MAX_BYTES = 512 * 1024, TIMEOUT_MS = 6000, MAX_REDIRECTS = 3;
const json = (d, s = 200, h = {}) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...h } });

function v4Private(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !(n >= 0 && n <= 255))) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
}
function v6Private(ip) {
  const s = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (s === "::" || s === "::1") return true;
  const m = s.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/); if (m) return v4Private(m[1]);
  return /^(fc|fd|fe[89ab]|ff|::ffff:|64:ff9b|2001:db8|2002:)/.test(s) || !/^[23]/.test(s);
}
const isV4 = (h) => /^\d{1,3}(\.\d{1,3}){3}$/.test(h);

async function hostSafe(host) {
  host = host.toLowerCase();
  if (host.includes(":") || host.startsWith("[")) return !v6Private(host);
  if (isV4(host)) return !v4Private(host);
  if (/^\d+$/.test(host) || /^0x/.test(host)) return false; // decimal/hex IP tricks
  if (!host.includes(".") || /(^|\.)(localhost|local|internal|intranet|lan|home|corp|arpa)$/.test(host)) return false;
  for (const type of ["A", "AAAA"]) {
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, { headers: { accept: "application/dns-json" } });
      const d = await r.json();
      for (const a of d.Answer || []) {
        if (a.type === 1 && v4Private(a.data)) return false;
        if (a.type === 28 && v6Private(a.data)) return false;
      }
    } catch { return false; }
  }
  return true;
}

async function checkUrl(raw) {
  let u; try { u = new URL(String(raw).trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) return null;
  if (u.port && !["80", "443"].includes(u.port)) return null;
  return (await hostSafe(u.hostname)) ? u : null;
}

async function readCapped(res) {
  const reader = res.body.getReader(); const chunks = []; let n = 0;
  while (n < MAX_BYTES) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); n += value.length; }
  try { reader.cancel(); } catch {}
  const buf = new Uint8Array(Math.min(n, MAX_BYTES)); let o = 0;
  for (const c of chunks) { const part = c.subarray(0, buf.length - o); buf.set(part, o); o += part.length; if (o >= buf.length) break; }
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", nbsp: " " };
const dec = (s) => String(s || "").replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, k) =>
  k[0] === "#" ? String.fromCodePoint(k[1].toLowerCase() === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10)) : ENT[k.toLowerCase()] ?? m)
  .replace(/\s+/g, " ").trim();
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")); return m ? (m[2] ?? m[3] ?? m[4]) : ""; };

// "GitHub - owner/repo: long description" -> "owner/repo"; "Long title | Site" -> "Long title".
function cleanName(t, site) {
  t = String(t || "").trim(); site = String(site || "").trim();
  if (site && t.length > 60 && t.toLowerCase() !== site.toLowerCase()) {
    const q = site.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`^${q}\\s*[-–—|·:]\\s*`, "i"), "").replace(new RegExp(`\\s*[-–—|·]\\s*${q}$`, "i"), "").trim() || t;
  }
  if (t.length > 60) { const seg = t.split(/\s[-–—|·]\s|:\s/)[0].trim(); if (seg.length >= 2) t = seg; }
  return t || site;
}

function parse(html, base) {
  const head = html.slice(0, 300000), meta = {};
  for (const t of head.match(/<meta\b[^>]*>/gi) || []) {
    const k = (attr(t, "property") || attr(t, "name")).toLowerCase(); const v = attr(t, "content");
    if (k && v && !(k in meta)) meta[k] = dec(v);
  }
  const title = dec((head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  let icon = "";
  for (const t of head.match(/<link\b[^>]*>/gi) || []) {
    const rel = attr(t, "rel").toLowerCase();
    if (/(^|\s)(icon|apple-touch-icon)(\s|$)/.test(rel)) { icon = attr(t, "href"); if (rel.includes("apple")) break; }
  }
  const abs = (s) => { try { const u = new URL(dec(s), base); return /^https?:$/.test(u.protocol) ? u.href : ""; } catch { return ""; } };
  let canon = ""; const cl = head.match(/<link\b[^>]*rel=["']?canonical[^>]*>/i); if (cl) canon = abs(attr(cl[0], "href"));
  const name = cleanName(meta["og:title"] || meta["twitter:title"] || title, meta["og:site_name"]);
  const desc = meta["og:description"] || meta["twitter:description"] || meta["description"] || "";
  const img = abs(meta["og:image:secure_url"] || meta["og:image"] || meta["og:image:url"] || meta["twitter:image"] || meta["twitter:image:src"] || "");
  const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);
  return { name: cut(name, 120), pitchShort: cut(desc, 280), imageUrl: img, favicon: abs(icon || "/favicon.ico"), canonical: canon };
}

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const rl = await rateAll(env, [...ipRules("autofill-m", ip, 10, 60), ...ipRules("autofill-h", ip, 40, 3600)]);
  if (!rl.ok) return json({ ok: false, error: "Too many lookups. Fill the form in manually or try again shortly." }, 429, { "retry-after": String(rl.retryAfter || 60) });
  let body; try { body = await request.json(); } catch { return json({ ok: false, error: "Bad request." }, 400); }
  let u = await checkUrl(body && body.url);
  if (!u) return json({ ok: false, error: "Use a public http(s) link." }, 400);
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    let res;
    for (let hop = 0; ; hop++) {
      res = await fetch(u.href, { redirect: "manual", signal: ctl.signal, headers: { "user-agent": "DigitalUndergroundBot/1.0 (+https://digitalundergroundstore.com/community/submit/)", accept: "text/html,application/xhtml+xml" }, cf: { cacheTtl: 300 } });
      if (res.status < 300 || res.status >= 400) break;
      const loc = res.headers.get("location");
      if (!loc || hop >= MAX_REDIRECTS) return json({ ok: false, error: "Too many redirects." }, 422);
      u = await checkUrl(new URL(loc, u).href);
      if (!u) return json({ ok: false, error: "That link redirects somewhere we can't read." }, 422);
    }
    if (!res.ok) return json({ ok: false, error: res.status === 404 || res.status === 410 ? "That page wasn't found. Check the link." : res.status === 401 || res.status === 403 ? "That page is private or blocks previews." : res.status >= 500 ? "That site isn't responding right now." : "We couldn't read that page." }, 422);
    if (!/html|xml/i.test(res.headers.get("content-type") || "")) return json({ ok: false, error: "That link isn't a web page." }, 422);
    const meta = parse(await readCapped(res), u.href);
    if (!meta.name && !meta.pitchShort) return json({ ok: false, error: "No details found on that page." }, 422);
    const projectUrl = u.protocol === "https:" ? u.href : "";
    return json({ ok: true, ...meta, imageUrl: meta.imageUrl.startsWith("https:") ? meta.imageUrl : "", projectUrl });
  } catch (e) {
    return json({ ok: false, error: e && e.name === "AbortError" ? "That page took too long." : "Couldn't reach that page." }, 422);
  } finally { clearTimeout(timer); }
}
