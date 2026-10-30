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
  notifyMakerApproved,
} from "../../_lib/community.js";
import {
  attachListing,
  dashboardUrl,
  getAccount,
  issueAccountToken,
  linkContactToCreator,
  purgeStats,
  resetCreatorAuth,
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

    if (action === "delete_creator") {
      // Remove a creator account (its manage link stops working) and unlink it from contacts.
      const acct = await getAccount(kv, String(body.creatorId || ""));
      if (!acct) return json({ error: "Creator not found." }, 404);
      await kv.delete("creator:" + acct.id);
      if (body.email) await unlinkContact(kv, String(body.email), acct.id, body.listingIds || []);
      return json({ ok: true, deleted: acct.id });
    }
    if (action === "reset_creator_auth") {
      // Clear email + password and revoke all sessions. The private link (token) keeps working.
      const acct = await getAccount(kv, String(body.creatorId || ""));
      if (!acct) return json({ error: "Creator not found." }, 404);
      const { oldEmail } = await resetCreatorAuth(kv, acct);
      let contactUnlinked = false;
      if (oldEmail) {
        await unlinkContact(kv, oldEmail, acct.id, []);
        contactUnlinked = true;
      }
      return json({ ok: true, creatorId: acct.id, hadEmail: !!oldEmail, contactUnlinked, listingIds: acct.listingIds || [] });
    }
    if (action === "unlink_contact_listing") {
      await unlinkContact(kv, String(body.email || ""), "", [String(body.id || "")]);
      return json({ ok: true });
    }

    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return json({ error: "Missing listing id." }, 400);

    if (action === "approve") {
      const before = await kvGetListing(kv, id);
      const row = await setListingStatus(kv, id, "approved");
      if (!row) return json({ error: "Listing not found." }, 404);
      const makerEmail = await notifyMakerApproved(env, kv, row, request, before?.status || "");
      return json({ ok: true, listing: row, makerEmail });
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
      { error: "Unknown action. Use approve, reject, delete, issue_creator_token, delete_creator, unlink_contact_listing, backfill_contacts, or delete_contact." },
      400
    );
  } catch (e) {
    console.error("community admin action error", e);
    return json({ error: "Action failed." }, 500);
  }
}

async function unlinkContact(kv, email, creatorId, listingIds) {
  const key = "contact:" + email.trim().toLowerCase();
  const row = await kv.get(key, "json");
  if (!row) return;
  if (creatorId && Array.isArray(row.creatorIds)) row.creatorIds = row.creatorIds.filter((x) => x !== creatorId);
  if (Array.isArray(row.listingIds)) row.listingIds = row.listingIds.filter((x) => !listingIds.includes(x));
  await kv.put(key, JSON.stringify(row));
}
