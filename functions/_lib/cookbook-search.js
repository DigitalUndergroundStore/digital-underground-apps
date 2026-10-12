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
  u.searchParams.set("prop", "pageimages|info|extracts");
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
    if (!title) return;
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
