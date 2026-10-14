# du-backup

Free Cloudflare Worker that backs up Developer Marketplace data from `COMMUNITY_KV`.

## Schedule

- **Daily 07:15 UTC** — snapshot every key into `COMMUNITY_BACKUP_KV` as `snapshot:YYYY-MM-DD` (gzip+base64 when large). Keeps **60 days**.
- **Mondays** (same cron) — emails contacts CSV + listings JSON via Resend to the store inbox.

## Manual run

```bash
cd workers/du-backup
npx wrangler deploy
curl -X POST "https://du-backup.<account>.workers.dev/run?email=1" \
  -H "Authorization: Bearer $BACKUP_ADMIN_TOKEN"
```

Or: `npx wrangler dev --test-scheduled` (local).

## Restore

See `scripts/restore-backup.mjs` (dry-run by default; never auto-runs).

```bash
node scripts/restore-backup.mjs --date 2026-10-14
node scripts/restore-backup.mjs --date 2026-10-14 --write
```
