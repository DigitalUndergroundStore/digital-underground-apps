/**
 * Owner-only CRM ("Contacts" pipeline). Each contact is stored in KV as crm:c:<id>.
 * Auth: same owner session cookie / admin Bearer token as the rest of /api/owner.
 */
import { getKv, json, ownerAuthorized, unauthorized } from "../../../_lib/owner.js";

const PREFIX = "crm:c:";
export const CATEGORIES = ["lead", "maker", "partner", "press", "buyer", "other"];
export const STATUSES = ["new", "contacted", "replied", "interested", "won", "not interested"];
export const LEAD_TYPES = ["cold", "warm", "hot", "vip"];
const FIELDS = ["name", "handle", "email", "website", "source", "category", "status", "leadType", "offer", "lastContact", "nextFollowUp", "notes"];
const MAX = { notes: 5000, source: 500, offer: 300 };

function clean(input, prev) {
  const out = { ...(prev || {}) };
  for (const f of FIELDS) {
    if (input[f] === undefined) continue;
    out[f] = String(input[f] ?? "").trim().slice(0, MAX[f] || 300);
  }
  out.email = (out.email || "").toLowerCase();
  if (!CATEGORIES.includes(out.category)) out.category = "other";
  if (!STATUSES.includes(out.status)) out.status = "new";
  out.leadType = String(out.leadType || "").toLowerCase();
  if (!LEAD_TYPES.includes(out.leadType)) out.leadType = "cold";
  for (const d of ["lastContact", "nextFollowUp"]) if (out[d] && !/^\d{4}-\d{2}-\d{2}$/.test(out[d])) out[d] = "";
  return out;
}

function newId() {
  return Date.now().toString(36) + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

async function listAll(kv) {
  const keys = [];
  let cursor;
  do {
    const r = await kv.list({ prefix: PREFIX, cursor });
    keys.push(...r.keys.map((k) => k.name));
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  const rows = await Promise.all(keys.map((k) => kv.get(k, "json")));
  return rows.filter(Boolean);
}

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? '"' + (/^[=+\-@]/.test(s) ? "'" : "") + s.replace(/"/g, '""') + '"' : s;
}

function toCsv(rows) {
  const cols = ["id", ...FIELDS, "createdAt", "updatedAt"];
  return [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\r\n") + "\r\n";
}

export async function onRequest({ request, env }) {
  if (!(await ownerAuthorized(request, env))) return unauthorized();
  const kv = getKv(env);
  if (!kv) return json({ error: "Storage not ready." }, 503);
  const parts = new URL(request.url).pathname.replace(/^\/api\/owner\/crm\/?/, "").split("/").filter(Boolean);
  const url = new URL(request.url);
  const nocache = { "Cache-Control": "no-store" };

  if (request.method === "GET" && !parts.length) {
    const rows = await listAll(kv);
    rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (url.searchParams.get("format") === "csv") {
      return new Response(toCsv(rows), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="du-crm-contacts.csv"', ...nocache },
      });
    }
    return json({ contacts: rows, total: rows.length, categories: CATEGORIES, statuses: STATUSES, leadTypes: LEAD_TYPES }, 200, nocache);
  }

  if (request.method === "POST" || request.method === "PUT") {
    if (!(request.headers.get("Content-Type") || "").includes("application/json")) return json({ error: "JSON only." }, 415);
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }

    if (parts[0] === "import") {
      const list = Array.isArray(body.contacts) ? body.contacts.slice(0, 500) : [];
      const now = Date.now();
      let n = 0;
      for (const c of list) {
        const id = /^[a-z0-9]{6,32}$/.test(String(c.id || "")) ? c.id : newId();
        const prev = await kv.get(PREFIX + id, "json");
        const row = clean(c, prev);
        row.id = id;
        row.createdAt = prev?.createdAt || now;
        row.updatedAt = now;
        await kv.put(PREFIX + id, JSON.stringify(row));
        n++;
      }
      return json({ ok: true, imported: n });
    }

    const c = body.contact || body;
    const id = parts[0] || c.id;
    let prev = null;
    if (id) {
      if (!/^[a-z0-9]{6,32}$/.test(String(id))) return json({ error: "Bad id." }, 400);
      prev = await kv.get(PREFIX + id, "json");
      if (!prev) return json({ error: "Not found." }, 404);
    }
    const row = clean(c, prev);
    if (!row.name && !row.email && !row.handle) return json({ error: "Add a name, email or handle." }, 400);
    row.id = id || newId();
    row.createdAt = prev?.createdAt || Date.now();
    row.updatedAt = Date.now();
    await kv.put(PREFIX + row.id, JSON.stringify(row));
    return json({ ok: true, contact: row });
  }

  if (request.method === "DELETE" && parts[0]) {
    if (!/^[a-z0-9]{6,32}$/.test(parts[0])) return json({ error: "Bad id." }, 400);
    await kv.delete(PREFIX + parts[0]);
    return json({ ok: true, deleted: parts[0] });
  }

  return json({ error: "Not found." }, 404);
}
