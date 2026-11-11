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
import { listSubscribers, subscribersToCsv } from "../../_lib/subscribers.js";
import { readShareStats } from "../../_lib/share-track.js";
import { clientIp, deleteListing, kvGetIndex, listPending, setListingStatus, kvGetListing, kvPutListing, notifyMakerApproved } from "../../_lib/community.js";
import { promotePendingVideo as _ppv } from "../../_lib/community.js";
import { getReports, ownerReportView, resolveReport } from "../../_lib/reports.js";

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
  // Passcode login removed: the owner session is minted by _middleware.js after
  // HTTP Basic Auth on /owner/. Reload /owner/ to get a session.
  if (head === "login" && request.method === "POST") {
    return json({ error: "Passcode login removed. Reload /owner/ to sign in." }, 410);
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

  if (head === "subscribers" && request.method === "GET") {
    const rows = await listSubscribers(kv);
    if (new URL(request.url).searchParams.get("format") === "csv") {
      return new Response(subscribersToCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=subscribers.csv", "Cache-Control": "no-store" } });
    }
    return json({ total: rows.length, active: rows.filter(r => r.status === "subscribed").length, subscribers: rows.map(({ unsub, ...r }) => r) });
  }

  if (head === "overview" && request.method === "GET") {
    try {
      return json(await buildOverview(kv, env));
    } catch (e) {
      console.error("owner overview", e);
      return json({ error: "Could not load overview." }, 500);
    }
  }

  if (head === "assign" && request.method === "POST") {
    let body; try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
    const { assignListingsToEmail } = await import("../../_lib/creator.js");
    const ids = Array.isArray(body.listingIds) ? body.listingIds : String(body.listingIds || "").split(/[\s,]+/);
    const r = await assignListingsToEmail(kv, body.email, ids);
    return json(r, r.error ? 400 : 200);
  }

  if (head === "makers") {
    const { listPendingProfiles, approveProfile, rejectProfile, validSlug } = await import("../../_lib/makers.js");
    if (request.method === "GET") return json({ pending: await listPendingProfiles(kv) });
    if (request.method === "POST") {
      let body; try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
      if (!validSlug(body.slug)) return json({ error: "Missing maker." }, 400);
      const r = body.action === "approve_profile" ? await approveProfile(kv, body.slug)
        : body.action === "reject_profile" ? await rejectProfile(kv, body.slug, body.reason) : undefined;
      if (r === undefined) return json({ error: "Unknown action." }, 400);
      if (!r) return json({ error: "Nothing pending for that maker." }, 404);
      return json({ ok: true });
    }
  }

  // Reported listings: flagged (auto-hidden) first, then open reports below the threshold.
  if (head === "reports" && request.method === "GET") {
    const m = await getReports(kv);
    const order = { flagged: 0, open: 1, removed: 2, restored: 3 };
    const reports = Object.values(m).map(ownerReportView).sort((a, b) => (order[a.state] ?? 9) - (order[b.state] ?? 9) || (b.flaggedAt || 0) - (a.flaggedAt || 0));
    return json({ reports });
  }
  if (head === "reports" && request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id || !["restore", "remove", "dismiss"].includes(body.action)) return json({ error: "Use restore, remove or dismiss with an id." }, 400);
    const r = await resolveReport(kv, id, body.action);
    return r ? json({ ok: true, report: r }) : json({ error: "No reports for this listing." }, 404);
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
    if (action === "approve_revision" || action === "reject_revision") {
      const row = await kvGetListing(kv, id);
      if (!row || !row.pendingRevision) return json({ error: "No edit waiting on this listing." }, 404);
      let drop = null;
      if (action === "approve_revision") {
        const f = row.pendingRevision.fields || {};
        const { uploadVid } = await import("../../_lib/video.js");
        if (f.videoUrl !== undefined && f.videoUrl !== row.videoUrl) { drop = uploadVid(row.videoUrl); row.videoUrl = f.videoUrl; delete row.videoFile; }
        for (const k of ["name", "projectUrl", "visitUrl", "pitchShort", "descriptionLong", "tags", "imageUrl"]) if (f[k] !== undefined) row[k] = f[k];
        row.revisedAt = Date.now();
      }
      delete row.pendingRevision;
      row.updatedAt = Date.now();
      await kvPutListing(kv, row);
      if (drop) { const { deleteVideo } = await import("../../_lib/video.js"); await deleteVideo(kv, drop).catch(() => {}); }
      return json({ ok: true, listing: row });
    }
    if (action === "approve_video" || action === "reject_video") {
      const row = await kvGetListing(kv, id);
      if (!row || !row.pendingVideo) return json({ error: "No video waiting on this listing." }, 404);
      const { deleteVideo, uploadVid } = await import("../../_lib/video.js");
      let drop = null;
      if (action === "approve_video") drop = _ppv(row);
      else { drop = uploadVid(row.pendingVideo.url); delete row.pendingVideo; }
      row.updatedAt = Date.now();
      await kvPutListing(kv, row);
      if (drop) await deleteVideo(kv, drop).catch(() => {});
      return json({ ok: true, listing: row });
    }
    if (action === "approve") {
      const before = await kvGetListing(kv, id);
      const row = await setListingStatus(kv, id, "approved");
      if (row) await notifyMakerApproved(env, kv, row, request, before?.status || "");
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
      chart.push({ d: "", i: 0, v: 0, c: 0 });
    }
    if (listings[0]?.days?.length) {
      for (let i = 0; i < listings[0].days.length; i++) {
        chart[i].d = listings[0].days[i].d;
        for (const L of listings) {
          const day = L.days[i];
          if (day) {
            chart[i].i += day.i || 0;
            chart[i].v += day.v || 0;
            chart[i].c += day.c || 0;
          }
        }
      }
    }
    let shares = null;
    try {
      shares = await readShareStats(kv, 40);
    } catch (e) {
      console.error("share stats", e);
    }
    return json({ listings, chart, shares });
  }

  if (head === "apikeys") {
    const { listAllKeys, ownerRevoke } = await import("../../_lib/apikeys.js");
    if (request.method === "POST") {
      let b = {}; try { b = await request.json(); } catch {}
      if (!(await ownerRevoke(kv, String(b.keyId || "")))) return json({ error: "Key not found." }, 404);
      return json({ ok: true });
    }
    return json({ keys: await listAllKeys(kv) });
  }

  if (head === "presence" && request.method === "GET") {
    const { ownerPresence } = await import("../../_lib/presence.js");
    return json(await ownerPresence(kv));
  }

  if (head === "health" && request.method === "GET") {
    const H = await import("../../_lib/health.js");
    const { utcDay } = await import("../../_lib/creator.js");
    const origin = new URL(request.url).origin;
    const t0 = Date.now();
    const [probes, errors, subs, supAll, backup, idx, todayStats, reports] = await Promise.all([
      H.runProbes(origin),
      H.readErrors(kv, 14),
      listSubscribers(kv),
      listSupportMessages(kv, { status: "all" }),
      fetchBackupMeta(env),
      kvGetIndex(kv),
      kv.get("storestats:" + utcDay(), "json"),
      kv.get("community:reports", "json"),
    ]);
    const writes = (todayStats && todayStats.n) || 0;
    const backupAgeDays = backup.lastSnapshot ? Math.floor((Date.now() - Date.parse(backup.lastSnapshot + "T00:00:00Z")) / 864e5) : null;
    return json({
      at: Date.now(), elapsedMs: Date.now() - t0,
      probes, errors,
      subscribers: H.subscriberSummary(subs),
      feedback: H.feedbackSummary(supAll),
      sampling: { writesToday: writes, softCap: H.SOFT_CAP, sample: H.SAMPLE, active: writes >= H.SOFT_CAP },
      backup: { ...backup, ageDays: backupAgeDays },
      queue: { pending: (idx.pending || []).length, flagged: Object.values(reports || {}).filter((e) => e && e.state === "flagged").length },
    });
  }

  if (head === "storestats" && request.method === "GET") {
    const { readStoreStats } = await import("../../_lib/storestats.js");
    return json(await readStoreStats(kv, 30));
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
