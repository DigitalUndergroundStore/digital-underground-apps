/**
 * du-backup — daily COMMUNITY_KV snapshots + Monday Resend email.
 * Free Cloudflare Worker; no bot dependency after deploy.
 */

const SNAPSHOT_PREFIX = "snapshot:";
const RETAIN_DAYS = 60;
const CONTACT_PREFIX = "contact:";
const LISTING_PREFIX = "community:item:";
const INDEX_KEY = "community:index";
const SOURCE = "developer-marketplace";
const NOTIFY_TO = "digitalunderground.store@proton.me";
const NOTIFY_FROM = "Digital Underground Backup <onboarding@resend.dev>";

function todayUTC(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function contactsToCsv(rows) {
  const header = ["email", "name", "listing_ids", "first_seen", "last_seen", "source"];
  const lines = [header.join(",")];
  for (const row of rows || []) {
    const ids = Array.isArray(row.listingIds) ? row.listingIds.join(" ") : "";
    lines.push(
      [
        csvEscape(row.email),
        csvEscape(row.name),
        csvEscape(ids),
        csvEscape(row.first_seen),
        csvEscape(row.last_seen),
        csvEscape(row.source || SOURCE),
      ].join(",")
    );
  }
  return lines.join("\n") + "\n";
}

async function listAllKeys(kv, prefix) {
  const names = [];
  let cursor;
  do {
    const page = await kv.list({ prefix, cursor, limit: 1000 });
    for (const key of page.keys || []) {
      names.push(key.name);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return names;
}

async function dumpCommunityKv(kv) {
  const keys = await listAllKeys(kv, "");
  const entries = {};
  for (const name of keys) {
    // Prefer text so we can re-put faithfully; JSON values stay as strings.
    const raw = await kv.get(name, "text");
    entries[name] = raw;
  }
  return { keys: entries, keyCount: keys.length };
}

async function gzipBase64(text) {
  const bytes = new TextEncoder().encode(text);
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  const buf = await new Response(stream).arrayBuffer();
  const u8 = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}

async function writeSnapshot(backupKv, payload) {
  const date = payload.date;
  const key = SNAPSHOT_PREFIX + date;
  const json = JSON.stringify(payload);
  const useGzip = json.length > 800_000;
  if (useGzip) {
    const gz = await gzipBase64(json);
    await backupKv.put(
      key,
      JSON.stringify({
        date,
        createdAt: payload.createdAt,
        encoding: "gzip+base64",
        keyCount: payload.keyCount,
        body: gz,
      })
    );
    return { key, encoding: "gzip+base64", bytes: gz.length, keyCount: payload.keyCount };
  }
  await backupKv.put(key, json);
  return { key, encoding: "json", bytes: json.length, keyCount: payload.keyCount };
}

async function pruneSnapshots(backupKv, keepDays = RETAIN_DAYS) {
  const names = await listAllKeys(backupKv, SNAPSHOT_PREFIX);
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - keepDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  let deleted = 0;
  for (const name of names) {
    const date = name.slice(SNAPSHOT_PREFIX.length);
    if (date < cutoffStr) {
      await backupKv.delete(name);
      deleted += 1;
    }
  }
  return { deleted, kept: names.length - deleted };
}

function extractContactsAndListings(entries) {
  const contacts = [];
  const listings = [];
  let index = null;
  for (const [name, raw] of Object.entries(entries || {})) {
    if (!raw) continue;
    if (name.startsWith(CONTACT_PREFIX)) {
      try {
        const row = JSON.parse(raw);
        if (row && row.email) contacts.push(row);
      } catch {
        /* skip */
      }
    } else if (name.startsWith(LISTING_PREFIX)) {
      try {
        listings.push(JSON.parse(raw));
      } catch {
        /* skip */
      }
    } else if (name === INDEX_KEY) {
      try {
        index = JSON.parse(raw);
      } catch {
        index = raw;
      }
    }
  }
  contacts.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
  listings.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return { contacts, listings, index };
}

async function sendWeeklyEmail(env, { date, contactsCsv, listingsJson }) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "no_resend_key" };

  const to = env.BACKUP_NOTIFY_EMAIL || NOTIFY_TO;
  const from = env.BACKUP_NOTIFY_FROM || NOTIFY_FROM;
  const subject = `Digital Underground weekly backup ${date}`;
  const text = [
    `Weekly Developer Marketplace backup for ${date}.`,
    "",
    `Contacts CSV and listings JSON are attached.`,
    `Daily KV snapshots live in COMMUNITY_BACKUP_KV (last ${RETAIN_DAYS} days).`,
    "",
    "— du-backup worker",
  ].join("\n");

  const toB64 = (s) => {
    const bytes = new TextEncoder().encode(s);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      attachments: [
        { filename: `du-contacts-${date}.csv`, content: toB64(contactsCsv) },
        { filename: `du-listings-${date}.json`, content: toB64(listingsJson) },
      ],
    }),
  });
  const bodyText = await res.text();
  let id = null;
  try {
    id = JSON.parse(bodyText).id || null;
  } catch {
    /* ignore */
  }
  return {
    sent: res.ok,
    status: res.status,
    id,
    detail: res.ok ? undefined : bodyText.slice(0, 300),
  };
}

async function runBackup(env, { forceEmail = false } = {}) {
  if (!env.COMMUNITY_KV || !env.COMMUNITY_BACKUP_KV) {
    throw new Error("COMMUNITY_KV and COMMUNITY_BACKUP_KV bindings are required.");
  }
  const date = todayUTC();
  const createdAt = Date.now();
  const dump = await dumpCommunityKv(env.COMMUNITY_KV);
  const payload = {
    date,
    createdAt,
    source: "COMMUNITY_KV",
    keyCount: dump.keyCount,
    keys: dump.keys,
  };
  const snapshot = await writeSnapshot(env.COMMUNITY_BACKUP_KV, payload);
  const prune = await pruneSnapshots(env.COMMUNITY_BACKUP_KV);

  const { contacts, listings, index } = extractContactsAndListings(dump.keys);
  const contactsCsv = contactsToCsv(contacts);
  const listingsJson = JSON.stringify({ date, index, listings }, null, 2);

  const day = new Date().getUTCDay(); // 0=Sun … 1=Mon
  const shouldEmail = forceEmail || day === 1;
  let email = { sent: false, reason: "not_monday" };
  if (shouldEmail) {
    email = await sendWeeklyEmail(env, { date, contactsCsv, listingsJson });
  }

  return {
    ok: true,
    date,
    snapshot,
    prune,
    contacts: contacts.length,
    listings: listings.length,
    email,
    artifacts: { contactsCsv, listingsJson },
  };
}

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized." }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function adminOk(request, env) {
  const token = env.BACKUP_ADMIN_TOKEN || env.COMMUNITY_ADMIN_TOKEN;
  if (!token) return false;
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return !!(m && m[1].trim() === token);
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      runBackup(env, { forceEmail: false }).then((r) => {
        console.log(
          "du-backup scheduled",
          r.date,
          r.snapshot?.key,
          r.contacts,
          r.listings,
          r.email?.sent
        );
      })
    );
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(
        JSON.stringify({
          service: "du-backup",
          cron: "15 7 * * *",
          endpoints: {
            "POST /run": "Bearer BACKUP_ADMIN_TOKEN — snapshot now",
            "POST /run?email=1": "snapshot + send weekly email now",
          },
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (request.method === "GET" && url.pathname === "/snapshots") {
      if (!adminOk(request, env)) return unauthorized();
      const names = await listAllKeys(env.COMMUNITY_BACKUP_KV, SNAPSHOT_PREFIX);
      const snapshots = names
        .map((n) => ({ key: n, date: n.slice(SNAPSHOT_PREFIX.length) }))
        .sort((a, b) => a.date.localeCompare(b.date));
      return new Response(JSON.stringify({ snapshots }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && (url.pathname === "/snapshot/latest" || url.pathname.startsWith("/snapshot/"))) {
      if (!adminOk(request, env)) return unauthorized();
      let date = url.pathname.slice("/snapshot/".length);
      if (date === "latest" || !date) {
        const names = await listAllKeys(env.COMMUNITY_BACKUP_KV, SNAPSHOT_PREFIX);
        const dates = names.map((n) => n.slice(SNAPSHOT_PREFIX.length)).sort();
        date = dates.length ? dates[dates.length - 1] : "";
      }
      if (!date) {
        return new Response(JSON.stringify({ error: "no_snapshot" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      const raw = await env.COMMUNITY_BACKUP_KV.get(SNAPSHOT_PREFIX + date, "text");
      if (!raw) {
        return new Response(JSON.stringify({ error: "not_found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      let parsed = JSON.parse(raw);
      let full = parsed;
      if (parsed.encoding === "gzip+base64" && parsed.body) {
        const bin = atob(parsed.body);
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("gzip"));
        const text = await new Response(stream).text();
        full = JSON.parse(text);
      }
      const { contacts, listings, index } = extractContactsAndListings(full.keys || {});
      const contactsCsv = contactsToCsv(contacts);
      const listingsJson = JSON.stringify({ date: full.date || date, index, listings }, null, 2);
      if (url.searchParams.get("export") === "1") {
        return new Response(
          JSON.stringify({
            date: full.date || date,
            contactsCsv,
            listingsJson,
            keyCount: full.keyCount,
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify(full), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST" && (url.pathname === "/run" || url.pathname === "/backup")) {
      if (!adminOk(request, env)) return unauthorized();
      const forceEmail =
        url.searchParams.get("email") === "1" || url.searchParams.get("weekly") === "1";
      try {
        const result = await runBackup(env, { forceEmail });
        // Do not echo CSV/JSON bodies in HTTP response
        const { artifacts, ...safe } = result;
        return new Response(JSON.stringify(safe), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("du-backup run error", e);
        return new Response(JSON.stringify({ ok: false, error: "backup_failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response("Not found", { status: 404 });
  },
};
