import {
  getKv,
  json,
  listApproved,
  publicListing,
} from "../../_lib/community.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (request.method !== "GET") {
    return json({ error: "Use GET." }, 405);
  }

  const kv = getKv(env);
  let listings = [];
  if (kv) {
    try {
      listings = await listApproved(kv);
    } catch (e) {
      console.error("community listings kv error", e);
      return json({ error: "Could not load listings." }, 500);
    }
  }

  let staticListings = [];
  try {
    const origin = new URL(request.url).origin;
    const res = await fetch(`${origin}/community/listings.json`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) staticListings = data.map(publicListing);
      else if (Array.isArray(data?.listings)) staticListings = data.listings.map(publicListing);
    }
  } catch {
    /* static seed optional */
  }

  const byId = new Map();
  for (const row of staticListings) {
    if (row?.id) byId.set(row.id, row);
  }
  for (const row of listings) {
    if (row?.id) byId.set(row.id, row);
  }
  const merged = [...byId.values()].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  );

  return json(
    { listings: merged, storage: kv ? "kv" : "static_only" },
    200,
    { "Cache-Control": "public, max-age=60" }
  );
}
