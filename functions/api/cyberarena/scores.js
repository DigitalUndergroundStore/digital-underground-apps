import { json, kvOf, ipOf, rateOk, kvRateOk, cleanCallsign, computeScore, readBoard, boardKey, publicEntry, youOf, sha, randHex } from "../../_lib/cyberarena.js";

const KEEP = 100;
const int = (v) => (Number.isFinite(+v) ? Math.floor(+v) : NaN);

async function insert(kv, which, entry) {
  const board = (await readBoard(kv, which)).filter((e) => e.pidh !== entry.pidh || e.score > entry.score);
  const mine = board.find((e) => e.pidh === entry.pidh);
  if (!mine) board.push(entry);
  board.sort((a, b) => b.score - a.score || a.at - b.at);
  const out = board.slice(0, KEEP);
  await kv.put(boardKey(which), JSON.stringify(out), which === "weekly" ? { expirationTtl: 21 * 86400 } : {});
  return out;
}

export async function onRequest({ request, env }) {
  const kv = kvOf(env);
  if (!kv) return json({ error: "Scores are offline." }, 503);
  const url = new URL(request.url);
  const which = url.searchParams.get("board") === "weekly" ? "weekly" : "all";

  if (request.method === "GET") {
    const pid = url.searchParams.get("pid") || "";
    const board = await readBoard(kv, which);
    const pidh = pid ? await sha(pid) : "";
    return json({ board: which, top: board.slice(0, 25).map(publicEntry), you: youOf(board, pidh), total: board.length }, 200, pid ? {} : { "Cache-Control": "public, max-age=15" });
  }

  if (request.method === "DELETE") {
    // Players can remove their own entries with their private player id.
    const pid = url.searchParams.get("pid") || "";
    if (pid.length < 16) return json({ error: "Missing player id." }, 400);
    const pidh = await sha(pid);
    let removed = 0;
    for (const w of ["all", "weekly"]) {
      const b = await readBoard(kv, w);
      const nb = b.filter((e) => e.pidh !== pidh);
      if (nb.length !== b.length) { removed += b.length - nb.length; await kv.put(boardKey(w), JSON.stringify(nb), w === "weekly" ? { expirationTtl: 21 * 86400 } : {}); }
    }
    return json({ ok: true, removed });
  }

  if (request.method !== "POST") return json({ error: "Use GET or POST." }, 405);
  const ip = ipOf(request);
  if (!rateOk("score:" + ip, 40, 10 * 60 * 1000) || !(await kvRateOk(kv, "score:" + (await sha(ip)), 150, 3600))) {
    return json({ error: "Too many scores submitted. Try again later." }, 429, { "Retry-After": "600" });
  }
  let b;
  try { b = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }

  const token = String(b.token || "");
  if (!/^[a-f0-9]{48}$/.test(token)) return json({ error: "Missing match token. Start a match first." }, 400);
  const sessKey = `ca:sess:${token}`;
  const sess = await kv.get(sessKey, "json");
  if (!sess) return json({ error: "Match token expired or already used." }, 400);
  await kv.delete(sessKey); // single use

  const cs = cleanCallsign(b.callsign);
  if (cs.error) return json({ error: cs.error }, 400);
  const pid = String(b.pid || "");
  if (pid.length < 16 || pid.length > 64) return json({ error: "Missing player id." }, 400);

  const kills = int(b.kills), deaths = int(b.deaths), streak = int(b.bestStreak), clientTime = int(b.matchTime);
  if ([kills, deaths, streak, clientTime].some((n) => !Number.isFinite(n) || n < 0)) return json({ error: "Invalid stats." }, 400);
  const serverTime = Math.floor((Date.now() - sess.t) / 1000);
  if (clientTime > serverTime + 5) return json({ error: "Match time doesn't add up." }, 422);
  const time = Math.min(clientTime, serverTime, 4 * 3600);
  // A single life ending in death (auto-submit) is a valid run after a few seconds; other runs need 15 s.
  const isLife = b.life === true && deaths === 1;
  if (time < (isLife ? 3 : 15)) return json({ error: isLife ? "Life too short to count." : "Play at least 15 seconds before submitting." }, 422);
  if (b.life === true && deaths !== 1) return json({ error: "A life run has exactly one death." }, 422);
  // Plausibility: bots respawn far away and the fastest weapon needs ~0.6 s per kill, so
  // more than one kill every 2 s is not credible. Respawn takes 3 s.
  if (kills > Math.floor(time / 2) + 1) return json({ error: "Too many kills for the match time." }, 422);
  if (deaths > Math.floor(time / 3) + 1) return json({ error: "Too many deaths for the match time." }, 422);
  if (streak > kills) return json({ error: "Best streak can't exceed kills." }, 422);
  if (kills === 0 && deaths === 0) return json({ error: "Nothing to submit yet. Get a kill first." }, 422);

  const entry = { id: randHex(6), name: cs.name, score: computeScore({ kills, deaths, bestStreak: streak }), kills, deaths, streak, time, at: Date.now(), pidh: await sha(pid) };
  // Zero-point lives are accepted (token consumed) but don't add a row to the board.
  const counted = entry.score > 0;
  const all = counted ? await insert(kv, "all", entry) : await readBoard(kv, "all");
  const weekly = counted ? await insert(kv, "weekly", entry) : await readBoard(kv, "weekly");
  return json({
    ok: true,
    counted,
    submitted: { name: entry.name, score: entry.score, kills, deaths, streak, time },
    all: { top: all.slice(0, 25).map(publicEntry), you: youOf(all, entry.pidh) },
    weekly: { top: weekly.slice(0, 25).map(publicEntry), you: youOf(weekly, entry.pidh) },
  });
}
