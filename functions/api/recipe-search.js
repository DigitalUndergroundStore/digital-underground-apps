/**
 * Cloudflare Pages Function: search the Wikimedia Cookbook for recipe *pages*.
 * Returns titles, source, thumbnails, and URLs only. Recipe text is not fetched or stored.
 * Open-web engines that return arbitrary recipe URLs are not used here: the keyless ones
 * we checked are non-commercial, rate-exhausted, or forbid proxying results. See the
 * source report. The app also offers browser deep links for other sites.
 *
 * POST { "query": "pork chops onion mustard" }
 * → { "results": [{ "title", "url", "source", "license", "image", "minutes" }] }
 */

import { sanitizeDishQuery, shapeCookbookPages, wikibooksSearchUrl } from "../_lib/cookbook-search.js";

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const FETCH_TIMEOUT_MS = 5000;
const USER_AGENT = "PantryWeekRecipeSearch/1.0 (+https://digitalundergroundstore.com/pantry-week/)";

/** @type {Map<string, { count: number, reset: number }>} */
const rateByIp = new Map();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
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
  if (bucket.count > RATE_LIMIT) return false;
  if (rateByIp.size > 10_000) {
    for (const [key, val] of rateByIp) {
      if (now > val.reset) rateByIp.delete(key);
    }
  }
  return true;
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (request.method !== "POST") {
    return json({ error: "Use POST with a JSON body: { \"query\": \"…\" }." }, 405);
  }
  if (!checkRate(clientIp(request))) {
    return json({ error: "Too many searches. Try again in a minute." }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const query = sanitizeDishQuery(body && body.query);
  if (!query) return json({ error: "Type a dish or ingredient to search." }, 400);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(wikibooksSearchUrl(query), {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        "Api-User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      return json({ error: "Recipe search is unavailable right now.", results: [] }, 422);
    }
    const data = await response.json();
    const pages = data && data.query && data.query.pages;
    return json({
      query,
      results: shapeCookbookPages(Array.isArray(pages) ? pages : []),
      notice: "Titles and links only. Pantry Week does not store other sites' recipes.",
    });
  } catch (err) {
    const timeout = !!(err && err.name === "AbortError");
    return json({
      error: timeout ? "Recipe search timed out." : "Recipe search is unavailable right now.",
      results: [],
    }, 422);
  } finally {
    clearTimeout(timer);
  }
}
