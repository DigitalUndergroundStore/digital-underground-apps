/**
 * Cloudflare Pages Function: read ONE Wikibooks Cookbook page the user tapped.
 * POST { "url": "https://en.wikibooks.org/wiki/Cookbook:…" }
 * → { recipe } in schema.org Recipe shape, or { disambiguation, results }.
 * The page is not stored. Other hosts are rejected.
 */

import {
  LICENSE,
  SOURCE_NAME,
  USER_AGENT,
  WIKI_API,
  clientIp,
  cookbookTitleFromUrl,
  createRateLimiter,
  json,
  pageParams,
  parseCookbookPage,
} from "../_lib/cookbook.js";

const checkRate = createRateLimiter(30, 60_000);
const FETCH_TIMEOUT_MS = 8000;

const PASTE =
  "That Cookbook page didn't include a readable recipe. Open it in your browser, copy the text, and use Paste recipe text.";

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
      return { error: true };
    }
    const data = await response.json();
    if (!data || data.error || !data.query || !data.query.pages) return { error: true };
    return { data };
  } catch {
    return { error: true };
  } finally {
    clearTimeout(timer);
  }
}

export async function handleRecipeWikibooks(request, fetchImpl = globalThis.fetch) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") {
    return json({ error: "Use POST with { \"url\": \"…\" }." }, 405);
  }
  if (!checkRate(clientIp(request))) {
    return json({ error: "Too many requests. Try again in a minute." }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const title = cookbookTitleFromUrl(body && body.url);
  if (!title) return json({ error: "Only a Wikibooks Cookbook link can be opened here." }, 400);

  const loaded = await wikiGet(pageParams(title), fetchImpl);
  if (loaded.error) {
    return json({ error: PASTE, pasteTextInstead: true }, 422);
  }
  const page = loaded.data.query.pages[0];
  if (!page || page.missing) {
    return json({ error: "That Cookbook page was not found.", pasteTextInstead: true }, 422);
  }
  const parsed = parseCookbookPage(page);
  if (parsed.kind === "list") {
    return json({
      disambiguation: true,
      results: parsed.results || [],
      source: SOURCE_NAME,
      license: LICENSE,
    });
  }
  if (parsed.kind !== "recipe" || !parsed.recipe) {
    return json({ error: PASTE, pasteTextInstead: true }, 422);
  }
  return json({
    recipe: parsed.recipe,
    source: SOURCE_NAME,
    sourceUrl: parsed.url,
    license: LICENSE,
  });
}

export async function onRequest(context) {
  return handleRecipeWikibooks(context.request);
}
