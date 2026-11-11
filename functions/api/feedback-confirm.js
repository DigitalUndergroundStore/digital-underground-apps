// One-click feedback confirmation. No login. Token is single-use and expires in 48 hours.
import { getKv } from "../_lib/community.js";
import { consumeConfirmToken, isPrefetchRequest } from "../_lib/feedback-verify.js";

const HEADERS = { "Content-Type": "text/html; charset=utf-8", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

function page(msg, s = 200) {
  return new Response(
    `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex><title>Confirm feedback · Digital Underground</title><body style="font-family:system-ui;background:#05040c;color:#eee;display:grid;place-items:center;min-height:90vh;text-align:center;padding:20px"><div><h1>Digital Underground</h1><p>${msg}</p><p><a style="color:#9d8cff" href="/">Back to the site</a></p></div>`,
    { status: s, headers: HEADERS }
  );
}

async function confirm({ request, env }) {
  const kv = getKv(env);
  if (!kv) return page("This link is not available right now. Please try again in a few minutes.", 503);
  const token = new URL(request.url).searchParams.get("t") || "";
  if (request.method === "GET" && isPrefetchRequest(request)) {
    return page("Open this link in your browser to confirm you sent this feedback.");
  }
  const r = await consumeConfirmToken(kv, token);
  if (r.ok) return page("Thank you. Your feedback has been confirmed.");
  if (r.error === "expired") return page("This confirmation link has expired. Please send your feedback again if you still need to reach us.", 410);
  return page("This confirmation link is invalid or has already been used.", 400);
}

export const onRequestGet = confirm;
export const onRequestPost = confirm;
export const onRequest = ({ request, env }) => {
  if (request.method === "GET" || request.method === "POST") return confirm({ request, env });
  return page("This link only works as a confirmation.", 405);
};
