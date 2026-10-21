import { ipHash } from "../../_lib/ratelimit.js";
import { checkRate, clientIp, getKv, json, kvGetListing } from "../../_lib/community.js";
import { addReport, REPORT_REASONS } from "../../_lib/reports.js";

/**
 * POST /api/community/report — visitor "Report" form on a listing.
 * Body: { id, reason (one of REPORT_REASONS), note (optional), website (honeypot) }.
 * Rate-limited per IP; reporters are counted by a one-way IP hash (never the raw IP).
 */
export async function onRequest({ request, env }) {
  if (request.method !== "POST") return json({ ok: false, error: "Use POST." }, 405);
  let b = {};
  try { b = await request.json(); } catch { return json({ ok: false, error: "Bad request." }, 400); }
  if (b.website) return json({ ok: true }); // honeypot: pretend success
  const id = String(b.id || "");
  if (!/^cm_[a-z0-9_]{4,40}$/.test(id)) return json({ ok: false, error: "Listing not found." }, 404);
  const reason = String(b.reason || "");
  if (!REPORT_REASONS.includes(reason)) return json({ ok: false, error: "Pick a reason." }, 400);
  const note = String(b.note || "").replace(/[\r\n]+/g, " ").trim().slice(0, 500);
  const kv = getKv(env);
  if (!kv) return json({ ok: false, error: "Reports are unavailable right now." }, 503);
  const ip = clientIp(request);
  if (!(await checkRate(env, ip, "report"))) return json({ ok: false, error: "Too many reports. Please try again later." }, 429);
  let row = await kvGetListing(kv, id), seed = false;
  if (row && row.status !== "approved") return json({ ok: true }); // already hidden or not public
  if (!row) {
    try {
      const res = await fetch(new URL("/community/listings.json", request.url), { headers: { Accept: "application/json" } });
      const data = res.ok ? await res.json() : [];
      row = (Array.isArray(data) ? data : data?.listings || []).find((r) => r && r.id === id) || null;
      seed = !!row;
    } catch {}
  }
  if (!row) return json({ ok: false, error: "Listing not found." }, 404);
  await addReport(env, kv, { id, name: row.name, seed, reason, note, by: ipHash("report|" + ip) });
  return json({ ok: true });
}
