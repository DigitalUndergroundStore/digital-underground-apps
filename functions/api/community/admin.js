import {
  adminAuthorized,
  backfillContactsFromListings,
  contactsToCsv,
  deleteContact,
  deleteListing,
  getKv,
  json,
  listContacts,
  listPending,
  setListingStatus,
  kvGetListing,
  kvPutListing,
} from "../../_lib/community.js";
import {
  attachListing,
  dashboardUrl,
  getAccount,
  issueAccountToken,
  linkContactToCreator,
  purgeStats,
} from "../../_lib/creator.js";

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

  const url = new URL(request.url);
  const queryAction = url.searchParams.get("action") || "";

  if (request.method === "GET") {
    try {
      if (queryAction === "contacts") {
        const rows = await listContacts(kv);
        const csv = contactsToCsv(rows);
        return new Response(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="developer-marketplace-contacts.csv"',
            "Cache-Control": "no-store",
          },
        });
      }
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
  try {
    if (action === "backfill_contacts") {
      const result = await backfillContactsFromListings(kv);
      return json({ ok: true, ...result });
    }
    if (action === "delete_contact") {
      const email = typeof body.email === "string" ? body.email.trim() : "";
      if (!email) return json({ error: "Missing email." }, 400);
      await deleteContact(kv, email);
      return json({ ok: true, deleted: email.toLowerCase() });
    }

    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return json({ error: "Missing listing id." }, 400);

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
    if (action === "issue_creator_token") {
      // Create (or rotate) the manage link for a listing's creator. Returned once; not stored.
      const row = await kvGetListing(kv, id);
      if (!row) return json({ error: "Listing not found." }, 404);
      const existing = row.creatorId ? await getAccount(kv, row.creatorId) : null;
      const { acct, token } = await issueAccountToken(kv, existing);
      if (!existing) {
        row.creatorId = acct.id;
        await kvPutListing(kv, row);
      }
      await attachListing(kv, acct, row.id);
      await linkContactToCreator(kv, row.email, acct.id);
      return json({ ok: true, creatorId: acct.id, dashboardUrl: dashboardUrl(env, request, token) });
    }
    if (action === "delete") {
      await deleteListing(kv, id);
      try { await purgeStats(kv, id); } catch (_) {}
      return json({ ok: true, deleted: id });
    }
    return json(
      { error: "Unknown action. Use approve, reject, delete, issue_creator_token, backfill_contacts, or delete_contact." },
      400
    );
  } catch (e) {
    console.error("community admin action error", e);
    return json({ error: "Action failed." }, 500);
  }
}
