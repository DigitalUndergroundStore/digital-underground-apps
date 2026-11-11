import {
  getKv, json, kvGetIndex, kvGetListing, normalizeEmail, timingSafeEqualStr,
  RETIRED_IDS, isOwnerSeed, listingPrettyPath,
} from "../../_lib/community.js";
import { hiddenByReports } from "../../_lib/reports.js";

const PRIVATE = { "Cache-Control": "private, no-store" };
const LIVE = new Set(["approved", "live", "published"]);
const HOUSE_NAMES = new Set(["digital underground", "kerzy labs"]);
const HOUSE_SLUGS = new Set(["digital-underground", "kerzy-labs"]);
const lower = (value) => String(value || "").trim().toLowerCase();

function liveAt(listing) {
  for (const value of [listing.liveAt, listing.ownerApprovedAt]) {
    if (value == null || value === "") continue;
    if (typeof value !== "string" && typeof value !== "number") continue;
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  return "";
}

/** Read-only, least-privilege export. Never repair listings or write KV here. */
export async function onRequest({ request, env }) {
  if (request.method !== "GET") return json({ error: "Use GET." }, 405, { ...PRIVATE, Allow: "GET" });
  const expected = env?.ELLE_MAKER_CONTACTS_TOKEN;
  const supplied = request.headers.get("X-Elle-Token");
  if (typeof expected !== "string" || !expected.trim() || !supplied || !timingSafeEqualStr(supplied, expected)) {
    return json({ error: "Unauthorized." }, 401, PRIVATE);
  }
  const kv = getKv(env);
  if (!kv) return json({ error: "Contacts unavailable." }, 503, PRIVATE);
  try {
    const index = await kvGetIndex(kv);
    const approved = new Set(index.approved);
    const hidden = await hiddenByReports(kv);
    for (const id of [...index.flagged, ...index.rejected, ...index.unpublished]) hidden.add(id);
    // Index membership discovers records; an explicit non-live status always wins
    // over a stale approved index entry. Do not fall back to public static seeds.
    const ids = [...new Set(Object.values(index).flat())].filter((id) => typeof id === "string");
    const contacts = [];
    const optOutByEmail = new Map();
    for (const id of ids) {
      if (RETIRED_IDS.has(id) || hidden.has(id)) continue;
      const row = await kvGetListing(kv, id);
      if (!row || row.hidden || RETIRED_IDS.has(row.id) || hidden.has(row.id)) continue;
      const status = lower(row.status);
      if (!LIVE.has(status) && !(approved.has(id) && !status)) continue;
      if (isOwnerSeed(row) || HOUSE_NAMES.has(lower(row.makerName)) || HOUSE_SLUGS.has(lower(row.makerSlug))) continue;
      const email = normalizeEmail(row.email);
      if (!email) continue;
      if (!optOutByEmail.has(email)) {
        const subscriber = await kv.get(`sub:${email}`, "json");
        optOutByEmail.set(email, subscriber?.status === "unsubscribed");
      }
      contacts.push({
        makerName: typeof row.makerName === "string" ? row.makerName : "",
        productName: typeof row.name === "string" ? row.name : "",
        email,
        listingUrl: "https://digitalundergroundstore.com" + listingPrettyPath({ ...row, id }),
        liveAt: liveAt(row),
        emailOptOut: row.emailOptOut === true || optOutByEmail.get(email),
      });
    }
    contacts.sort((a, b) => {
      for (const key of ["makerName", "productName", "email", "listingUrl"]) {
        if (a[key] < b[key]) return -1;
        if (a[key] > b[key]) return 1;
      }
      return 0;
    });
    return json(contacts, 200, PRIVATE);
  } catch {
    // No exception logging: KV failures must not leak contacts or credentials.
    return json({ error: "Contacts unavailable." }, 503, PRIVATE);
  }
}
