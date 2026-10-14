import {
  adminAuthorized,
  deleteListing,
  getKv,
  json,
  listPending,
  setListingStatus,
} from "../../_lib/community.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (!adminAuthorized(request, env)) {
    return json({ error: "Unauthorized." }, 401);
  }

  const kv = getKv(env);
  if (!kv) {
    return json({ error: "COMMUNITY_KV is not bound." }, 503);
  }

  if (request.method === "GET") {
    try {
      const pending = await listPending(kv);
      return json({ pending });
    } catch (e) {
      console.error("community admin list error", e);
      return json({ error: "Could not load queue." }, 500);
    }
  }

  if (request.method !== "POST") {
    return json({ error: "Use GET or POST." }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const action = body.action;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return json({ error: "Missing listing id." }, 400);

  try {
    if (action === "approve") {
      const row = await setListingStatus(kv, id, "approved");
      if (!row) return json({ error: "Listing not found." }, 404);
      return json({ ok: true, listing: row });
    }
    if (action === "reject") {
      const row = await setListingStatus(kv, id, "rejected");
      if (!row) return json({ error: "Listing not found." }, 404);
      return json({ ok: true, listing: row });
    }
    if (action === "delete") {
      await deleteListing(kv, id);
      return json({ ok: true, deleted: id });
    }
    return json({ error: "Unknown action. Use approve, reject, or delete." }, 400);
  } catch (e) {
    console.error("community admin action error", e);
    return json({ error: "Action failed." }, 500);
  }
}
