import { orderListings, ROTATE_MS } from "../../_lib/order.js";
import {
  getKv,
  kvGetIndex,
  json,
  listApproved,
  publicListing,
  listingContactAddress,
} from "../../_lib/community.js";
import { hiddenByReports } from "../../_lib/reports.js";

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
      listings = await listApproved(kv, env);
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
      if (Array.isArray(data)) staticListings = data.map((r) => ({ ...publicListing(r), contactable: !!listingContactAddress(env, r) }));
      else if (Array.isArray(data?.listings)) staticListings = data.listings.map((r) => ({ ...publicListing(r), contactable: !!listingContactAddress(env, r) }));
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
  let pinned = [];
  try {
    const pr = await fetch(`${new URL(request.url).origin}/community/pinned.json`);
    if (pr.ok) pinned = await pr.json();
  } catch {}
  if (!Array.isArray(pinned)) pinned = [];
  const rank = (id) => { const i = pinned.indexOf(id); return i < 0 ? 1e9 : i; };
  const HIDDEN = new Set(['cm_kerzy_easytracker']); // pulled from the marketplace for now (data kept)
  let reported = new Set();
  if (kv) { try { reported = await hiddenByReports(kv); for (const id of (await kvGetIndex(kv)).flagged) reported.add(id); } catch {} }
  for (const [id, row] of byId) if (HIDDEN.has(id) || row?.hidden || reported.has(id)) byId.delete(id);
  const merged = orderListings([...byId.values()], { pinned, now: Date.now() });

  // Seeded listings hidden after reports: stub tells the browse page (which also loads listings.json) to drop them.
  for (const id of reported) if (staticListings.some((r) => r.id === id)) merged.push({ id, hidden: true });
  return json(
    { listings: merged, ordered: true, rotationWindow: Math.floor(Date.now() / ROTATE_MS), storage: kv ? "kv" : "static_only" },
    200,
    { "Cache-Control": "public, max-age=60" }
  );
}
