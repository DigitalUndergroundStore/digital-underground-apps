/**
 * Listing reports ("Report" button on /community/p/).
 * KV key community:reports = { [listingId]: { id, name, state: "open"|"flagged"|"removed"|"restored",
 *   reporters: [ipHash], reports: [{ reason, note, at }], flaggedAt, seed } }.
 * A listing is auto-hidden ("flagged") once REPORT_THRESHOLD distinct reporters (default 2) report it,
 * or after a single "Spam or scam" report. Nothing is ever deleted automatically.
 * KV listings move to status "flagged"; seeded (static) listings are hidden via this map.
 */
import { kvGetListing, ownerAlertEmail, ownerNotifyEmail, saveListing, sendCommunityEmail } from "./community.js";

// Status changes go through saveListing (not setListingStatus) so a restore never auto-approves a pending video.
async function setStatus(kv, row, status) { row.status = status; row.updatedAt = Date.now(); await saveListing(kv, row); }

export const REPORT_REASONS = ["Spam or scam", "Broken link", "Misleading", "Inappropriate", "Other"];
const KEY = "community:reports";

export function reportThreshold(env) {
  const n = parseInt(env?.REPORT_THRESHOLD || "", 10);
  return Number.isFinite(n) && n >= 1 && n <= 50 ? n : 2;
}

export async function getReports(kv) {
  const raw = kv ? await kv.get(KEY, "json") : null;
  return raw && typeof raw === "object" ? raw : {};
}
async function putReports(kv, map) { await kv.put(KEY, JSON.stringify(map)); }

/** Seeded (static) listing ids hidden because of reports. KV listings are hidden by status "flagged" instead. */
export async function hiddenByReports(kv) {
  const m = await getReports(kv);
  return new Set(Object.keys(m).filter((id) => m[id] && m[id].seed && (m[id].state === "flagged" || m[id].state === "removed")));
}

/** Pure decision: should this entry be auto-hidden now? */
export function shouldFlag(entry, threshold) {
  if (!entry || entry.state === "flagged" || entry.state === "removed") return false;
  const since = entry.restoredAt || 0;
  const recent = (entry.reports || []).filter((r) => r.at > since);
  if (recent.some((r) => r.reason === "Spam or scam")) return true;
  return new Set(recent.map((r) => r.by)).size >= threshold;
}

/** Record one report. Returns { flagged: bool, duplicate: bool }. */
export async function addReport(env, kv, { id, name, seed, reason, note, by }) {
  const map = await getReports(kv);
  const e = map[id] || { id, name, state: "open", reports: [] };
  e.name = name || e.name;
  e.seed = !!seed;
  const since = e.restoredAt || 0;
  const dup = (e.reports || []).some((r) => r.by === by && r.at > since && r.reason === reason);
  if (dup) return { flagged: e.state === "flagged", duplicate: true };
  e.reports = [...(e.reports || []), { reason, note, by, at: Date.now() }].slice(-50);
  let flagged = false;
  if (shouldFlag(e, reportThreshold(env))) {
    e.state = "flagged";
    e.flaggedAt = Date.now();
    flagged = true;
    const row = await kvGetListing(kv, id);
    if (row && row.status === "approved") await setStatus(kv, row, "flagged");
  }
  map[id] = e;
  await putReports(kv, map);
  if (flagged) await notifyFlagged(env, e).catch((err) => console.error("report notify error", err && err.message));
  return { flagged, duplicate: false };
}

/** Owner action: restore (republish) or remove (keep hidden; data kept). */
export async function resolveReport(kv, id, action) {
  const map = await getReports(kv);
  const e = map[id];
  if (!e) return null;
  const row = await kvGetListing(kv, id);
  if (action === "restore") {
    e.state = "restored";
    e.restoredAt = Date.now();
    if (row && row.status === "flagged") await setStatus(kv, row, "approved");
  } else if (action === "remove") {
    e.state = "removed";
    e.removedAt = Date.now();
    if (row && row.status === "flagged") { row.rejectReason = "Removed after reports."; await setStatus(kv, row, "rejected"); }
  } else if (action === "dismiss") {
    delete map[id];
    await putReports(kv, map);
    return { id, dismissed: true };
  } else return null;
  map[id] = e;
  await putReports(kv, map);
  return e;
}

export function ownerReportView(e) {
  const counts = {};
  for (const r of e.reports || []) counts[r.reason] = (counts[r.reason] || 0) + 1;
  return {
    id: e.id, name: e.name, state: e.state, seed: !!e.seed, flaggedAt: e.flaggedAt || null,
    reporters: new Set((e.reports || []).map((r) => r.by)).size, counts,
    reports: (e.reports || []).map((r) => ({ reason: r.reason, note: r.note || "", at: r.at })),
  };
}

async function notifyFlagged(env, e) {
  const to = ownerNotifyEmail(env);
  const page = `https://digitalundergroundstore.com/community/p/?id=${encodeURIComponent(e.id)}`;
  const text = [
    "Open your owner dashboard: https://digitalundergroundstore.com/owner/", "",
    `A listing was auto-hidden after reports: ${e.name || e.id}`,
    `ID: ${e.id}`, `Listing: ${page}`, "",
    "Reports:", ...(e.reports || []).map((r) => `- ${r.reason}${r.note ? ": " + r.note : ""}`), "",
    "It is hidden, not deleted. Restore or Remove it in Owner Dashboard → Review queue → Reported listings.",
  ].join("\n");
  const subject = `[Community] Flagged by reports: ${e.name || e.id}`;
  await sendCommunityEmail(env, { to, subject, text });
  const owner = ownerAlertEmail(env);
  if (owner && owner !== to) await sendCommunityEmail(env, { to: owner, subject, text }).catch(() => {});
}
