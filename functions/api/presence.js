/** POST /api/presence — anonymous live-presence heartbeat (owner-only view).
 * KV presence:{sid} TTL 180s, plus visitor:{hash} TTL 48h for a stable person.
 * Quota-aware: presence writes only when the session is new, changed app/path,
 * or the last write is >100s old. Visitor profiles write at most every 10 min
 * unless the path changed. Bots are ignored. Kerzy origins only beacon kz- apps.
 *
 * Drop-in replacement for the live functions/api/presence.js.
 * Requires functions/_lib/presence.js and the existing functions/_lib/ratelimit.js.
 */
import { clientIp, getKv } from "../_lib/community.js";
import { rateAll, ipRules } from "../_lib/ratelimit.js";
import {
  KZ_ORIGIN,
  commitPresence,
  isBotUa,
  originAppOk,
  parsePresenceBody,
  presenceDecision,
} from "../_lib/presence.js";

const seen = new Map();

function cors(request) {
  const o = request.headers.get("Origin") || "";
  const h = { "Cache-Control": "no-store" };
  if (KZ_ORIGIN.test(o)) {
    Object.assign(h, {
      "Access-Control-Allow-Origin": o,
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    });
  }
  return h;
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: cors(request) });
}

export async function onRequestPost({ request, env }) {
  const ok = new Response(null, { status: 204, headers: cors(request) });
  const origin = request.headers.get("Origin") || "";
  const kv = getKv(env);
  const ua = request.headers.get("User-Agent") || "";
  if (!kv || isBotUa(ua)) return ok;
  let b;
  try {
    b = JSON.parse((await request.text()).slice(0, 1600));
  } catch {
    return ok;
  }
  const parsed = parsePresenceBody(b);
  if (!parsed) return ok;
  const { sid, appId, path, referrer } = parsed;
  if (!originAppOk(origin, appId)) return ok;
  const now = Date.now();
  const decision = await presenceDecision({ kv, sid, appId, path, seen, now });
  if (decision.skip) return ok;
  if (!(await rateAll(env, ipRules("pres", clientIp(request), 20, 600, 5))).ok) return ok;
  await commitPresence({
    kv,
    request,
    ip: clientIp(request),
    ua,
    sid,
    appId,
    path,
    referrer,
    decision,
    seen,
    now,
  });
  return ok;
}
