import {
  checkRate,
  clientIp,
  getKv,
  json,
  notifySubmission,
  saveListing,
  upsertContact,
  validateSubmission,
  verifyTurnstile,
} from "../../_lib/community.js";
import { screenListing } from "../../_lib/community-screening.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (request.method !== "POST") {
    return json({ error: "Use POST with JSON body." }, 405);
  }

  const ip = clientIp(request);
  if (!checkRate(ip)) {
    return json({ error: "Too many submissions. Try again later." }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const turnstile = await verifyTurnstile(env, body.turnstileToken ?? body["cf-turnstile-response"], ip);
  if (!turnstile.ok) {
    return json({ error: turnstile.error || "Security check failed." }, 400);
  }

  const validated = validateSubmission(body);
  if (validated.error) {
    return json({ error: validated.error }, validated.status || 400);
  }

  const kv = getKv(env);
  if (!kv) {
    return json(
      {
        error:
          "Community storage is not configured yet. Bind COMMUNITY_KV on Cloudflare Pages (see docs/community-marketplace.md).",
      },
      503
    );
  }

  let listing = validated.listing;
  try {
    const screen = await screenListing(env, listing);
    listing.status = screen.decision;
    listing.screening = {
      reasons: screen.reasons,
      detail: screen.detail,
      screenedAt: Date.now(),
    };
  } catch (e) {
    console.error("community screening error", e);
    listing.status = "pending";
    listing.screening = {
      reasons: ["Automatic screening failed; queued for human review."],
      screenedAt: Date.now(),
    };
  }

  try {
    await saveListing(kv, listing);
  } catch (e) {
    console.error("community submit kv error", e);
    return json({ error: "Could not save submission." }, 500);
  }

  try {
    await upsertContact(kv, {
      email: listing.email,
      name: listing.makerName,
      listingId: listing.id,
    });
  } catch (e) {
    console.error("community contact upsert error", e);
  }

  let notify = { sent: false, reason: "not_attempted" };
  try {
    notify = await notifySubmission(env, listing, request);
  } catch (e) {
    console.error("community notify error", e);
    notify = { sent: false, error: "notify_threw" };
  }

  const messages = {
    approved:
      "Thanks — your project passed review and is live on the community marketplace.",
    rejected:
      "Thanks for submitting. This listing did not pass our automated checks. Contact us if you think that is a mistake.",
    pending:
      "Thanks — your project is in the review queue. We will email you when it is live.",
  };

  return json({
    ok: true,
    id: listing.id,
    status: listing.status,
    message: messages[listing.status] || messages.pending,
    notify,
  });
}
