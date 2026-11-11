import { verifyStripeSignature } from "../../_lib/stripe-signature.js";
import { alreadyProcessed, markProcessed, fulfillPaidSession, getKv, isPaidSession } from "../../_lib/fulfillment.js";

export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  }
  const raw = await request.text();
  const sig = request.headers.get("Stripe-Signature") || "";
  const verified = await verifyStripeSignature(raw, sig, env?.STRIPE_WEBHOOK_SECRET);
  if (!verified.ok) {
    return new Response(JSON.stringify({ ok: false, error: verified.error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  let event;
  try { event = JSON.parse(raw); } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad_json" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (event.type && event.type !== "checkout.session.completed") {
    return Response.json({ ok: true, ignored: event.type });
  }
  const kv = getKv(env);
  if (await alreadyProcessed(kv, event.id)) {
    return Response.json({ ok: true, duplicate: true });
  }
  const session = event.data?.object;
  if (!session?.id) {
    return Response.json({ ok: false, error: "missing_session" }, { status: 400 });
  }
  if (!isPaidSession(session)) {
    return Response.json({ ok: true, ignored: "not_paid" });
  }
  const result = await fulfillPaidSession(env, session, { request });
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 500 });
  }
  await markProcessed(kv, event.id);
  return Response.json({ ok: true, sku: result.sku, emailed: !!(result.emailResult && result.emailResult.sent) });
}
