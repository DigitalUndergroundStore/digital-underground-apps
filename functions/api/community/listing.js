import { getKv, json, kvGetListing, publicListingDetail } from "../../_lib/community.js";

/** GET /api/community/listing?id=… — public detail for an approved listing. */
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return json({ error: "Use GET." }, 405);
  const id = new URL(request.url).searchParams.get("id") || "";
  const kv = getKv(env);
  if (!kv || !/^cm_[a-z0-9_]{4,40}$/.test(id)) return json({ error: "Not found." }, 404);
  const row = await kvGetListing(kv, id);
  if (!row || row.status !== "approved") return json({ error: "Not found." }, 404);
  return json({ listing: publicListingDetail(row) }, 200, { "Cache-Control": "public, max-age=60" });
}
