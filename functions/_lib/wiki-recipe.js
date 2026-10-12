/**
 * Turn one Wikibooks Cookbook page (wikitext we already fetched for that URL)
 * into a schema.org Recipe object. No catalog is stored.
 */

export function cookbookTitleFromUrl(raw) {
  let parsed;
  try {
    parsed = new URL(String(raw || ""));
  } catch {
    return "";
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
  if (parsed.hostname.toLowerCase() !== "en.wikibooks.org") return "";
  let title = "";
  if (parsed.pathname === "/w/index.php") {
    title = parsed.searchParams.get("title") || "";
  } else if (parsed.pathname.startsWith("/wiki/")) {
    try {
      title = decodeURIComponent(parsed.pathname.slice("/wiki/".length));
    } catch {
      return "";
    }
  }
  title = title.replace(/_/g, " ").replace(/#.*$/, "").trim();
  if (!/^Cookbook:[^#<>|{}\[\]\n]{1,180}$/.test(title)) return "";
  if (title.includes("..")) return "";
  return title;
}

export function cookbookPageUrl(title) {
  const slug = String(title || "").replace(/ /g, "_");
  return "https://en.wikibooks.org/wiki/" + encodeURIComponent(slug).replace(/%3A/gi, ":").replace(/%2F/gi, "/");
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function wikiPlain(text) {
  let s = decodeEntities(text);
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "");
  s = s.replace(/<ref\b[^>]*\/>/gi, "");
  s = s.replace(/\{\{Recipe summary[\s\S]*?\}\}/gi, "");
  s = s.replace(/\{\{[^{}]*\}\}/g, "");
  s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2");
  s = s.replace(/\[\[(?:[^:\]]*):([^\]]+)\]\]/g, "$1");
  s = s.replace(/\[\[([^\]]+)\]\]/g, "$1");
  s = s.replace(/\[https?:\/\/\S+\s+([^\]]+)\]/gi, "$1");
  s = s.replace(/\[https?:\/\/\S+\]/gi, "");
  s = s.replace(/'{2,}/g, "");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/_+/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

export function parseLooseMinutes(text) {
  if (!text) return null;
  const s = String(text);
  let mins = 0;
  const h = s.match(/(\d+)\s*h(?:ours?|r)?\b/i);
  const m = s.match(/(\d+)\s*m(?:in(?:ute)?s?)?\b/i);
  if (h) mins += parseInt(h[1], 10) * 60;
  if (m && !/^h/i.test(s.slice(m.index))) mins += parseInt(m[1], 10);
  if (mins > 0 && mins < 24 * 60) return mins;
  const n = s.match(/(\d{1,3})/);
  if (!n) return null;
  const value = parseInt(n[1], 10);
  return value > 0 && value < 24 * 60 ? value : null;
}

function summaryField(wikitext, names) {
  const block = String(wikitext || "").match(/\{\{Recipe summary([\s\S]*?)\}\}/i);
  if (!block) return "";
  const body = block[1];
  for (const name of names) {
    const re = new RegExp("\\|\\s*" + name + "\\s*=\\s*([^\\n|}]*)", "i");
    const hit = body.match(re);
    if (hit && hit[1].trim()) return wikiPlain(hit[1]);
  }
  return "";
}

function sectionBody(wikitext, names) {
  const re = new RegExp("==+\\s*(?:" + names.join("|") + ")\\s*==+\\s*([\\s\\S]*?)(?=\\n==+|$)", "i");
  const hit = String(wikitext || "").match(re);
  return hit ? hit[1] : "";
}

function listLines(body, marker) {
  const out = [];
  String(body || "").split(/\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith(marker)) return;
    const plain = wikiPlain(trimmed.replace(new RegExp("^\\" + marker + "+\\s*"), ""));
    if (plain && plain.length < 400) out.push(plain);
  });
  return out;
}

function toIsoDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return "PT" + h + "H" + m + "M";
  if (h) return "PT" + h + "H";
  return "PT" + m + "M";
}

export function displayTitle(title) {
  return String(title || "").replace(/^Cookbook:/i, "").replace(/_/g, " ").trim();
}

/**
 * @returns {object|null} schema.org Recipe, or null when the page has no recipe body
 */
export function wikiToSchema(title, wikitext, imageUrl) {
  const name = displayTitle(title);
  if (!name || !wikitext) return null;
  const ingredients = listLines(sectionBody(wikitext, ["ingredients?", "ingredient list"]), "*");
  const steps = listLines(sectionBody(wikitext, ["procedure", "directions?", "method", "instructions?", "preparation", "steps?"]), "#");
  if (!ingredients.length && !steps.length) return null;
  const minutes = parseLooseMinutes(summaryField(wikitext, ["total time", "time", "preparation time", "prep time", "cook time"]));
  const servings = summaryField(wikitext, ["servings", "yield", "serves"]);
  const recipe = {
    "@type": "Recipe",
    name,
    recipeIngredient: ingredients,
    recipeInstructions: steps.map((text) => ({ "@type": "HowToStep", text })),
  };
  if (minutes) recipe.totalTime = toIsoDuration(minutes);
  const yieldMatch = String(servings || "").match(/(\d+)/);
  if (yieldMatch) recipe.recipeYield = yieldMatch[1];
  if (imageUrl && /^https?:\/\//i.test(imageUrl)) recipe.image = imageUrl;
  return recipe;
}

export function wikitextFromApiPage(page) {
  if (!page || page.missing) return "";
  const rev = page.revisions && page.revisions[0];
  if (!rev) return "";
  const slot = rev.slots && rev.slots.main;
  if (slot) return slot.content || slot["*"] || "";
  return rev.content || rev["*"] || "";
}
