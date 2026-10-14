import {
  buildOverview,
  checkLoginRate,
  contactsToCsv,
  fetchBackupMeta,
  getKv,
  json,
  listAllListings,
  listContacts,
  listSupportMessages,
  markSupportDone,
  mintOwnerSession,
  ownerAuthorized,
  ownerSessionCookie,
  readStats,
  unauthorized,
  verifyOwnerPasscode,
} from "../../_lib/owner.js";
import { clientIp, deleteListing, kvGetIndex, listPending, setListingStatus, kvGetListing, kvPutListing } from "../../_lib/community.js";

const BACKUP_BASE = "https://du-backup.digitalunderground-store.workers.dev";

function pathParts(url) {
  const p = new URL(url).pathname.replace(/^\/api\/owner\/?/, "");
  return p.split("/").filter(Boolean);
}

async function backupFetch(env, path, init = {}) {
  const token = env.BACKUP_ADMIN_TOKEN || env.COMMUNITY_ADMIN_TOKEN;
  const base = env.BACKUP_WORKER_URL || BACKUP_BASE;
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${base}${path}`, { ...init, headers });
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });

  const parts = pathParts(request.url);
  const head = parts[0] || "";

  // ---- login / logout / me (no auth for login) ----
  if (head === "login" && request.method === "POST") {
    const ip = clientIp(request);
    if (!checkLoginRate(ip)) return json({ error: "Too many tries. Wait 15 minutes." }, 429);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON." }, 400);
    }
    const pass = typeof body.passcode === "string" ? body.passcode : "";
    if (!(await verifyOwnerPasscode(env, pass))) {
      return json({ error: "That passcode didn't work." }, 401);
    }
    const sess = await mintOwnerSession(env);
    if (!sess) return json({ error: "Owner login is not configured yet." }, 503);
    return json(
      { ok: true },
      200,
      { "Set-Cookie": ownerSessionCookie(sess) }
    );
  }

  if (head === "logout" && request.method === "POST") {
    return json({ ok: true }, 200, { "Set-Cookie": ownerSessionCookie("", { clear: true }) });
  }

  if (!(await ownerAuthorized(request, env))) return unauthorized();

  const kv = getKv(env);
  if (!kv) return json({ error: "Storage not ready." }, 503);

  if ((head === "me" || head === "") && request.method === "GET") {
    return json({ ok: true, role: "owner" });
  }

  if (head === "overview" && request.method === "GET") {
    try {
      return json(await buildOverview(kv, env));
    } catch (e) {
      console.error("owner overview", e);
      return json({ error: "Could not load overview." }, 500);
    }
  }

  if (head === "queue" && request.method === "GET") {
    const url = new URL(request.url);
    const tab = url.searchParams.get("tab") || "pending";
    if (tab === "all") {
      const listings = await listAllListings(kv);
      return json({ listings });
    }
    const pending = await listPending(kv);
    return json({ pending });
  }

  if (head === "queue" && request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON." }, 400);
    }
    const action = body.action;
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return json({ error: "Missing listing." }, 400);
    if (action === "approve") {
      const row = await setListingStatus(kv, id, "approved");
      return row ? json({ ok: true, listing: row }) : json({ error: "Not found." }, 404);
    }
    if (action === "reject") {
      const row = await setListingStatus(kv, id, "rejected");
      if (!row) return json({ error: "Not found." }, 404);
      if (typeof body.reason === "string" && body.reason.trim()) {
        row.rejectReason = body.reason.trim().slice(0, 500);
        row.updatedAt = Date.now();
        await kvPutListing(kv, row);
      }
      return json({ ok: true, listing: row });
    }
    if (action === "unpublish") {
      const row = await setListingStatus(kv, id, "unpublished");
      return row ? json({ ok: true, listing: row }) : json({ error: "Not found." }, 404);
    }
    if (action === "delete") {
      await deleteListing(kv, id);
      return json({ ok: true, deleted: id });
    }
    return json({ error: "Unknown action." }, 400);
  }

  if (head === "contacts" && request.method === "GET") {
    const url = new URL(request.url);
    const rows = await listContacts(kv);
    if (url.searchParams.get("format") === "csv") {
      return new Response(contactsToCsv(rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="du-contacts.csv"',
          "Cache-Control": "no-store",
        },
      });
    }
    const q = (url.searchParams.get("q") || "").toLowerCase().trim();
    const filtered = q
      ? rows.filter(
          (r) =>
            (r.email || "").includes(q) ||
            (r.name || "").toLowerCase().includes(q) ||
            (r.listingIds || []).join(" ").includes(q)
        )
      : rows;
    return json({ contacts: filtered, total: rows.length });
  }

  if (head === "support" && request.method === "GET") {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "open";
    const messages = await listSupportMessages(kv, { status });
    return json({ messages });
  }

  if (head === "support" && request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON." }, 400);
    }
    if (body.action === "done") {
      const row = await markSupportDone(kv, body.id);
      return row ? json({ ok: true, message: row }) : json({ error: "Not found." }, 404);
    }
    return json({ error: "Unknown action." }, 400);
  }

  if (head === "analytics" && request.method === "GET") {
    const index = await kvGetIndex(kv);
    const ids = [...new Set([...(index.approved || []), ...(index.unpublished || [])])].slice(0, 80);
    const stats = ids.length ? await readStats(kv, ids, 30) : {};
    const listings = [];
    for (const id of ids) {
      const row = await kvGetListing(kv, id);
      const s = stats[id] || { days: [], totals: { i: 0, v: 0, c: 0 } };
      const views = s.totals.v || 0;
      const clicks = s.totals.c || 0;
      listings.push({
        id,
        name: row?.name || id,
        status: row?.status || "?",
        impressions: s.totals.i || 0,
        views,
        clicks,
        ctr: views ? Math.round((clicks / views) * 1000) / 10 : 0,
        days: s.days,
      });
    }
    listings.sort((a, b) => b.views - a.views);
    // Aggregate 30-day chart
    const chart = [];
    for (let i = 0; i < 30; i++) {
      chart.push({ d: "", v: 0, c: 0 });
    }
    if (listings[0]?.days?.length) {
      for (let i = 0; i < listings[0].days.length; i++) {
        chart[i].d = listings[0].days[i].d;
        for (const L of listings) {
          const day = L.days[i];
          if (day) {
            chart[i].v += day.v || 0;
            chart[i].c += day.c || 0;
          }
        }
      }
    }
    return json({ listings, chart });
  }

  if (head === "backups" && request.method === "GET") {
    const url = new URL(request.url);
    if (url.searchParams.get("download") === "1") {
      const res = await backupFetch(env, "/run?email=0", { method: "POST" });
      // Prefer latest snapshot download endpoint
      const snap = await backupFetch(env, "/snapshot/latest");
      if (!snap.ok) {
        const meta = await fetchBackupMeta(env);
        return json({ error: "No snapshot available.", backup: meta }, 404);
      }
      const data = await snap.json();
      const { contactsCsv, listingsJson, date } = data;
      // If worker returns full snapshot, build zip-like JSON response
      if (data.keys) {
        return new Response(JSON.stringify(data), {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="du-backup-${data.date || "latest"}.json"`,
          },
        });
      }
      return json({ date, contactsCsv, listingsJson });
    }
    const res = await backupFetch(env, "/snapshots");
    if (!res.ok) return json({ snapshots: [], error: "Could not list backups." }, res.status);
    return json(await res.json());
  }

  if (head === "backups" && request.method === "POST") {
    let body = {};
    try {
      body = await request.json();
    } catch {
      /* empty */
    }
    const email = body.email ? "1" : "0";
    const res = await backupFetch(env, `/run?email=${email}`, { method: "POST" });
    const text = await res.text();
    try {
      return json(JSON.parse(text), res.status);
    } catch {
      return json({ ok: res.ok, raw: text.slice(0, 200) }, res.status);
    }
  }

  if (head === "backup-download" && request.method === "GET") {
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") || "json";
    const snap = await backupFetch(env, "/snapshot/latest?export=1");
    if (!snap.ok) return json({ error: "No snapshot." }, 404);
    const data = await snap.json();
    if (kind === "csv") {
      const csv = data.contactsCsv || "";
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="du-contacts-${data.date || "latest"}.csv"`,
        },
      });
    }
    const payload = data.listingsJson
      ? data.listingsJson
      : JSON.stringify({ date: data.date, keys: data.keys, keyCount: data.keyCount });
    return new Response(typeof payload === "string" ? payload : JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="du-listings-${data.date || "latest"}.json"`,
      },
    });
  }

  return json({ error: "Not found." }, 404);
}
