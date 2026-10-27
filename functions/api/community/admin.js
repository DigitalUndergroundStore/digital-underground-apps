import {
  adminAuthorized,
  backfillContactsFromListings,
  canonicalProjectUrl,
  communitySiteOrigin,
  contactsToCsv,
  deleteContact,
  deleteListing,
  getKv,
  json,
  kvGetIndex,
  listContacts,
  listPending,
  normalizeEmail,
  saveListing,
  setListingStatus,
  upsertContact,
  validateSubmission,
  kvGetListing,
  kvPutListing,
} from "../../_lib/community.js";
import {
  accountIdForLogin,
  attachListing,
  creatorIdsForEmail,
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

    // Operator create for a yes-reply maker. Public POST /api/community/submit stays Turnstile-gated.
    // curl -X POST "$ORIGIN/api/community/admin" \
    //   -H "Authorization: Bearer $COMMUNITY_ADMIN_TOKEN" -H "Content-Type: application/json" \
    //   -d '{"action":"create_listing","name":"Project","projectUrl":"https://example.com","makerName":"Maker","email":"maker@example.com","category":"apps","pitchShort":"One line","descriptionLong":"Longer description.","imageUrl":"https://example.com/logo.png","terms":true}'
    // A new creator account includes dashboardUrl (same link as issue_creator_token). The same email + project URL
    // returns the existing listing and does not rotate that link. Mint/rotate later with issue_creator_token, or
    // send issueToken:true on create_listing. See docs/community-marketplace.md.
    if (action === "create" || action === "create_listing") {
      const validated = validateSubmission(body);
      if (validated.error) return json({ error: validated.error }, validated.status || 400);
      const listing = validated.listing;
      const issueToken = body.issueToken === true || body.issueToken === "true";
      const existing = await findListingByEmailAndProject(kv, listing.email, listing.projectUrl);
      const { acct, token, created } = await ensureCreatorAccount(kv, listing.email, existing, issueToken);
      if (existing) {
        await linkListingToCreator(kv, existing, acct);
        return json(createListingResponse(env, request, existing, acct, { token, created, existing: true }));
      }
      listing.creatorId = acct.id;
      listing.status = "approved";
      listing.source = "admin";
      listing.screening = {
        reasons: [],
        detail: "Operator create_listing. Public Turnstile submit was not used.",
        screenedAt: Date.now(),
      };
      if (listing.videoUrl) listing.videoApprovedUrl = listing.videoUrl;
      await saveListing(kv, listing);
      await linkListingToCreator(kv, listing, acct);
      return json(createListingResponse(env, request, listing, acct, { token, created, existing: false }));
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
      { error: "Unknown action. Use approve, reject, delete, create_listing, issue_creator_token, delete_creator, unlink_contact_listing, backfill_contacts, or delete_contact." },
      400
    );
  } catch (e) {
    console.error("community admin action error", e);
    return json({ error: "Action failed." }, 500);
  }
}

const LISTING_RANK = { approved: 4, pending: 3, unpublished: 2, rejected: 1 };

async function findListingByEmailAndProject(kv, email, projectUrl) {
  const wantEmail = normalizeEmail(email);
  const wantUrl = canonicalProjectUrl(projectUrl);
  if (!wantEmail || !wantUrl) return null;
  const index = await kvGetIndex(kv);
  const ids = [
    ...(index.approved || []),
    ...(index.pending || []),
    ...(index.unpublished || []),
    ...(index.rejected || []),
  ];
  const seen = new Set();
  let best = null;
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const row = await kvGetListing(kv, id);
    if (!row || normalizeEmail(row.email) !== wantEmail) continue;
    if (canonicalProjectUrl(row.projectUrl) !== wantUrl) continue;
    if (!best) {
      best = row;
      continue;
    }
    const ra = LISTING_RANK[row.status] || 0;
    const rb = LISTING_RANK[best.status] || 0;
    const newer = (row.updatedAt || row.createdAt || 0) >= (best.updatedAt || best.createdAt || 0);
    if (ra > rb || (ra === rb && newer)) best = row;
  }
  return best;
}

/**
 * Attach this email to the account that already owns the listing, else the login
 * or contact-linked creator, else a new passwordless account (manage link).
 * issueAccountToken rotates the manage link; only call it for a new account or
 * when the operator passes issueToken.
 */
async function ensureCreatorAccount(kv, email, existingListing, issueToken) {
  let acct = null;
  if (existingListing?.creatorId) acct = await getAccount(kv, existingListing.creatorId);
  if (!acct) {
    const loginId = await accountIdForLogin(kv, email);
    if (loginId) acct = await getAccount(kv, loginId);
  }
  if (!acct) {
    const ids = await creatorIdsForEmail(kv, email);
    const found = [];
    for (const cid of [...ids].reverse()) {
      const row = await getAccount(kv, cid);
      if (row) found.push(row);
    }
    acct = found.find((row) => !row.pw) || found[0] || null;
  }
  let token = null;
  let created = false;
  if (!acct) {
    const issued = await issueAccountToken(kv, null);
    acct = issued.acct;
    token = issued.token;
    created = true;
  } else if (issueToken) {
    const issued = await issueAccountToken(kv, acct);
    acct = issued.acct;
    token = issued.token;
  }
  return { acct, token, created };
}

async function linkListingToCreator(kv, listing, acct) {
  if (listing.creatorId !== acct.id) {
    listing.creatorId = acct.id;
    listing.updatedAt = Date.now();
    await kvPutListing(kv, listing);
  }
  await attachListing(kv, acct, listing.id);
  await upsertContact(kv, { email: listing.email, name: listing.makerName, listingId: listing.id });
  await linkContactToCreator(kv, listing.email, acct.id);
}

function createListingResponse(env, request, listing, acct, { token, created, existing }) {
  const origin = communitySiteOrigin(env, request);
  const body = {
    ok: true,
    created: !existing,
    existing: !!existing,
    id: listing.id,
    status: listing.status,
    creatorId: acct.id,
    newAccount: !!created,
    tokenIssued: !!token,
    dashboardUrl: token ? dashboardUrl(env, request, token) : null,
    productUrl: `${origin}/community/p/?id=${encodeURIComponent(listing.id)}`,
    productPageLive: listing.status === "approved",
  };
  if (!token) {
    body.dashboardAccess =
      `Manage link was not minted on this call. POST {"action":"issue_creator_token","id":"${listing.id}"} returns dashboardUrl once and rotates any previous link. Or repeat create_listing with "issueToken":true.`;
  }
  return body;
}

async function unlinkContact(kv, email, creatorId, listingIds) {
  const key = "contact:" + email.trim().toLowerCase();
  const row = await kv.get(key, "json");
  if (!row) return;
  if (creatorId && Array.isArray(row.creatorIds)) row.creatorIds = row.creatorIds.filter((x) => x !== creatorId);
  if (Array.isArray(row.listingIds)) row.listingIds = row.listingIds.filter((x) => !listingIds.includes(x));
  await kv.put(key, JSON.stringify(row));
}
