import test from "node:test";
import assert from "node:assert/strict";
import { weekOf, weekEndsAt, prevWeek, isKerzy, rank } from "../../_lib/league.js";
import { onRequestPost, onRequestGet } from "./index.js";

function memKv() {
  const m = new Map();
  return {
    async get(k, t) { const e = m.get(k); return e ? (t === "json" ? JSON.parse(e.v) : e.v) : null; },
    async put(k, v, o = {}) { m.set(k, { v, metadata: o.metadata }); },
    async delete(k) { m.delete(k); },
    async getWithMetadata(k) { const e = m.get(k); return { value: e ? e.v : null, metadata: e ? e.metadata : null }; },
    async list({ prefix }) { return { keys: [...m].filter(([k]) => k.startsWith(prefix)).map(([name, e]) => ({ name, metadata: e.metadata })), list_complete: true }; },
  };
}
const LISTINGS = [
  { id: "cm_a", name: "Alpha", makerName: "Ann" }, { id: "cm_b", name: "Beta", makerName: "Bob" },
  { id: "cm_kerzy_x", name: "Kerzy Game", makerName: "Kerzy Labs" }, { id: "cm_pick_y", name: "Pick", makerName: "X", curated: true }, { id: "cm_du_pw", name: "Pantry Week", makerName: "Digital Underground" },
];
globalThis.fetch = async () => new Response(JSON.stringify({ listings: LISTINGS }));
const UA = "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Safari/604.1";
const vote = (env, id, ip, cookie) => onRequestPost({ env, request: new Request("https://x/api/league", { method: "POST",
  headers: { "content-type": "application/json", "CF-Connecting-IP": ip, "user-agent": UA, ...(cookie ? { cookie: "du_lv=" + cookie } : {}) }, body: JSON.stringify({ id }) }) });

test("weeks run Fri 00:00 to Thu 11:59 PM Toronto; launch week ends Oct 29", () => {
  assert.equal(weekOf(Date.parse("2026-10-23T04:00:00Z")), "2026-10-19");
  assert.equal(weekOf(Date.parse("2026-10-26T12:00:00Z")), "2026-10-19");
  assert.equal(weekOf(Date.parse("2026-10-30T03:59:00Z")), "2026-10-19");
  assert.equal(new Date(weekEndsAt("2026-10-19")).toISOString(), "2026-10-30T04:00:00.000Z");
  assert.equal(weekOf(Date.parse("2026-10-30T04:00:00Z")), "2026-10-30");
  assert.equal(prevWeek("2026-10-30"), "2026-10-19");
  assert.equal(new Date(weekEndsAt("2026-10-30")).toISOString(), "2026-11-06T05:00:00.000Z");
  assert.equal(weekOf(Date.parse("2026-11-06T04:59:00Z")), "2026-10-30");
  assert.equal(prevWeek("2026-11-06"), "2026-10-30");
});

test("Kerzy Labs listings are not eligible", () => {
  assert.ok(isKerzy(LISTINGS[2])); assert.ok(!isKerzy(LISTINGS[0]));
});

test("rank: only real votes, most first", () => {
  assert.deepEqual(rank(LISTINGS, new Map()), []);
  assert.deepEqual(rank(LISTINGS, new Map([["cm_a", 1], ["cm_b", 2]])).map((r) => r.id), ["cm_b", "cm_a"]);
});

test("3 votes per hashed IP, 1 per cookie, Kerzy rejected, empty start", async () => {
  const env = { COMMUNITY_KV: memKv() };
  const g = await (await onRequestGet({ env, request: new Request("https://x/api/league") })).json();
  assert.equal(g.totalVotes, 0); assert.deepEqual(g.standings, []);
  assert.deepEqual(g.eligible.map((l) => l.id), ["cm_a", "cm_b"]);
  assert.equal((await vote(env, "cm_kerzy_x", "1.1.1.1")).status, 400);
  const r1 = await vote(env, "cm_a", "1.1.1.1"); assert.equal(r1.status, 200);
  const ck = r1.headers.get("set-cookie").match(/du_lv=(\w+)/)[1];
  assert.equal((await vote(env, "cm_b", "1.1.1.1", ck)).status, 409, "same cookie blocked");
  assert.equal((await vote(env, "cm_b", "1.1.1.1")).status, 200);
  assert.equal((await vote(env, "cm_b", "1.1.1.1")).status, 200);
  assert.equal((await vote(env, "cm_b", "1.1.1.1")).status, 409, "4th from same IP blocked");
  assert.equal((await vote(env, "cm_a", "2.2.2.2")).status, 200);
  const g2 = await (await onRequestGet({ env, request: new Request("https://x/api/league", { headers: { "CF-Connecting-IP": "9.9.9.9" } }) })).json();
  assert.equal(g2.totalVotes, 4);
});

test("own vote counts even when KV list() lags", async () => {
  const kv = memKv(); const env = { COMMUNITY_KV: kv };
  assert.equal((await vote(env, "cm_a", "3.3.3.3")).status, 200);
  const list = kv.list; kv.list = async () => ({ keys: [], list_complete: true }); // simulate stale list
  const g = await (await onRequestGet({ env, request: new Request("https://x/api/league", { headers: { "CF-Connecting-IP": "3.3.3.3" } }) })).json();
  assert.equal(g.totalVotes, 1); assert.equal(g.standings[0].id, "cm_a");
  kv.list = list;
});
