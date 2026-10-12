/**
 * Wikibooks Cookbook helpers for Pantry Week.
 * Search cards and one-page imports only. Nothing is stored.
 * Upstream is always https://en.wikibooks.org/w/api.php (official Action API).
 */

export const WIKI_API = "https://en.wikibooks.org/w/api.php";
export const USER_AGENT =
  "PantryWeekRecipeSearch/1.0 (+https://digitalundergroundstore.com/pantry-week/)";
export const SOURCE_NAME = "Wikibooks Cookbook";
export const SOURCE_HOST = "en.wikibooks.org";
export const LICENSE = "CC BY-SA 4.0";

const SKIP_TITLE =
  /^(cuisine of|cuisines|how to|table of contents|equipment|techniques|ingredients|recipes)\b/i;

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function createRateLimiter(limit, windowMs) {
  /** @type {Map<string, { count: number, reset: number }>} */
  const buckets = new Map();
  return function checkRate(ip) {
    const now = Date.now();
    let bucket = buckets.get(ip);
    if (!bucket || now > bucket.reset) {
      bucket = { count: 0, reset: now + windowMs };
      buckets.set(ip, bucket);
    }
    bucket.count += 1;
    if (buckets.size > 10_000) {
      for (const [key, val] of buckets) {
        if (now > val.reset) buckets.delete(key);
      }
    }
    return bucket.count <= limit;
  };
}

export function sanitizeQuery(raw) {
  let q = String(raw || "")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\b(incategory|deepcategory|prefix|intitle|insource|hastemplate|linksto):[^\s]*/gi, " ")
    .replace(/[{}<>|[\]\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (q.length > 80) q = q.slice(0, 80).trim();
  return q;
}

export function displayTitle(title) {
  return String(title || "")
    .replace(/^Cookbook:/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cookbookUrl(title) {
  const slug = String(title || "").trim().replace(/ /g, "_");
  if (!slug) return "";
  const named = slug.startsWith("Cookbook:") ? slug : "Cookbook:" + slug;
  return (
    "https://en.wikibooks.org/wiki/" +
    encodeURIComponent(named).replace(/%3A/gi, ":").replace(/%2F/gi, "/")
  );
}

export function cookbookTitleFromUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || ""));
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.hostname !== "en.wikibooks.org") return null;
  let path = url.pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }
  const match = path.match(/^\/wiki\/(Cookbook:.+)$/i);
  if (!match) return null;
  const title = match[1].replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (!title || title.length > 180) return null;
  if (/[|{}<>[\]]/.test(title)) return null;
  return title;
}

export function safeThumb(url) {
  if (!url) return "";
  let value = String(url).trim();
  if (value.startsWith("//")) value = "https:" + value;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return "";
  }
  if (parsed.protocol !== "https:") return "";
  const host = parsed.hostname.toLowerCase();
  if (!host.endsWith("wikimedia.org") && !host.endsWith("wikipedia.org") && host !== "en.wikibooks.org") {
    return "";
  }
  return parsed.toString();
}

function httpsCanonical(page) {
  let url = (page && (page.canonicalurl || page.fullurl)) || "";
  if (url.startsWith("http://")) url = "https://" + url.slice("http://".length);
  if (/^https:\/\/en\.wikibooks\.org\/wiki\/Cookbook:/i.test(url)) return url;
  return cookbookUrl(page && page.title);
}

export function revisionText(page) {
  const rev = page && page.revisions && page.revisions[0];
  if (!rev) return "";
  if (typeof rev.content === "string") return rev.content;
  if (rev.slots && rev.slots.main) {
    const main = rev.slots.main;
    if (typeof main === "string") return main;
    if (typeof main.content === "string") return main.content;
    if (typeof main["*"] === "string") return main["*"];
  }
  if (typeof rev["*"] === "string") return rev["*"];
  return "";
}

export function classifyPage(title, wikitext) {
  const name = displayTitle(title);
  if (SKIP_TITLE.test(name)) return "skip";
  const text = String(wikitext || "");
  if (/^\s*#redirect\b/i.test(text)) return "skip";
  const ingredient = /\{\{\s*ingredient(\s+summary)?\s*[|}]/i.test(text);
  const recipe = /\{\{\s*recipe/i.test(text);
  if (ingredient && !recipe) return "skip";
  if (/\{\{\s*cookdp\s*[|}]/i.test(text)) return "list";
  return "recipe";
}

function durationToMinutes(raw, sumAll) {
  const text = String(raw || "").toLowerCase();
  let min = 0;
  let found = false;
  const hourRe = /(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr)\b/g;
  const minRe = /(\d+(?:\.\d+)?)\s*(?:minutes|minute|mins|min)\b/g;
  if (sumAll) {
    for (const match of text.matchAll(hourRe)) {
      min += parseFloat(match[1]) * 60;
      found = true;
    }
    for (const match of text.matchAll(minRe)) {
      min += parseFloat(match[1]);
      found = true;
    }
  } else {
    const hours = hourRe.exec(text);
    const mins = minRe.exec(text);
    if (hours) {
      min += parseFloat(hours[1]) * 60;
      found = true;
    }
    if (mins) {
      min += parseFloat(mins[1]);
      found = true;
    }
  }
  if (!found) return null;
  const rounded = Math.round(min);
  if (rounded < 1 || rounded > 24 * 60) return null;
  return rounded;
}

export function wikiFields(wikitext, names) {
  const alt = names.map((name) => name.replace(/\s+/g, "\\s+")).join("|");
  const re = new RegExp("^\\s*\\|\\s*(?:" + alt + ")\\s*=\\s*(.*)$", "gim");
  const values = [];
  let match;
  while ((match = re.exec(String(wikitext || "")))) {
    if (match[1] && match[1].trim()) values.push(match[1].trim());
  }
  return values;
}

export function minutesFromWikitext(wikitext) {
  const text = String(wikitext || "").replace(/<br\s*\/?>/gi, "\n");
  const total = text.match(/total\s*:?\s*([^\n]+)/i);
  if (total) {
    const mins = durationToMinutes(total[1], false);
    if (mins) return mins;
  }
  const timed = wikiFields(text, ["time", "total time"]);
  for (const value of timed) {
    const mins = durationToMinutes(value, true);
    if (mins) return mins;
  }
  const parts = wikiFields(text, ["prep time", "cook time", "cooking time"]);
  if (parts.length) {
    const mins = durationToMinutes(parts.join("\n"), true);
    if (mins) return mins;
  }
  return durationToMinutes(text, false);
}

export function servingsFromWikitext(wikitext) {
  const text = String(wikitext || "");
  const fields = wikiFields(text, ["servings", "serves"]);
  for (const value of fields) {
    const match = String(value).match(/(\d+)/);
    if (!match) continue;
    const n = parseInt(match[1], 10);
    if (n >= 1 && n <= 24) return n;
  }
  for (const value of wikiFields(text, ["yield"])) {
    if (!/serving/i.test(value)) continue;
    const match = String(value).match(/(\d+)/);
    if (!match) continue;
    const n = parseInt(match[1], 10);
    if (n >= 1 && n <= 24) return n;
  }
  return null;
}

function stripTemplates(text) {
  let out = text;
  for (let i = 0; i < 8; i++) {
    const next = out.replace(/\{\{[^{}]*\}\}/g, "");
    if (next === out) break;
    out = next;
  }
  return out;
}

export function cleanInline(raw) {
  let text = String(raw || "");
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  text = text.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "");
  text = text.replace(/<ref\b[^>]*\/?>/gi, "");
  text = text.replace(/<nowiki\s*\/?>|<\/nowiki>/gi, "");
  text = text.replace(/\{\{#invoke:temperature\|f\|(\d+)\}\}/gi, "$1°F");
  text = text.replace(/\{\{#invoke:temperature\|c\|(\d+)\}\}/gi, "$1°C");
  text = text.replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, (_, label) =>
    String(label).replace(/_/g, " ").trim()
  );
  text = text.replace(/'''/g, "").replace(/''/g, "");
  text = text.replace(/<br\s*\/?>/gi, " ");
  text = stripTemplates(text);
  text = text.replace(/<[^>]+>/g, "");
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#0*39;/g, "'")
    .replace(/&quot;/gi, '"');
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

function sectionMap(wikitext) {
  const text = String(wikitext || "").replace(/\r/g, "");
  const re = /^==+\s*([^=\n]+?)\s*==+\s*$/gm;
  const marks = [];
  let match;
  while ((match = re.exec(text))) {
    marks.push({ name: match[1].trim().toLowerCase(), start: match.index, end: match.index + match[0].length });
  }
  const sections = [];
  for (let i = 0; i < marks.length; i++) {
    const bodyEnd = i + 1 < marks.length ? marks[i + 1].start : text.length;
    sections.push({ name: marks[i].name, body: text.slice(marks[i].end, bodyEnd) });
  }
  return sections;
}

function linesFromSection(body) {
  const raw = String(body || "").split("\n");
  const bullets = [];
  for (const line of raw) {
    const match = line.match(/^\s*[*#]+\s*(.+)$/);
    if (match) bullets.push(match[1]);
  }
  const source = bullets.length
    ? bullets
    : raw.filter((line) => {
        const trimmed = line.trim();
        return trimmed && !/^[=|{!]/.test(trimmed) && !/^__[A-Z]+__$/.test(trimmed);
      });
  const items = [];
  for (const line of source) {
    const clean = cleanInline(line);
    if (!clean || clean.length > 240) continue;
    if (/^(edit|see also)$/i.test(clean)) continue;
    items.push(clean);
    if (items.length >= 60) break;
  }
  return items;
}

export function listResultsFromWikitext(wikitext) {
  const re = /\[\[(Cookbook:[^|\]]+)(?:\|([^\]]+))?\]\]/gi;
  const out = [];
  const seen = new Set();
  let match;
  while ((match = re.exec(String(wikitext || "")))) {
    const target = match[1].replace(/_/g, " ").replace(/\s+/g, " ").trim();
    const key = target.toLowerCase();
    if (seen.has(key)) continue;
    if (classifyPage(target, "") === "skip") continue;
    if (/disambiguation/i.test(target)) continue;
    seen.add(key);
    out.push({
      title: displayTitle(match[2] ? cleanInline(match[2]) : target) || displayTitle(target),
      url: cookbookUrl(target),
      source: SOURCE_NAME,
      sourceHost: SOURCE_HOST,
      minutes: null,
      image: "",
      license: LICENSE,
      kind: "recipe",
    });
    if (out.length >= 12) break;
  }
  return out;
}

function fileImage(wikitext) {
  const match = String(wikitext || "").match(/\[\[(?:Image|File):([^|\]]+)/i);
  if (!match) return "";
  const name = match[1].trim().replace(/_/g, " ");
  if (!name || /[<>"]/.test(name)) return "";
  return safeThumb(
    "https://commons.wikimedia.org/wiki/Special:FilePath/" +
      encodeURIComponent(name).replace(/%20/g, "_") +
      "?width=640"
  );
}

export function parseCookbookPage(page) {
  const title = (page && page.title) || "";
  const wikitext = revisionText(page);
  const url = httpsCanonical(page);
  const kind = classifyPage(title, wikitext);
  if (kind === "skip") return { kind: "empty" };
  if (kind === "list") {
    return { kind: "list", results: listResultsFromWikitext(wikitext) };
  }
  const sections = sectionMap(wikitext);
  let ingredients = [];
  let steps = [];
  for (const section of sections) {
    if (/ingredient/.test(section.name)) ingredients = ingredients.concat(linesFromSection(section.body));
    else if (/^(procedure|procedures|method|directions|instructions|preparation|steps)\b/.test(section.name)) {
      steps = steps.concat(linesFromSection(section.body));
    }
  }
  ingredients = ingredients.slice(0, 60);
  steps = steps.slice(0, 40);
  if (!ingredients.length && !steps.length) {
    const links = listResultsFromWikitext(wikitext);
    if (links.length >= 2) return { kind: "list", results: links };
    return { kind: "empty" };
  }
  const image = safeThumb(page.thumbnail && page.thumbnail.source) || fileImage(wikitext);
  const minutes = minutesFromWikitext(wikitext);
  const servings = servingsFromWikitext(wikitext);
  const recipe = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: displayTitle(title) || "Imported recipe",
    recipeIngredient: ingredients,
    recipeInstructions: steps.map((text) => ({ "@type": "HowToStep", text })),
  };
  if (image) recipe.image = image;
  if (minutes) recipe.totalTime = "PT" + minutes + "M";
  if (servings) recipe.recipeYield = String(servings);
  return { kind: "recipe", recipe, url };
}

export function cardFromPage(page) {
  if (!page || page.missing) return null;
  const wikitext = revisionText(page);
  const kind = classifyPage(page.title, wikitext);
  if (kind === "skip") return null;
  return {
    title: displayTitle(page.title),
    url: httpsCanonical(page),
    source: SOURCE_NAME,
    sourceHost: SOURCE_HOST,
    minutes: minutesFromWikitext(wikitext),
    image: safeThumb(page.thumbnail && page.thumbnail.source) || fileImage(wikitext),
    license: LICENSE,
    kind: kind === "list" ? "list" : "recipe",
  };
}

export function cardsFromApi(data) {
  const pages = data && data.query && data.query.pages;
  if (!pages) return [];
  const list = Array.isArray(pages) ? pages : Object.values(pages);
  return list
    .slice()
    .sort((a, b) => (a.index || 0) - (b.index || 0))
    .map(cardFromPage)
    .filter(Boolean);
}

export function searchParams(userQuery, offset, category) {
  const q = sanitizeQuery(userQuery);
  if (q.length < 2) return null;
  const off = Math.max(0, Math.min(200, parseInt(offset, 10) || 0));
  const gsr = category === false ? q : q + " deepcategory:Recipes";
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: gsr,
    gsrnamespace: "102",
    gsrlimit: "10",
    prop: "pageimages|info|revisions",
    inprop: "url",
    piprop: "thumbnail",
    pithumbsize: "320",
    rvprop: "content",
    rvslots: "main",
    rvsection: "0",
    redirects: "1",
  });
  if (off) params.set("gsroffset", String(off));
  return params;
}

export function pageParams(title) {
  return new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "revisions|pageimages|info",
    inprop: "url",
    piprop: "thumbnail",
    pithumbsize: "640",
    rvprop: "content",
    rvslots: "main",
    titles: title,
    redirects: "1",
  });
}

export function nextOffsetFrom(data, requestedOffset) {
  const token = data && data.continue && data.continue.gsroffset;
  const n = parseInt(token, 10);
  if (!isFinite(n) || n <= (parseInt(requestedOffset, 10) || 0)) return null;
  return n;
}
