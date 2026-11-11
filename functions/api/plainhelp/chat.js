/**
 * PlainHelp Ai relay — licensed buyers get AI with no personal API key.
 * Verifies Gumroad license, rate-limits per key, runs Cloudflare Workers AI.
 */
const PRODUCT_ID = "7B2ojeO8ghmsuaqetQ6JRg==";
const MODELS = [
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.2-3b-instruct",
  "@cf/meta/llama-3.1-8b-instruct-fast",
];
const DAILY_LIMIT = 80; // fair use per license / UTC day
const MAX_MESSAGES = 20;
const MAX_CONTENT = 4000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const J = (obj, status = 200) =>
  Response.json(obj, { status, headers: { ...cors, "Cache-Control": "no-store" } });

async function verifyLicense(key) {
  const body = new URLSearchParams({
    product_id: PRODUCT_ID,
    license_key: key,
    increment_uses_count: "false",
  });
  const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
    method: "POST",
    body,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }
  if (!data || !data.success) return { ok: false, error: "That license key isn't valid for PlainHelp Ai." };
  const p = data.purchase || {};
  if (p.refunded || p.chargebacked || (p.disputed && !p.dispute_won)) {
    return { ok: false, error: "This license is no longer active." };
  }
  return { ok: true };
}

function dayKey(license) {
  const day = new Date().toISOString().slice(0, 10);
  const safe = String(license).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
  return `plainhelp:quota:${day}:${safe}`;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors });
}

export async function onRequestPost({ request, env }) {
  if (!env || !env.AI) return J({ ok: false, error: "AI isn't available right now. Try again shortly." }, 503);

  let body = {};
  try {
    body = await request.json();
  } catch (_) {
    return J({ ok: false, error: "Bad request." }, 400);
  }

  const license = String(body.license || "").trim();
  if (license.length < 8) return J({ ok: false, error: "Paste your PlainHelp license key first." }, 401);

  const messagesIn = Array.isArray(body.messages) ? body.messages : [];
  if (!messagesIn.length) return J({ ok: false, error: "Nothing to answer." }, 400);

  // Verify license (short KV cache to spare Gumroad)
  const kv = env.COMMUNITY_KV;
  const licCacheKey = `plainhelp:lic:${license.slice(0, 48)}`;
  let licensed = false;
  if (kv) {
    try {
      const hit = await kv.get(licCacheKey);
      if (hit === "1") licensed = true;
    } catch (_) {}
  }
  if (!licensed) {
    let v;
    try {
      v = await verifyLicense(license);
    } catch (_) {
      return J({ ok: false, error: "Couldn't check your license. Try again in a moment." }, 502);
    }
    if (!v.ok) return J({ ok: false, error: v.error }, 401);
    licensed = true;
    if (kv) {
      try {
        await kv.put(licCacheKey, "1", { expirationTtl: 6 * 3600 });
      } catch (_) {}
    }
  }

  // Daily fair-use quota
  if (kv) {
    const qk = dayKey(license);
    let used = 0;
    try {
      used = parseInt((await kv.get(qk)) || "0", 10) || 0;
    } catch (_) {
      used = 0;
    }
    if (used >= DAILY_LIMIT) {
      return J({
        ok: false,
        error: "You've reached today's fair-use limit for AI answers. Timers and notes still work — try again tomorrow.",
        limit: DAILY_LIMIT,
      }, 429);
    }
    try {
      await kv.put(qk, String(used + 1), { expirationTtl: 48 * 3600 });
    } catch (_) {}
  }

  const system = {
    role: "system",
    content:
      "You are PlainHelp Ai, a calm phone helper for seniors and people new to tech. " +
      "Use very plain English. Short answers (1–3 sentences) unless they ask for steps. " +
      "No jargon, markdown, or emoji. Be warm and patient. If you don't know, say so.",
  };

  const messages = [system];
  for (const m of messagesIn.slice(-MAX_MESSAGES)) {
    const role = m.role === "assistant" ? "assistant" : "user";
    const content = String(m.content || "").trim().slice(0, MAX_CONTENT);
    if (content) messages.push({ role, content });
  }
  if (messages.length < 2) return J({ ok: false, error: "Nothing to answer." }, 400);

  let out = null;
  let usedModel = "";
  let lastErr = "";
  for (const model of MODELS) {
    try {
      out = await env.AI.run(model, { messages, max_tokens: 400 });
      usedModel = model;
      break;
    } catch (e) {
      lastErr = (e && e.message) ? String(e.message).slice(0, 120) : "run failed";
      out = null;
    }
  }
  if (!out) {
    return J({ ok: false, error: "The AI had a hiccup. Try once more.", detail: lastErr || undefined }, 502);
  }

  const text =
    (out && (out.response || out.result || out.text)) ||
    (typeof out === "string" ? out : "") ||
    "";
  const reply = String(text).trim();
  if (!reply) return J({ ok: false, error: "No answer came back. Try again." }, 502);

  return J({ ok: true, reply, model: usedModel || "plainhelp-relay" });
}
