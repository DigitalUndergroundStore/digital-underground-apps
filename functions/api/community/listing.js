import { hiddenByReports } from "../../_lib/reports.js";
import { getKv, json, kvGetListing, publicListingDetail, repairVideoHold, saveListing, RETIRED_IDS } from "../../_lib/community.js";

/** GET /api/community/listing?id=… — public detail for an approved listing. */
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return json({ error: "Use GET." }, 405);
  const id = new URL(request.url).searchParams.get("id") || "";
  const kv = getKv(env);
  if (!/^cm_[a-z0-9_]{4,40}$/.test(id) || RETIRED_IDS.has(id)) return json({ error: "Not found." }, 404);
  const row = kv ? await kvGetListing(kv, id) : null;
  if (kv && row && repairVideoHold(row)) await saveListing(kv, row);
  // Hidden after reports: KV listings by status, seeded ones via the reports map.
  if (row && row.status === "flagged") return json({ error: "Not found." }, 404);
  if (kv && !row && (await hiddenByReports(kv)).has(id)) return json({ error: "Not found." }, 404);
  if (!row || row.status !== "approved") {
    // Fall back to the owner's static seed (community/listings.json), same as the browse endpoint.
    try {
      const res = await fetch(new URL("/community/listings.json", request.url), { headers: { Accept: "application/json" } });
      const data = res.ok ? await res.json() : [];
      const seed = (Array.isArray(data) ? data : data?.listings || []).find((r) => r && r.id === id);
      if (seed) return json({ listing: publicListingDetail(seed, env) }, 200, { "Cache-Control": "public, max-age=60" });
    } catch {}
    return json({ error: "Not found." }, 404);
  }
  return json({ listing: publicListingDetail(row, env) }, 200, { "Cache-Control": "public, max-age=60" });
}
