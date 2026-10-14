# Community marketplace

Link-out listings at `/community/` and submissions at `/community/submit/`. No payments through Digital Underground.

## Live URLs

- Browse: https://digitalundergroundstore.com/community/
- Submit: https://digitalundergroundstore.com/community/submit/
- Moderation UI: https://digitalundergroundstore.com/community/admin.html
- APIs: `/api/community/listings`, `/api/community/submit`, `/api/community/admin`

## Storage

Primary: **Cloudflare KV** binding `COMMUNITY_KV`.

- Index key: `community:index` (`pending`, `approved`, `rejected` id arrays)
- Listing key: `community:item:{id}` (JSON)

Optional static seed: `community/listings.json` (approved listings only; merged with KV on read).

### First-time Cloudflare setup

1. Create a KV namespace: `npx wrangler kv namespace create COMMUNITY_KV`
2. Put the returned id in `wrangler.toml` under `[[kv_namespaces]]` → `id` (and `preview_id` for preview).
3. In **Cloudflare Pages** → project **digital-underground** → **Settings** → **Functions** → **KV namespace bindings**, add binding name `COMMUNITY_KV` to that namespace (production + preview).
4. **Workers AI** binding: variable name `AI` (add `[ai]` in `wrangler.toml`; mirror in Pages → Settings → Functions → **Workers AI**).
5. **Environment variables** (encrypted):
   - `COMMUNITY_ADMIN_TOKEN` — long random string for moderation API and signed email links
   - Optional: `TURNSTILE_SECRET_KEY` + set `siteKey` in `community/turnstile-config.json` (never commit the secret)
   - Optional: `RESEND_API_KEY`, `COMMUNITY_NOTIFY_FROM`, `COMMUNITY_NOTIFY_EMAIL` (defaults to digitalunderground.store@proton.me)
   - Optional: `COMMUNITY_MAILCHANNELS=1` and `COMMUNITY_MAIL_FROM` (MailChannels; requires DNS on your domain)
   - Optional: `COMMUNITY_SITE_URL` (origin for email moderation links)

Redeploy after bindings change.

## Automated screening

On `POST /api/community/submit`, Pages Functions run:

1. **Rules** — blocklist (adult, scam, crypto pump, gambling, malware, piracy, drugs, weapons), https project URL, live URL must return 2xx.
2. **Workers AI** — `@cf/meta/llama-guard-3-8b` on listing text; `@cf/llava-hf/llava-1.5-7b-hf` on logo/cover image.
3. **Outcome** — clean → `approved` (live); clear violations → `rejected` with reasons; uncertain or AI errors → `pending`.

Donald gets one email per submission (when mail is configured) with the result and 7-day signed **Approve** / **Reject** links (`GET /api/community/moderate-link`).

## Moderation

1. Open `/community/admin.html`, paste `COMMUNITY_ADMIN_TOKEN`, click **Load pending**.
2. **Approve** — listing appears on `/community/` via API.
3. **Reject** — stays out of the public grid.
4. **Delete** — removes record and index entry (use for spam or test data).

Agents may also approve by calling:

```bash
curl -X POST https://digitalundergroundstore.com/api/community/admin \
  -H "Authorization: Bearer $COMMUNITY_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"approve","id":"cm_..."}'
```

List pending: `GET /api/community/admin` with the same Bearer token.

## Spam controls

- Honeypot field `website` on submit form
- Rate limit: 8 submissions / hour / IP
- Turnstile when `TURNSTILE_SECRET_KEY` and `turnstile-config.json` site key are set

## Mail

If `RESEND_API_KEY` is not set, submissions are stored only (no email).

## Creator dashboard (`/community/dashboard/`)

- **Access:** on submit, a per-creator manage token (`ca_….<secret>`) is generated; only SHA-256(secret) is stored at `creator:{id}`. The confirmation screen shows the private link `/community/dashboard/?k=…` with a copy button. API auth: `Authorization: Creator <token>` (constant-time compare, generic 401).
- **Admin backfill / lost link:** `POST /api/community/admin {"action":"issue_creator_token","id":"cm_…"}` creates or rotates the link (old link stops working) and returns it once.
- **Email magic link (off):** `POST /api/community/creator-login`. Enable with env `COMMUNITY_MAGIC_LINK=1` only after a sending domain is verified in Resend and `COMMUNITY_NOTIFY_FROM` uses it. Response is identical whether or not the email exists.
- **Creator API:** `GET/POST /api/community/creator` — list, `edit` (re-screened with the same rules as new submissions), `unpublish`, `republish` (re-screened), `delete`, `support` (Resend → COMMUNITY_NOTIFY_EMAIL, reply-to = listing email, 5/creator/UTC day). Edits: 20/listing/day + 30 writes/IP/hour.
- **Analytics:** `POST /api/community/track {i,v,c}`; one KV key per UTC day `stats:YYYYMMDD` (1 write per beacon). Impressions once per listing per browser session; detail views (`/community/p/?id=`) and Visit clicks exact. KV free tier = 1,000 writes/day, so heavy traffic (>~700 beacons/day) would start to fail writes (counts drop silently, site unaffected).

## Backups (du-backup Worker)

Free, self-running Cloudflare Worker (`workers/du-backup`) — no bot required after deploy.

| Piece | Detail |
|-------|--------|
| Source | `COMMUNITY_KV` (`worker-du-community`, id `5e086a24647c419f8ac5577b85a0c651`) — listings, contacts, creator/stats keys |
| Destination | `COMMUNITY_BACKUP_KV` (`worker-du-community-backup`, id `846affa91d604455bbc6c73cf950b560`) |
| Schedule | Cron `15 7 * * *` (07:15 UTC daily) |
| Snapshot key | `snapshot:YYYY-MM-DD` (plain JSON, or gzip+base64 wrapper if large) |
| Retention | Last **60** daily snapshots; older pruned automatically |
| Monday email | Resend → store inbox with contacts CSV + listings JSON attachments; subject `Digital Underground weekly backup YYYY-MM-DD` |
| From | `onboarding@resend.dev` (override with `BACKUP_NOTIFY_FROM`) |

### Secrets on the Worker

- `RESEND_API_KEY` (required for Monday email)
- `BACKUP_ADMIN_TOKEN` or reuse `COMMUNITY_ADMIN_TOKEN` (Bearer for `POST /run`)
- Optional: `BACKUP_NOTIFY_EMAIL`, `BACKUP_NOTIFY_FROM`

### Manual snapshot / test email

```bash
cd workers/du-backup
npx wrangler deploy   # from repo; uses wrangler 3
curl -sS -X POST "https://du-backup.<workers.dev>/run?email=1" \
  -H "Authorization: Bearer $BACKUP_ADMIN_TOKEN"
```

Local scheduled test: `npx wrangler dev --test-scheduled` (from `workers/du-backup`).

### Restore (admin only — never auto-runs)

```bash
node scripts/restore-backup.mjs --date YYYY-MM-DD          # dry-run
node scripts/restore-backup.mjs --date YYYY-MM-DD --write  # apply into COMMUNITY_KV
```

Contacts CSV export (live admin): `GET /api/community/admin?action=contacts` with Bearer admin token.
