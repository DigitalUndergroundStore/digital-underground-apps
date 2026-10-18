/**
 * du-ratelimit: Durable Object rate limiter used by the Digital Underground Pages Functions.
 * POST {limit, window} to an object named after the limit key -> {ok, count, retryAfter}.
 * Reached over workers.dev by the Pages Functions with a shared bearer token (RL_TOKEN secret on both sides);
 * the Pages project's bindings are managed in the dashboard, so no direct DO binding is used.
 */
export class RateLimiter {
  constructor(ctx) { this.ctx = ctx; this.state = null; }
  async fetch(request) {
    const { limit, window } = await request.json();
    const w = Math.max(1, Math.min(86400, Number(window) || 60));
    const now = Date.now();
    const win = Math.floor(now / (w * 1000));
    if (!this.state) this.state = (await this.ctx.storage.get("s")) || { win: -1, n: 0 };
    if (this.state.win !== win) this.state = { win, n: 0 };
    const over = this.state.n >= limit;
    if (!over) {
      this.state.n += 1; // blocked requests don't write
      await this.ctx.storage.put("s", this.state);
      const end = (win + 1) * w * 1000;
      const cur = await this.ctx.storage.getAlarm();
      if (!cur || cur < end) await this.ctx.storage.setAlarm(end + 1000);
    }
    const retryAfter = Math.max(1, Math.ceil(((win + 1) * w * 1000 - now) / 1000));
    return Response.json({ ok: !over, count: this.state.n + (over ? 1 : 0), retryAfter });
  }
  async alarm() {
    // Window over: drop state so idle keys leave no storage behind.
    this.state = null;
    await this.ctx.storage.deleteAll();
  }
}

function safeEq(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/hit") return new Response("Not found", { status: 404 });
    const auth = request.headers.get("Authorization") || "";
    if (!env.RL_TOKEN || !safeEq(auth, "Bearer " + env.RL_TOKEN)) return new Response("Unauthorized", { status: 401 });
    let b;
    try { b = await request.json(); } catch { return new Response("Bad request", { status: 400 }); }
    const key = String(b.key || "").slice(0, 200);
    const limit = Math.max(1, Math.min(100000, Number(b.limit) || 1));
    const window = Math.max(1, Math.min(86400, Number(b.window) || 60));
    if (!key) return new Response("Bad request", { status: 400 });
    const stub = env.RL.get(env.RL.idFromName(`${key}|${window}`));
    return stub.fetch("https://rl/hit", { method: "POST", body: JSON.stringify({ limit, window }) });
  },
};
