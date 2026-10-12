/**
 * Cloudflare Pages Function: fetch a public recipe URL and return schema.org Recipe JSON-LD.
 * POST { "url": "https://…" } → { "recipe": { … } }
 * Failures use 4xx (422), not 502: the custom domain replaces 5xx bodies with a bare "error code: 502" page the app cannot parse.
 * Wikibooks Cookbook pages have no JSON-LD. For a single Cookbook: URL we read that page
 * through the Wikimedia API and return one Recipe object. Nothing is stored.
 */

import { cookbookTitleFromUrl, wikiToSchema, wikitextFromApiPage } from "../_lib/wiki-recipe.js";

const MAX_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

/** First attempt: the plain, honest request (works for BBC Good Food and most sites). */
const PLAIN_HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "User-Agent": "PantryWeekRecipeFetch/1.0 (+https://digitalundergroundstore.com/pantry-week/)",
};

/** Retry only: browser-like headers, for sites that refuse the plain request. */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

/** HTTP statuses that suggest bot-blocking; these (or a page with no Recipe JSON-LD) trigger one browser-header retry. */
const RETRY_STATUSES = new Set([401, 403, 404, 406, 451]);

const BLOCKED_HINT =
  "That site blocked automatic fetching. Open the recipe in your browser, copy the text, and use Paste recipe text in Pantry Week instead.";

/** @type {Map<string, { count: number, reset: number }>} */
const rateByIp = new Map();

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function checkRate(ip) {
  const now = Date.now();
  let bucket = rateByIp.get(ip);
  if (!bucket || now > bucket.reset) {
    bucket = { count: 0, reset: now + RATE_WINDOW_MS };
    rateByIp.set(ip, bucket);
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT) {
    return false;
  }
  if (rateByIp.size > 10_000) {
    for (const [key, val] of rateByIp) {
      if (now > val.reset) rateByIp.delete(key);
    }
  }
  return true;
}

function isPrivateHost(hostname) {
  const h = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || h === "localhost") return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h === "0.0.0.0") return true;
  // IPv4
  const m4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m4) {
    const a = +m4[1];
    const b = +m4[2];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  // IPv6 loopback / link-local / unique local
  if (h === "::" || h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  // IPv4-mapped / IPv4-compatible IPv6 (e.g. ::ffff:127.0.0.1, ::ffff:7f00:1): reject outright
  if (h.startsWith("::ffff:") || /^::\d/.test(h) || h.startsWith("64:ff9b:")) return true;
  return false;
}

function validateTargetUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { error: "Invalid URL." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "Only http and https URLs are allowed." };
  }
  if (parsed.username || parsed.password) {
    return { error: "URLs with credentials are not allowed." };
  }
  if (isPrivateHost(parsed.hostname)) {
    return { error: "That URL is not allowed." };
  }
  return { url: parsed.toString() };
}

function extractJsonLd(html) {
  const scripts = [];
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) {
    const body = match[1].trim();
    if (body) scripts.push(body);
  }
  const recipes = [];
  for (const text of scripts) {
    try {
      const data = JSON.parse(text);
      walkRecipeNodes(data, recipes);
    } catch {
      /* skip malformed blocks */
    }
  }
  return recipes;
}

function isRecipeType(type) {
  if (!type) return false;
  const list = Array.isArray(type) ? type : [type];
  return list.some((t) => String(t).toLowerCase().includes("recipe"));
}

function walkRecipeNodes(node, out) {
  if (node == null) return;
  if (Array.isArray(node)) {
    node.forEach((n) => walkRecipeNodes(n, out));
    return;
  }
  if (typeof node !== "object") return;
  if (node["@graph"]) walkRecipeNodes(node["@graph"], out);
  if (isRecipeType(node["@type"]) || node.recipeIngredient || node.recipeInstructions) {
    out.push(node);
  }
  for (const key of Object.keys(node)) {
    if (key === "@context" || key === "@type") continue;
    walkRecipeNodes(node[key], out);
  }
}

/**
 * One fetch attempt with the given headers. Redirects are followed manually so every hop
 * is re-checked against the private-host rules.
 * Returns { recipes, status } on a readable page, or { fatal: Response } / { status, failed: true }.
 */
async function attemptFetch(startUrl, headers, browserLike) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let target = startUrl;
    let response;
    for (let hop = 0; ; hop++) {
      const h = browserLike ? { ...headers, Referer: `${new URL(target).origin}/` } : headers;
      response = await fetch(target, { method: "GET", redirect: "manual", signal: controller.signal, headers: h });
      if (response.status < 300 || response.status > 399 || !response.headers.get("Location")) break;
      if (hop >= 5) return { fatal: json({ error: "Too many redirects." }, 422) };
      const next = validateTargetUrl(new URL(response.headers.get("Location"), target).toString());
      if (next.error) return { fatal: json({ error: "That URL redirects somewhere that is not allowed." }, 400) };
      target = next.url;
    }

    if (!response.ok) {
      try { await response.body?.cancel(); } catch { /* ignore */ }
      return { status: response.status, failed: true };
    }

    const reader = response.body && response.body.getReader();
    if (!reader) return { status: response.status, failed: true, empty: true };

    let received = 0;
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) {
        await reader.cancel();
        return { fatal: json({ error: "Page is too large." }, 413) };
      }
      chunks.push(value);
    }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      chunks.length === 1 ? chunks[0] : concatUint8(chunks)
    );
    return { status: response.status, recipes: extractJsonLd(html) };
  } catch (err) {
    return { status: 0, failed: true, timeout: !!(err && err.name === "AbortError") };
  } finally {
    clearTimeout(timer);
  }
}

function blockedResponse(status) {
  const body = { error: status ? `${BLOCKED_HINT} (HTTP ${status}.)` : BLOCKED_HINT, pasteTextInstead: true };
  if (status) body.httpStatus = status;
  return json(body, 422);
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") {
    // Same-origin only (the app calls /api/recipe-fetch from digitalundergroundstore.com); no CORS grants.
    return new Response(null, { status: 204 });
  }
  if (request.method !== "POST") {
    return json({ error: "Use POST with a JSON body: { \"url\": \"…\" }." }, 405);
  }

  const ip = clientIp(request);
  if (!checkRate(ip)) {
    return json({ error: "Too many requests. Try again in a minute." }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const checked = validateTargetUrl(body && body.url);
  if (checked.error) return json({ error: checked.error }, 400);

  const cookbookTitle = cookbookTitleFromUrl(checked.url);
  if (cookbookTitle) {
    const wiki = await fetchCookbookRecipe(cookbookTitle);
    if (wiki) return json({ recipe: wiki, recipes: [wiki] }, 200);
    return json({ error: `No recipe data found on that page. ${BLOCKED_HINT}`, pasteTextInstead: true }, 404);
  }

  // 1) Plain request, exactly as before.
  const first = await attemptFetch(checked.url, PLAIN_HEADERS, false);
  if (first.fatal) return first.fatal;
  if (first.recipes && first.recipes.length) {
    return json({ recipe: first.recipes[0], recipes: first.recipes }, 200);
  }

  // 2) Retry once with browser-like headers only for bot-block statuses or a page without Recipe JSON-LD.
  const retryable = (first.failed && RETRY_STATUSES.has(first.status)) || (!first.failed && first.recipes);
  if (!retryable) {
    if (first.timeout) return json({ error: `Request timed out. ${BLOCKED_HINT}`, pasteTextInstead: true }, 422);
    return blockedResponse(first.status);
  }
  const second = await attemptFetch(checked.url, BROWSER_HEADERS, true);
  if (second.fatal) return second.fatal;
  if (second.recipes && second.recipes.length) {
    return json({ recipe: second.recipes[0], recipes: second.recipes }, 200);
  }
  if (!second.failed && second.recipes) {
    return json({ error: `No recipe data found on that page. ${BLOCKED_HINT}`, pasteTextInstead: true }, 404);
  }
  return blockedResponse(second.status || first.status);
}

async function fetchCookbookRecipe(title) {
  const api = new URL("https://en.wikibooks.org/w/api.php");
  api.searchParams.set("action", "query");
  api.searchParams.set("titles", title);
  api.searchParams.set("prop", "revisions|pageimages");
  api.searchParams.set("rvprop", "content");
  api.searchParams.set("rvslots", "main");
  api.searchParams.set("piprop", "thumbnail");
  api.searchParams.set("pithumbsize", "800");
  api.searchParams.set("format", "json");
  api.searchParams.set("formatversion", "2");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(api.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": PLAIN_HEADERS["User-Agent"],
        "Api-User-Agent": PLAIN_HEADERS["User-Agent"],
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    const page = data && data.query && data.query.pages && data.query.pages[0];
    const wikitext = wikitextFromApiPage(page);
    const image = page && page.thumbnail && page.thumbnail.source;
    return wikiToSchema(title, wikitext, image);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function concatUint8(chunks) {
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}
