#!/usr/bin/env node
/**
 * Restore a COMMUNITY_BACKUP_KV snapshot into COMMUNITY_KV.
 *
 * NEVER auto-runs. Dry-run by default; pass --write to apply.
 *
 * Usage:
 *   node scripts/restore-backup.mjs --date YYYY-MM-DD
 *   node scripts/restore-backup.mjs --date YYYY-MM-DD --write
 *   node scripts/restore-backup.mjs --date YYYY-MM-DD --write --from-file ./snapshot.json
 *
 * Requires wrangler auth (same account as du-backup) and network access.
 * Reads snapshot from COMMUNITY_BACKUP_KV unless --from-file is set.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const ACCOUNT_HINT = "89c87c2f93e2a2f89147d44259d5d542";
const SOURCE_NS = "5e086a24647c419f8ac5577b85a0c651"; // COMMUNITY_KV
const BACKUP_NS = "846affa91d604455bbc6c73cf950b560"; // COMMUNITY_BACKUP_KV
const SNAPSHOT_PREFIX = "snapshot:";

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}
function has(flag) {
  return process.argv.includes(flag);
}

function wrangler(args) {
  const r = spawnSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error(`wrangler ${args.join(" ")} failed (${r.status})`);
  }
  return r.stdout;
}

function decodeSnapshot(raw) {
  const parsed = JSON.parse(raw);
  if (parsed.encoding === "gzip+base64" && parsed.body) {
    const buf = Buffer.from(parsed.body, "base64");
    const json = gunzipSync(buf).toString("utf8");
    return JSON.parse(json);
  }
  if (parsed.keys && typeof parsed.keys === "object") return parsed;
  throw new Error("Unrecognized snapshot shape");
}

async function main() {
  const date = arg("--date");
  const fromFile = arg("--from-file");
  const doWrite = has("--write");
  if (!date && !fromFile) {
    console.error("Usage: node scripts/restore-backup.mjs --date YYYY-MM-DD [--write]");
    process.exit(2);
  }

  let snapshot;
  if (fromFile) {
    snapshot = decodeSnapshot(readFileSync(fromFile, "utf8"));
  } else {
    const key = SNAPSHOT_PREFIX + date;
    console.log(`Fetching ${key} from backup KV ${BACKUP_NS}…`);
    const out = wrangler([
      "kv",
      "key",
      "get",
      key,
      `--namespace-id=${BACKUP_NS}`,
      "--remote",
    ]);
    snapshot = decodeSnapshot(out);
    writeFileSync(`/tmp/du-snapshot-${date}.json`, JSON.stringify(snapshot, null, 2));
    console.log(`Wrote local copy /tmp/du-snapshot-${date}.json`);
  }

  const keys = snapshot.keys || {};
  const names = Object.keys(keys);
  console.log(`Snapshot date=${snapshot.date || date} keys=${names.length} write=${doWrite}`);
  if (!doWrite) {
    console.log("Dry-run only. Re-run with --write to restore into COMMUNITY_KV.");
    console.log(`Target namespace: ${SOURCE_NS} (account ${ACCOUNT_HINT})`);
    process.exit(0);
  }

  let put = 0;
  for (const name of names) {
    const value = keys[name];
    if (value == null) continue;
    // Use temp file for large values
    const tmp = `/tmp/du-restore-val.txt`;
    writeFileSync(tmp, value);
    wrangler([
      "kv",
      "key",
      "put",
      name,
      `--namespace-id=${SOURCE_NS}`,
      "--remote",
      `--path=${tmp}`,
    ]);
    put += 1;
    if (put % 25 === 0) console.log(`… restored ${put}/${names.length}`);
  }
  console.log(`Restored ${put} keys into COMMUNITY_KV.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
