import { safeWikimediaImage } from "./wikimedia-api.js";

/**
 * Shape a Wikimedia Cookbook search (titles, URLs, thumbnails only).
 * The recipe body is not requested and not stored.
 */

export function sanitizeDishQuery(raw) {
  let q = String(raw || "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  q = q.replace(/\brecipe\b/gi, " ").replace(/\s+/g, " ").trim();
  if (q.length > 120) q = q.slice(0, 120).trim();
  return q;
}

export function wikibooksSearchUrl(query) {
  const u = new URL("https://en.wikibooks.org/w/api.php");
  u.searchParams.set("action", "query");
  u.searchParams.set("generator", "search");
  u.searchParams.set("gsrsearch", query);
  u.searchParams.set("gsrnamespace", "102");
  u.searchParams.set("gsrlimit", "8");
  u.searchParams.set("prop", "pageimages|info|extracts|categories");
  u.searchParams.set("cllimit", "500");
  u.searchParams.set("piprop", "thumbnail");
  u.searchParams.set("pithumbsize", "320");
  u.searchParams.set("inprop", "url");
  u.searchParams.set("exintro", "1");
  u.searchParams.set("explaintext", "1");
  u.searchParams.set("exchars", "180");
  u.searchParams.set("format", "json");
  u.searchParams.set("formatversion", "2");
  return u.toString();
}

export function cookbookPageUrl(title) {
  const slug = String(title || "").replace(/ /g, "_");
  return "https://en.wikibooks.org/wiki/" + encodeURIComponent(slug).replace(/%3A/gi, ":").replace(/%2F/gi, "/");
}

function categoryTitle(cat) {
  if (!cat) return "";
  return String(cat.title || cat).replace(/^Category:/, "");
}

/**
 * True for a single recipe page. Drops cuisine, ingredient, and index pages
 * such as "Cuisine of Italy" even when the search snippet mentions food.
 * A page with no categories is kept unless the title itself is an overview,
 * so a recipe the API forgot to categorize still shows up.
 */
export function isCookbookRecipePage(title, categories) {
  const name = String(title || "").replace(/^Cookbook:/i, "").replace(/_/g, " ").trim();
  if (!name) return false;
  if (/^cuisine of\b/i.test(name)) return false;
  if (/\bcuisines?$/i.test(name) && !/\brecipe\b/i.test(name)) return false;
  if (/^(ingredients|equipment|techniques|table of contents|recipes|breakfast|lunch|dinner|desserts?|main course|appetizers?|side dishes|snacks|beverages|sauces)$/i.test(name)) {
    return false;
  }
  const labels = (categories || []).map(categoryTitle).filter(Boolean);
  if (labels.indexOf("Cookbook pages with recipe lists") !== -1) return false;
  if (labels.some((label) => /recipes$/i.test(label))) return true;
  if (labels.some((label) => /^(cuisines|ingredients|equipment|techniques|cookbook|featured ingredients)$/i.test(label) || /cuisines$/i.test(label) || /ingredients$/i.test(label))) {
    return false;
  }
  return true;
}

function minutesFromExtract(text) {
  const m = String(text || "").match(/(\d{1,3})\s*(?:min|mins|minutes)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n > 0 && n < 24 * 60 ? n : null;
}

export function shapeCookbookPages(pages) {
  const out = [];
  const seen = new Set();
  (pages || []).forEach((page) => {
    if (!page || page.missing) return;
    const rawTitle = String(page.title || "");
    if (!rawTitle.startsWith("Cookbook:")) return;
    const title = rawTitle.replace(/^Cookbook:/, "").replace(/_/g, " ").trim();
    if (!title || !isCookbookRecipePage(rawTitle, page.categories)) return;
    let url = page.fullurl || page.canonicalurl || cookbookPageUrl(rawTitle);
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || parsed.hostname !== "en.wikibooks.org") url = cookbookPageUrl(rawTitle);
      if (!parsed.pathname.startsWith("/wiki/Cookbook:")) url = cookbookPageUrl(rawTitle);
    } catch {
      url = cookbookPageUrl(rawTitle);
    }
    if (seen.has(url)) return;
    seen.add(url);
    const image = safeWikimediaImage(page.thumbnail && page.thumbnail.source);
    out.push({
      title,
      url,
      source: "Wikibooks",
      license: "CC BY-SA",
      image,
      minutes: minutesFromExtract(page.extract),
    });
  });
  return out.slice(0, 8);
}
