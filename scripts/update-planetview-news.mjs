#!/usr/bin/env node
/**
 * Refresh planetview/news.json.
 *
 * Node built-ins only:
 *   node scripts/update-planetview-news.mjs
 *
 * One large GDELT DOC query, retried with at least 6s between calls.
 * If that yields nothing newer than 6h, fall back to keyless world-news RSS.
 * Headlines come only from those responses. A place name in the headline
 * selects sourcecountry so the app can drop a map pin. Items older than 48h
 * are dropped only when a fresher item was actually returned. If every source
 * fails, the existing file is left as-is. The process exits non-zero when the
 * snapshot on disk is still more than 6h old.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

export const GDELT_QUERY =
  "(climate OR earthquake OR flood OR election OR conflict OR economy OR health OR storm OR protest OR market OR disaster) sourcelang:english";

export const GDELT_DOC_URL =
  "https://api.gdeltproject.org/api/v2/doc/doc?query=" +
  encodeURIComponent(GDELT_QUERY) +
  "&mode=ArtList&maxrecords=75&format=json&sort=DateDesc&timespan=48h";

/** First try is immediate. Later tries wait, then back off, and never less than 6s. */
export const GDELT_BACKOFF_MS = [0, 6_000, 15_000, 30_000];
export const FETCH_TIMEOUT_MS = 20_000;
export const MIN_GAP_MS = 6_000;
export const FRESH_WINDOW_MS = 48 * 60 * 60 * 1000;
export const STALE_FAIL_MS = 6 * 60 * 60 * 1000;
export const MAX_ARTICLES = 40;

const DEFAULT_OUT = "planetview/news.json";
const USER_AGENT = "PlanetView-news/2 (+https://gsahavok.github.io/digital-underground-apps/planetview/)";

/** Longer names first so "united states" wins over a shorter token. */
const PLACES = [
  ["united arab emirates", "United Arab Emirates"],
  ["united kingdom", "United Kingdom"],
  ["united states", "United States"],
  ["south africa", "South Africa"],
  ["saudi arabia", "Saudi Arabia"],
  ["new zealand", "New Zealand"],
  ["south korea", "South Korea"],
  ["buenos aires", "Argentina"],
  ["rio de janeiro", "Brazil"],
  ["mexico city", "Mexico"],
  ["kuala lumpur", "Malaysia"],
  ["saint petersburg", "Russia"],
  ["st petersburg", "Russia"],
  ["hong kong", "China"],
  ["new delhi", "India"],
  ["cape town", "South Africa"],
  ["johannesburg", "South Africa"],
  ["los angeles", "United States"],
  ["san francisco", "United States"],
  ["washington", "United States"],
  ["kramatorsk", "Ukraine"],
  ["kharkiv", "Ukraine"],
  ["jerusalem", "Israel"],
  ["tel aviv", "Israel"],
  ["abu dhabi", "United Arab Emirates"],
  ["singapore", "Singapore"],
  ["amsterdam", "Netherlands"],
  ["barcelona", "Spain"],
  ["stockholm", "Sweden"],
  ["brussels", "Belgium"],
  ["canberra", "Australia"],
  ["melbourne", "Australia"],
  ["brisbane", "Australia"],
  ["vancouver", "Canada"],
  ["montreal", "Canada"],
  ["toronto", "Canada"],
  ["ottawa", "Canada"],
  ["auckland", "New Zealand"],
  ["wellington", "New Zealand"],
  ["islamabad", "Pakistan"],
  ["karachi", "Pakistan"],
  ["bangalore", "India"],
  ["bengaluru", "India"],
  ["shanghai", "China"],
  ["beijing", "China"],
  ["jakarta", "Indonesia"],
  ["bangkok", "Thailand"],
  ["manila", "Philippines"],
  ["nairobi", "Kenya"],
  ["lagos", "Nigeria"],
  ["abuja", "Nigeria"],
  ["cairo", "Egypt"],
  ["dubai", "United Arab Emirates"],
  ["doha", "Qatar"],
  ["riyadh", "Saudi Arabia"],
  ["ankara", "Turkey"],
  ["istanbul", "Turkey"],
  ["moscow", "Russia"],
  ["kyiv", "Ukraine"],
  ["odesa", "Ukraine"],
  ["odessa", "Ukraine"],
  ["warsaw", "Poland"],
  ["berlin", "Germany"],
  ["munich", "Germany"],
  ["paris", "France"],
  ["rome", "Italy"],
  ["milan", "Italy"],
  ["madrid", "Spain"],
  ["london", "United Kingdom"],
  ["dublin", "Ireland"],
  ["sydney", "Australia"],
  ["tokyo", "Japan"],
  ["osaka", "Japan"],
  ["seoul", "South Korea"],
  ["delhi", "India"],
  ["mumbai", "India"],
  ["dhaka", "Bangladesh"],
  ["bogota", "Colombia"],
  ["chicago", "United States"],
  ["houston", "United States"],
  ["boston", "United States"],
  ["seattle", "United States"],
  ["atlanta", "United States"],
  ["california", "United States"],
  ["florida", "United States"],
  ["texas", "United States"],
  ["scotland", "United Kingdom"],
  ["edinburgh", "United Kingdom"],
  ["manchester", "United Kingdom"],
  ["belfast", "United Kingdom"],
  ["geneva", "Switzerland"],
  ["zurich", "Switzerland"],
  ["oslo", "Norway"],
  ["haifa", "Israel"],
  ["sao paulo", "Brazil"],
  ["brasilia", "Brazil"],
  ["santiago", "Chile"],
  ["ukraine", "Ukraine"],
  ["russia", "Russia"],
  ["israel", "Israel"],
  ["qatar", "Qatar"],
  ["india", "India"],
  ["china", "China"],
  ["japan", "Japan"],
  ["france", "France"],
  ["germany", "Germany"],
  ["spain", "Spain"],
  ["italy", "Italy"],
  ["canada", "Canada"],
  ["australia", "Australia"],
  ["ireland", "Ireland"],
  ["poland", "Poland"],
  ["turkey", "Turkey"],
  ["brazil", "Brazil"],
  ["mexico", "Mexico"],
  ["egypt", "Egypt"],
  ["kenya", "Kenya"],
  ["nigeria", "Nigeria"],
  ["sweden", "Sweden"],
  ["norway", "Norway"],
  ["belgium", "Belgium"],
  ["netherlands", "Netherlands"],
  ["switzerland", "Switzerland"],
  ["indonesia", "Indonesia"],
  ["malaysia", "Malaysia"],
  ["philippines", "Philippines"],
  ["thailand", "Thailand"],
  ["pakistan", "Pakistan"],
  ["bangladesh", "Bangladesh"],
  ["argentina", "Argentina"],
  ["colombia", "Colombia"],
  ["chile", "Chile"],
  ["u s", "United States"],
  ["usa", "United States"],
  ["uk", "United Kingdom"],
  ["south korean", "South Korea"],
  ["ukrainian", "Ukraine"],
  ["russian", "Russia"],
  ["israeli", "Israel"],
  ["american", "United States"],
  ["british", "United Kingdom"],
  ["chinese", "China"],
  ["japanese", "Japan"],
  ["indian", "India"],
  ["french", "France"],
  ["german", "Germany"],
  ["spanish", "Spain"],
  ["italian", "Italy"],
  ["canadian", "Canada"],
  ["australian", "Australia"],
  ["mexican", "Mexico"],
  ["brazilian", "Brazil"],
  ["egyptian", "Egypt"],
  ["turkish", "Turkey"],
  ["polish", "Poland"],
  ["nigerian", "Nigeria"],
  ["kenyan", "Kenya"],
  ["pakistani", "Pakistan"],
];

const RSS_FEEDS = [
  { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", outlet: "United Kingdom" },
  { name: "Guardian World", url: "https://www.theguardian.com/world/rss", outlet: "United Kingdom" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", outlet: "Qatar" },
];

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

export function toSeenDate(ms) {
  const date = new Date(ms);
  const part = (value) => String(value).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${part(date.getUTCMonth() + 1)}${part(date.getUTCDate())}` +
    `T${part(date.getUTCHours())}${part(date.getUTCMinutes())}${part(date.getUTCSeconds())}Z`
  );
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function log(message) {
  console.log(`[planetview-news] ${message}`);
}

function errorText(err) {
  if (err instanceof Error && err.name === "TimeoutError") return "timeout";
  if (err instanceof Error && err.name === "AbortError") return "timeout";
  return err instanceof Error ? err.message : String(err);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Country name the PlanetView app already maps to a pin, or "". */
export function countryIn(text) {
  const hay = ` ${String(text ?? "")
    .toLowerCase()
    .replace(/&[#a-z0-9]+;/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")} `;
  for (const [needle, country] of PLACES) {
    if (hay.includes(` ${needle} `)) return country;
  }
  return "";
}

/** Validate and dedupe articles. Drops undated rows and dates in the future. */
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
    const fromRow = typeof row.sourcecountry === "string" ? row.sourcecountry.trim() : "";
    const sourcecountry = countryIn(fromRow) || fromRow || countryIn(`${title}`);
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

export function newestAgeMs(articles, now = Date.now()) {
  let newest = null;
  for (const article of articles) {
    const ms = parseSeenDate(article.seendate);
    if (ms == null) continue;
    if (newest == null || ms > newest) newest = ms;
  }
  return newest == null ? null : now - newest;
}

/** Keep rows inside the window only when at least one row is that fresh. */
export function keepFresh(articles, now = Date.now(), windowMs = FRESH_WINDOW_MS) {
  const fresh = articles.filter((article) => {
    const ms = parseSeenDate(article.seendate);
    return ms != null && now - ms <= windowMs && ms <= now + 5 * 60_000;
  });
  if (!fresh.length) return [];
  return fresh.slice(0, MAX_ARTICLES);
}

function describeBody(text) {
  const trimmed = text.trim();
  if (/limit requests|too many requests|rate limit/i.test(trimmed)) return "rate limited";
  if (/^<\?xml\b/i.test(trimmed) || /^<(rss|feed)\b/i.test(trimmed)) return `xml bytes=${trimmed.length}`;
  if (trimmed.startsWith("<")) return "html";
  return `bytes=${trimmed.length}`;
}

async function requestText(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: {
      accept: "application/json, application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
      "user-agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const text = await response.text();
  return { status: response.status, text, retryAfter: response.headers.get("retry-after") };
}

/**
 * One GDELT query, retried with backoff. Returns articles, possibly empty.
 * Logs every attempt, status, and error.
 */
export async function fetchGdeltArticles(fetchImpl = fetch, sleepImpl = sleep, now = Date.now()) {
  let lastError = "GDELT request failed";
  for (let attempt = 0; attempt < GDELT_BACKOFF_MS.length; attempt++) {
    const wait = Math.min(Math.max(GDELT_BACKOFF_MS[attempt] ?? MIN_GAP_MS, attempt === 0 ? 0 : MIN_GAP_MS), 60_000);
    if (wait > 0) {
      log(`waiting ${wait}ms before GDELT attempt ${attempt + 1}`);
      await sleepImpl(wait);
    }
    const label = `GDELT attempt ${attempt + 1}/${GDELT_BACKOFF_MS.length}`;
    log(`${label} GET ${GDELT_DOC_URL}`);
    const started = Date.now();
    try {
      const { status, text } = await requestText(fetchImpl, GDELT_DOC_URL);
      log(`${label} status=${status} elapsed=${Date.now() - started}ms body=${describeBody(text)}`);
      if (status !== 200) {
        lastError = `GDELT replied ${status} (${describeBody(text)})`;
        continue;
      }
      let body;
      try {
        body = JSON.parse(text);
      } catch (err) {
        lastError = `GDELT returned non-JSON (${describeBody(text)})`;
        log(`${label} error=${lastError}`);
        continue;
      }
      const articles = normalizeArticles(body, now);
      log(`${label} articles=${articles.length}`);
      if (!articles.length) {
        lastError = "GDELT returned no usable articles";
        continue;
      }
      return articles;
    } catch (err) {
      lastError = errorText(err);
      log(`${label} status=error elapsed=${Date.now() - started}ms error=${lastError}`);
    }
  }
  log(`GDELT failed: ${lastError}`);
  return [];
}

function decodeEntities(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : " ";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const n = Number.parseInt(code, 16);
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : " ";
    })
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagText(block, name) {
  const match = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

/** Parse an RSS 2.0 document into articles. A place name wins over the outlet country. */
export function articlesFromRss(xml, now = Date.now(), outletCountry = "") {
  const items = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];
  const articles = [];
  for (const item of items) {
    const title = tagText(item, "title");
    const link = tagText(item, "link") || tagText(item, "guid");
    const url = link.startsWith("http") ? link : "";
    const pubDate = tagText(item, "pubDate") || tagText(item, "dc:date");
    const publishedAt = Date.parse(pubDate);
    if (!url || !title || !Number.isFinite(publishedAt)) continue;
    const description = tagText(item, "description");
    const sourcecountry = countryIn(`${title} ${description}`) || outletCountry;
    articles.push({
      url,
      title,
      seendate: toSeenDate(publishedAt),
      domain: hostOf(url),
      sourcecountry,
    });
  }
  return normalizeArticles({ articles }, now);
}

export async function fetchRssArticles(fetchImpl = fetch, sleepImpl = sleep, now = Date.now()) {
  const merged = [];
  for (let index = 0; index < RSS_FEEDS.length; index++) {
    if (index > 0) {
      log(`waiting ${MIN_GAP_MS}ms before ${RSS_FEEDS[index].name}`);
      await sleepImpl(MIN_GAP_MS);
    }
    const feed = RSS_FEEDS[index];
    const label = `${feed.name} attempt 1/1`;
    log(`${label} GET ${feed.url}`);
    const started = Date.now();
    try {
      const { status, text } = await requestText(fetchImpl, feed.url);
      log(`${label} status=${status} elapsed=${Date.now() - started}ms body=${describeBody(text)}`);
      if (status !== 200) {
        log(`${label} error=replied ${status}`);
        continue;
      }
      const articles = articlesFromRss(text, now, feed.outlet);
      log(`${label} articles=${articles.length}`);
      merged.push(...articles);
    } catch (err) {
      log(`${label} status=error elapsed=${Date.now() - started}ms error=${errorText(err)}`);
    }
  }
  return normalizeArticles({ articles: merged }, now);
}

export async function fetchHeadlines(fetchImpl = fetch, sleepImpl = sleep, now = Date.now()) {
  const gdelt = await fetchGdeltArticles(fetchImpl, sleepImpl, now);
  const gdeltAge = newestAgeMs(gdelt, now);
  if (gdelt.length && gdeltAge != null && gdeltAge <= STALE_FAIL_MS) {
    log(`using GDELT (${gdelt.length} articles, newest ${(gdeltAge / 3_600_000).toFixed(1)}h)`);
    return keepFresh(gdelt, now);
  }
  if (!gdelt.length) {
    log("GDELT returned nothing usable; trying world-news RSS");
  } else {
    log(
      `GDELT newest headline is ${gdeltAge == null ? "undated" : `${(gdeltAge / 3_600_000).toFixed(1)}h old`}; trying world-news RSS`,
    );
  }
  const rss = await fetchRssArticles(fetchImpl, sleepImpl, now);
  const combined = normalizeArticles({ articles: [...rss, ...gdelt] }, now);
  const fresh = keepFresh(combined, now);
  log(`combined articles=${combined.length} within48h=${fresh.length}`);
  return fresh;
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

export function readSnapshotAgeMs(outPath, now = Date.now()) {
  if (!existsSync(outPath)) return null;
  try {
    const data = JSON.parse(readFileSync(outPath, "utf8"));
    const updated = Date.parse(data.updated);
    if (!Number.isFinite(updated)) return null;
    return now - updated;
  } catch {
    return null;
  }
}

export function reportSnapshot(outPath, now = Date.now()) {
  if (!existsSync(outPath)) {
    log("snapshot missing");
    return { items: 0, newestAgeMs: null };
  }
  try {
    const data = JSON.parse(readFileSync(outPath, "utf8"));
    const articles = Array.isArray(data.articles) ? data.articles : [];
    const age = newestAgeMs(articles, now);
    const ageLabel = age == null ? "none" : `${(age / 3_600_000).toFixed(1)}h`;
    log(`snapshot items=${articles.length} newestAge=${ageLabel} updated=${data.updated ?? ""}`);
    return { items: articles.length, newestAgeMs: age };
  } catch (err) {
    log(`snapshot unreadable: ${errorText(err)}`);
    return { items: 0, newestAgeMs: null };
  }
}

export async function updateNewsFile(outPath = DEFAULT_OUT, deps = {}) {
  const now = deps.now ?? Date.now();
  const fetchImpl = deps.fetchImpl ?? fetch;
  const sleepImpl = deps.sleepImpl ?? sleep;
  const articles = await fetchHeadlines(fetchImpl, sleepImpl, now);
  if (!articles.length) {
    log("No headlines newer than 48h. Left the existing news.json in place.");
    return false;
  }
  return writeSnapshot(outPath, articles, now);
}

function failIfStale(outPath, now) {
  const age = readSnapshotAgeMs(outPath, now);
  if (age == null || age > STALE_FAIL_MS) {
    const label = age == null ? "missing or unreadable" : `${(age / 3_600_000).toFixed(1)}h old`;
    console.error(`[planetview-news] news.json is ${label}, past the 6h limit.`);
    process.exitCode = 1;
    return;
  }
  log(`existing snapshot is ${(age / 3_600_000).toFixed(1)}h old, still within 6h`);
}

async function main() {
  const outPath = process.argv[2] || DEFAULT_OUT;
  const now = Date.now();
  try {
    const wrote = await updateNewsFile(outPath);
    log(wrote ? `Updated ${outPath}` : `Headlines unchanged in ${outPath}`);
    reportSnapshot(outPath, now);
    if (!wrote) failIfStale(outPath, now);
  } catch (err) {
    console.error(`[planetview-news] PlanetView headlines were not updated: ${errorText(err)}`);
    console.error("[planetview-news] The last good news.json was left in place.");
    reportSnapshot(outPath, now);
    failIfStale(outPath, now);
    if (!process.exitCode) process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
