/** GET /api/community/turnstile-config -> { siteKey } from the TURNSTILE_SITE_KEY env var (public value). */
export function onRequestGet({ env }) {
  return new Response(JSON.stringify({ siteKey: env?.TURNSTILE_SITE_KEY || "" }), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
