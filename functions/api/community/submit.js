import {
  checkRate,
  clientIp,
  getKv,
  json,
  notifySubmission,
  savePendingListing,
  validateSubmission,
  verifyTurnstile,
} from "../../_lib/community.js";

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

  try {
    await savePendingListing(kv, validated.listing);
  } catch (e) {
    console.error("community submit kv error", e);
    return json({ error: "Could not save submission." }, 500);
  }

  try {
    await notifySubmission(env, validated.listing);
  } catch (e) {
    console.error("community notify error", e);
  }

  return json({
    ok: true,
    id: validated.listing.id,
    message:
      "Thanks — your project is in the review queue. We will email you when it is live (if we have mail configured).",
  });
}
