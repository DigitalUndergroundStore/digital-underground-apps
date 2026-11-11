import { fulfillPaidSession, isPaidSession, sessionSku } from "../../_lib/fulfillment.js";
import { getSku } from "../../_lib/store-skus.js";

async function retrieveSession(env, sessionId) {
  const key = env?.STRIPE_SECRET_KEY;
  if (!key) throw new Error("missing_stripe_key");
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    const err = new Error("stripe_retrieve_failed");
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST" } });
  }
  let sessionId = "";
  if (request.method === "GET") {
    sessionId = new URL(request.url).searchParams.get("session_id") || "";
  } else {
    const ctype = request.headers.get("content-type") || "";
    if (ctype.includes("application/json")) {
      const b = await request.json().catch(() => ({}));
      sessionId = b.session_id || "";
    } else {
      const body = await request.text();
      sessionId = new URLSearchParams(body).get("session_id") || "";
    }
  }
  sessionId = String(sessionId).trim();
  if (!sessionId.startsWith("cs_")) {
    return Response.json({ ok: false, error: "missing_session" }, { status: 400 });
  }
  let session;
  try {
    session = await retrieveSession(env, sessionId);
  } catch (e) {
    return Response.json({ ok: false, error: "lookup_failed" }, { status: 502 });
  }
  if (!isPaidSession(session)) {
    return Response.json({ ok: false, error: "not_paid" }, { status: 402 });
  }
  // Re-issuing a token from a confirmed paid session is the re-download path.
  // Email is not sent again here (buyer is already on the thanks page).
  const result = await fulfillPaidSession(env, session, {
    request,
    sendEmail: async () => ({ sent: false, reason: "skipped_on_redownload" }),
  });
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
  return Response.json({
    ok: true,
    sku: result.sku,
    title: (getSku(result.sku) || {}).title || result.sku,
    links: result.links,
    thanks: result.thanksUrl,
  });
}
