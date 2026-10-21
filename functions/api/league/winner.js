/** GET /api/league/winner -> { winner } : last finished week's Maker of the Week, or null. */
import { getKv, json } from "../../_lib/community.js";
import { lastWinner } from "../../_lib/league.js";
export async function onRequestGet({ request, env }) {
  const kv = getKv(env);
  let winner = null;
  try { if (kv) winner = await lastWinner(kv, new URL(request.url).origin); } catch (e) { console.error("league winner", e && e.message); }
  return json({ winner }, 200, { "cache-control": "public, max-age=300" });
}
