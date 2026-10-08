#!/usr/bin/env node
/**
 * Refresh planetview/news.json from GDELT DOC 2.0.
 *
 * Node built-ins only. Designed for digital-underground-apps:
 *   node scripts/update-planetview-news.mjs
 *
 * Writes the destination only when the article list changed.
 * On failure it exits non-zero and leaves the last good file in place.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

export const GDELT_QUERY =
  "(climate OR earthquake OR flood OR election OR conflict OR economy OR health OR storm OR protest OR market OR disaster) sourcelang:english";

export const GDELT_DOC_URL =
  "https://api.gdeltproject.org/api/v2/doc/doc?query=" +
  encodeURIComponent(GDELT_QUERY) +
  "&mode=ArtList&maxrecords=40&format=json&sort=DateDesc&timespan=7d";

/** First try is immediate. Later tries wait at least 6s, then back off. */
export const RETRY_WAITS_MS = [0, 6_000, 12_000, 24_000, 48_000];
/** One GDELT request. Five of these plus the backoff still fit the workflow job. */
export const GDELT_FETCH_TIMEOUT_MS = 20_000;

const DEFAULT_OUT = "planetview/news.json";

export function parseSeenDate(raw) {
  if (typeof raw !== "string") return null;
  const match = raw.trim().match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  const ms = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  );
  return Number.isFinite(ms) ? ms : null;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Validate and dedupe a GDELT ArtList body, or a previously written snapshot. */
export function normalizeArticles(body, now = Date.now()) {
  const rows = body && typeof body === "object" && Array.isArray(body.articles) ? body.articles : [];
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const url = typeof row.url === "string" ? row.url.trim() : "";
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!url.startsWith("http") || !title) continue;
    if (seen.has(url)) continue;
    const publishedAt = parseSeenDate(row.seendate);
    if (publishedAt == null || publishedAt > now + 5 * 60_000) continue;
    const domain = (typeof row.domain === "string" && row.domain.trim()) || hostOf(url);
    if (!domain) continue;
    const sourcecountry = typeof row.sourcecountry === "string" ? row.sourcecountry.trim() : "";
    seen.add(url);
    out.push({
      url,
      title,
      seendate: String(row.seendate).trim(),
      domain,
      sourcecountry,
    });
  }
  out.sort((a, b) => parseSeenDate(b.seendate) - parseSeenDate(a.seendate));
  return out;
}

export function articleSignature(articles) {
  return JSON.stringify(
    articles.map((article) => ({
      url: article.url,
      title: article.title,
      seendate: article.seendate,
      domain: article.domain,
      sourcecountry: article.sourcecountry ?? "",
    })),
  );
}

export function snapshotChanged(previousText, articles) {
  if (!previousText) return true;
  try {
    const prev = JSON.parse(previousText);
    const prevArticles = normalizeArticles(prev, Date.now() + 86_400_000);
    return articleSignature(prevArticles) !== articleSignature(articles);
  } catch {
    return true;
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Fetch GDELT. `fetchImpl` and `sleepImpl` are injectable so tests do not
 * hit the network or wait out the backoff.
 */
export async function fetchGdeltArticles(fetchImpl = fetch, sleepImpl = sleep, now = Date.now()) {
  let lastError = new Error("GDELT request failed");
  for (let attempt = 0; attempt < RETRY_WAITS_MS.length; attempt++) {
    const wait = RETRY_WAITS_MS[attempt] ?? 60_000;
    if (wait > 0) await sleepImpl(Math.min(wait, 60_000));
    try {
      const response = await fetchImpl(GDELT_DOC_URL, {
        headers: {
          accept: "application/json",
          "user-agent": "PlanetView-news/1 (+https://gsahavok.github.io/digital-underground-apps/planetview/)",
        },
        signal: AbortSignal.timeout(GDELT_FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        lastError = new Error(`GDELT replied ${response.status}`);
        continue;
      }
      const body = await response.json();
      const articles = normalizeArticles(body, now);
      if (!articles.length) {
        lastError = new Error("GDELT returned no usable articles");
        continue;
      }
      return articles;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError;
}

/** Write `outPath` when the article list changed. Returns true if it wrote. */
export function writeSnapshot(outPath, articles, now = Date.now()) {
  const previous = existsSync(outPath) ? readFileSync(outPath, "utf8") : "";
  if (!snapshotChanged(previous, articles)) return false;
  const next = {
    updated: new Date(now).toISOString(),
    articles,
  };
  mkdirSync(dirname(outPath), { recursive: true });
  const tmp = `${outPath}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`);
  try {
    renameSync(tmp, outPath);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      /* the original file is still the last good copy */
    }
    throw err;
  }
  return true;
}

export async function updateNewsFile(outPath = DEFAULT_OUT, deps = {}) {
  const articles = await fetchGdeltArticles(deps.fetchImpl, deps.sleepImpl, deps.now);
  return writeSnapshot(outPath, articles, deps.now ?? Date.now());
}

async function main() {
  const outPath = process.argv[2] || DEFAULT_OUT;
  try {
    const wrote = await updateNewsFile(outPath);
    console.log(wrote ? `Updated ${outPath}` : `Headlines unchanged in ${outPath}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`PlanetView headlines were not updated: ${message}`);
    console.error("The last good news.json was left in place.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
