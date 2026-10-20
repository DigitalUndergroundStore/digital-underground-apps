// du-games: tiny realtime relay for Digital Underground browser games.
// GET /quick?game=bb|qp      -> { room }  (auto-matchmaking: joins a waiting room or opens one)
// GET /new?game=..           -> { room }  (private room code)
// GET /ws?game=..&room=CODE  -> WebSocket. Server assigns seats, relays messages between players.
import { DurableObject } from "cloudflare:workers";

const GAMES = { bb: 2, qp: 4 };            // seats per room
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ALLOWED = [/^https:\/\/(www\.)?digitalundergroundstore\.com$/, /^https:\/\/[a-z0-9-]+\.digital-underground\.pages\.dev$/, /^https:\/\/([a-z0-9-]+\.)?kerzylabs-[a-z0-9-]+\.pages\.dev$/,
  /^https:\/\/([a-z0-9-]+\.)?itch\.zone$/, /^https:\/\/([a-z0-9-]+\.)?itch\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, /^null$/];
const okOrigin = (o) => !o || ALLOWED.some((r) => r.test(o));
const cors = (o) => ({ "Access-Control-Allow-Origin": o && okOrigin(o) ? o : "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "no-store" });
const J = (obj, o, s = 200) => new Response(JSON.stringify(obj), { status: s, headers: { "Content-Type": "application/json", ...cors(o) } });
const code = () => { let s = ""; const a = crypto.getRandomValues(new Uint8Array(4)); for (const b of a) s += CODE_CHARS[b % CODE_CHARS.length]; return s; };
const validRoom = (r) => /^[A-Z0-9]{4}$/.test(r || "");

export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get("Origin");
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
    if (!okOrigin(origin)) return J({ error: "origin not allowed" }, origin, 403);
    const game = url.searchParams.get("game");
    if (url.pathname === "/" ) return J({ ok: true, service: "du-games" }, origin);
    if (!GAMES[game]) return J({ error: "unknown game" }, origin, 400);
    if (url.pathname === "/new") return J({ room: code() }, origin);
    if (url.pathname === "/quick") {
      const lobby = env.LOBBY.get(env.LOBBY.idFromName("lobby-" + game));
      return J(await lobby.match(game, GAMES[game]), origin);
    }
    if (url.pathname === "/scores") {
      const board = (url.searchParams.get("board") || "main").replace(/[^a-z0-9-]/gi, "").slice(0, 20);
      const st = env.LOBBY.get(env.LOBBY.idFromName("board-" + game + "-" + board));
      if (req.method === "POST") {
        let b; try { b = await req.json(); } catch { return J({ error: "bad json" }, origin, 400); }
        const ip = req.headers.get("CF-Connecting-IP") || "";
        return J(await st.submit(String(b.name || "Player"), Number(b.score), ip), origin);
      }
      return J({ top: await st.top() }, origin);
    }
    if (url.pathname === "/ws") {
      const room = (url.searchParams.get("room") || "").toUpperCase();
      if (!validRoom(room)) return J({ error: "bad room" }, origin, 400);
      if (req.headers.get("Upgrade") !== "websocket") return J({ error: "expected websocket" }, origin, 426);
      const stub = env.ROOM.get(env.ROOM.idFromName(game + ":" + room));
      return stub.fetch(new Request("https://room/ws?cap=" + GAMES[game] + "&game=" + game + "&room=" + room, req));
    }
    return J({ error: "not found" }, origin, 404);
  },
};

export class Lobby extends DurableObject {
  // waiting: { room, seats, at }
  async match(game, cap) {
    const now = Date.now();
    let w = (await this.ctx.storage.get("w")) || null;
    if (w && (now - w.at > 45000 || w.seats >= cap)) w = null;
    if (!w) { w = { room: code(), seats: 0, at: now }; }
    w.seats += 1; w.at = now;
    await this.ctx.storage.put("w", w.seats >= cap ? null : w);
    return { room: w.room, quick: true };
  }
}

// Lobby class also stores leaderboards (one instance per game+board).
Lobby.prototype.top = async function () { return (await this.ctx.storage.get("top")) || []; };
Lobby.prototype.submit = async function (name, score, ip) {
  if (!Number.isFinite(score) || score <= 0 || score > 5e7) return { error: "bad score" };
  const now = Date.now(), rl = (await this.ctx.storage.get("rl:" + ip)) || 0;
  if (now - rl < 5000) return { error: "slow down" };
  await this.ctx.storage.put("rl:" + ip, now);
  name = name.replace(/[^\w .\-]/g, "").trim().slice(0, 16) || "Player";
  let top = (await this.ctx.storage.get("top")) || [];
  const ex = top.find((r) => r.name.toLowerCase() === name.toLowerCase());
  if (ex) { if (score > ex.score) { ex.score = Math.round(score); ex.at = now; } } else top.push({ name, score: Math.round(score), at: now });
  top.sort((a, b) => b.score - a.score); top = top.slice(0, 25);
  await this.ctx.storage.put("top", top);
  return { ok: true, rank: top.findIndex((r) => r.name === name) + 1, top };
};

export class Room extends DurableObject {
  async fetch(req) {
    const u = new URL(req.url), cap = Math.min(4, Math.max(2, +u.searchParams.get("cap") || 2));
    const taken = new Set(this.ctx.getWebSockets().map((ws) => ws.deserializeAttachment()?.seat));
    let seat = -1; for (let i = 0; i < cap; i++) if (!taken.has(i)) { seat = i; break; }
    const pair = new WebSocketPair(); const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    if (seat < 0) { server.send(JSON.stringify({ t: "full" })); server.close(4001, "room full"); return new Response(null, { status: 101, webSocket: client }); }
    const name = (u.searchParams.get("name") || "").slice(0, 16);
    server.serializeAttachment({ seat, name });
    server.send(JSON.stringify({ t: "hello", seat, cap, room: u.searchParams.get("room") }));
    this.roster();
    return new Response(null, { status: 101, webSocket: client });
  }
  roster() {
    const seats = this.ctx.getWebSockets().map((ws) => ws.deserializeAttachment()).filter((a) => a && a.seat >= 0).map((a) => ({ seat: a.seat, name: a.name || "" }));
    const host = seats.length ? Math.min(...seats.map((s) => s.seat)) : -1;
    this.broadcast(JSON.stringify({ t: "roster", seats, host }));
  }
  broadcast(msg, except) { for (const ws of this.ctx.getWebSockets()) if (ws !== except) { try { ws.send(msg); } catch {} } }
  async webSocketMessage(ws, raw) {
    if (typeof raw !== "string" || raw.length > 16384) return;
    const a = ws.deserializeAttachment(); if (!a) return;
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === "name") { a.name = String(m.name || "").slice(0, 16); ws.serializeAttachment(a); this.roster(); return; }
    if (m.t === "ping") { ws.send(JSON.stringify({ t: "pong", at: m.at })); return; }
    const out = JSON.stringify({ t: "m", from: a.seat, d: m.d });
    if (typeof m.to === "number") { for (const o of this.ctx.getWebSockets()) if (o.deserializeAttachment()?.seat === m.to) o.send(out); }
    else this.broadcast(out, ws);
  }
  async webSocketClose(ws) { try { ws.close(); } catch {} ws.serializeAttachment(null); this.roster(); }
  async webSocketError(ws) { ws.serializeAttachment(null); this.roster(); }
}
