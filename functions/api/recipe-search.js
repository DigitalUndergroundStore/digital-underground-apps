/**
 * Cloudflare Pages Function: search the Wikibooks Cookbook.
 * POST { "query": "shakshuka", "offset": 0 }
 * → { results: [{ title, url, source, sourceHost, minutes, image, license, kind }] }
 *
 * One user search, no stored recipes. Open-web hits are browser links in the app,
 * not scraped here.
 */

import {
  WIKI_API,
  USER_AGENT,
  cardsFromApi,
  clientIp,
  createRateLimiter,
  json,
  nextOffsetFrom,
  sanitizeQuery,
  searchParams,
} from "../_lib/cookbook.js";

const checkRate = createRateLimiter(20, 60_000);
const FETCH_TIMEOUT_MS = 8000;

async function wikiGet(params, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(WIKI_API + "?" + params.toString(), {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        "Api-User-Agent": USER_AGENT,
      },
    });
    if (!response.ok) {
      try { await response.body?.cancel(); } catch { /* ignore */ }
      return { error: true, status: response.status };
    }
    const data = await response.json();
    if (data && data.error) return { error: true, status: 422 };
    return { data };
  } catch {
    return { error: true, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

export async function handleRecipeSearch(request, fetchImpl = globalThis.fetch) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") {
    return json({ error: "Use POST with { \"query\": \"…\" }." }, 405);
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

  const query = sanitizeQuery(body && body.query);
  if (query.length < 2) return json({ error: "Type at least two letters." }, 400);
  const offset = Math.max(0, Math.min(200, parseInt(body && body.offset, 10) || 0));
  const params = searchParams(query, offset, true);
  const first = await wikiGet(params, fetchImpl);
  if (first.error) {
    return json({
      error: "Cookbook search is unavailable right now. Open a web search below, or paste a recipe link.",
      pasteTextInstead: true,
    }, 422);
  }

  let data = first.data;
  let results = cardsFromApi(data);
  let usedCategory = true;
  if (!results.length && offset === 0) {
    const broad = await wikiGet(searchParams(query, 0, false), fetchImpl);
    if (!broad.error) {
      data = broad.data;
      results = cardsFromApi(data);
      usedCategory = false;
    }
  }

  return json({
    query,
    results,
    offset,
    nextOffset: nextOffsetFrom(data, offset),
    source: "Wikibooks Cookbook",
    license: "CC BY-SA 4.0",
    category: usedCategory ? "Recipes" : "",
  });
}

export async function onRequest(context) {
  return handleRecipeSearch(context.request);
}
