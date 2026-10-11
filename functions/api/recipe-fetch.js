/**
 * Cloudflare Pages Function: fetch a public recipe URL and return schema.org Recipe JSON-LD.
 * POST { "url": "https://…" } → { "recipe": { … } }
 */

const MAX_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

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
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
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

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(checked.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "PantryWeekRecipeFetch/1.0 (+https://digitalundergroundstore.com/pantry-week/)",
      },
    });
  } catch (err) {
    clearTimeout(timer);
    const msg = err && err.name === "AbortError" ? "Request timed out." : "Could not fetch that URL.";
    return json({ error: msg }, 502);
  }
  clearTimeout(timer);

  if (!response.ok) {
    return json({ error: `Page returned HTTP ${response.status}.` }, 502);
  }

  const reader = response.body && response.body.getReader();
  if (!reader) {
    return json({ error: "Empty response." }, 502);
  }

  let received = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) {
        await reader.cancel();
        return json({ error: "Page is too large." }, 413);
      }
      chunks.push(value);
    }
  } catch {
    return json({ error: "Could not read the page." }, 502);
  }

  const html = new TextDecoder("utf-8", { fatal: false }).decode(
    chunks.length === 1 ? chunks[0] : concatUint8(chunks)
  );

  const recipes = extractJsonLd(html);
  if (!recipes.length) {
    return json({ error: "No schema.org Recipe JSON-LD found on that page." }, 404);
  }

  return json(
    { recipe: recipes[0], recipes },
    200,
    { "Access-Control-Allow-Origin": "*" }
  );
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
