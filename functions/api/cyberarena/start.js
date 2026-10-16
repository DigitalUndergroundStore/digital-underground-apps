import { json, kvOf, ipOf, rateOk, randHex } from "../../_lib/cyberarena.js";
// POST /api/cyberarena/start -> one-shot match token (valid 4 hours, single use).
export async function onRequest({ request, env }) {
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  const kv = kvOf(env);
  if (!kv) return json({ error: "Scores are offline." }, 503);
  if (!rateOk("start:" + ipOf(request), 30, 10 * 60 * 1000)) return json({ error: "Too many matches started. Try again soon." }, 429, { "Retry-After": "600" });
  const token = randHex(24);
  const startedAt = Date.now();
  await kv.put(`ca:sess:${token}`, JSON.stringify({ t: startedAt }), { expirationTtl: 4 * 3600 });
  return json({ token, startedAt });
}
