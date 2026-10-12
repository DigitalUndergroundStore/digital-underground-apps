/**
 * The only outbound fetch path for Wikimedia API calls (Cookbook search and one-page reads).
 * Host allowlist + https only + no redirects, so a crafted query/title can never point
 * the function at another host (SSRF). Callers build URLs with URL/searchParams.
 */

export const WIKIMEDIA_API_HOSTS = new Set(["en.wikibooks.org"]);
const API_PATH = "/w/api.php";
const MAX_BYTES = 2 * 1024 * 1024;

export function isAllowedWikimediaApiUrl(raw) {
  let u;
  try {
    u = new URL(String(raw || ""));
  } catch {
    return false;
  }
  return u.protocol === "https:" && WIKIMEDIA_API_HOSTS.has(u.hostname.toLowerCase()) &&
    u.pathname === API_PATH && !u.username && !u.password && (u.port === "" || u.port === "443");
}

/** Thumbnails we pass to the app must be https Wikimedia uploads; anything else is dropped. */
export function safeWikimediaImage(raw) {
  try {
    const u = new URL(String(raw || ""));
    if (u.protocol === "https:" && u.hostname.toLowerCase() === "upload.wikimedia.org") return u.toString();
  } catch { /* ignore */ }
  return "";
}

export async function wikimediaApiJson(url, { userAgent, signal } = {}) {
  if (!isAllowedWikimediaApiUrl(url)) throw new Error("Blocked non-Wikimedia API URL");
  const response = await fetch(url, {
    method: "GET",
    redirect: "manual", // Workers support follow|manual; any 3xx is treated as a failure below
    signal,
    headers: { Accept: "application/json", "User-Agent": userAgent, "Api-User-Agent": userAgent },
  });
  if (response.status >= 300 || !response.ok) return { ok: false, status: response.status, data: null };
  const len = Number(response.headers.get("Content-Length") || 0);
  if (len > MAX_BYTES) return { ok: false, status: 413, data: null };
  const text = await response.text();
  if (text.length > MAX_BYTES) return { ok: false, status: 413, data: null };
  return { ok: true, status: response.status, data: JSON.parse(text) };
}
