# Backup manifest — 2026-11-11

Branch: `backup/2026-11-11`  
Base (unchanged): `24c91f1fc2ebf0f04b1540b96537a9c09a8da6a9` (detached HEAD at backup start)  
GitHub repo: `DigitalUndergroundStore/digital-underground-apps` — **PUBLIC** (`isPrivate: false`)  
Also targeted: Cursor Origin remote `origin-cursor` (`origin.cursor.com/donald-stelling/digital-underground-apps`)  
This backup does **not** change production, the deploy lock, `release.sh` behavior, or any existing branch. No force-push, no history rewrite.

Created: 2026-11-11 afternoon, America/Toronto (EST, UTC-5).

## Current production and rollback chain

Live site: https://digitalundergroundstore.com  
Cloudflare Pages project: `digital-underground` (`af58f2ec-a60d-4452-8f8b-4baca1ab08b2`), account `89c87c2f93e2a2f89147d44259d5d542`.

**Current production (newest):**

| Field | Value |
| --- | --- |
| pages_id | `7f1db2cf` |
| digest / output_manifest | `782e51a1c594da9e7c33333f6862e03049c004b99c73e2c59fe201b891082577` |
| source_manifest | `b65b730e1a855f1acf02b2d8b4ccd888ffb3502f5b0ba8648c0a1b5dd77cf1eb` |
| functions_digest | `1fdb93e661cbbf212c97cce6fc1d9f3989d186a5af54f0052fc9e35376c6c349` |
| worker_sha | `039edb4ea14f1b30b3771720a439982975fcb6e82ad320432095b2f37d14c233` |
| deployed_at | 2026-11-11, 11:41:35 AM EST (America/Toronto); `2026-11-11T16:41:35Z` |

**Rollback chain** (each row rolls back to the previous production publish):

| pages_id | digest | deployed_at (America/Toronto) | notes |
| --- | --- | --- | --- |
| `7f1db2cf` | `782e51a1c594da9e7c33333f6862e03049c004b99c73e2c59fe201b891082577` | 11:41:35 AM EST, 2026-11-11 | Stripe convert batch 3 (Packlane, Streak Kit, Launch Ledger). Rollback target: `0130203e` |
| `0130203e` | `3691d436283192390fbf593ffa6a3a62cb517276888758ef2459cf966a58e6c9` | 11:36:20 AM EST, 2026-11-11 | Stripe convert batch 2 (Invoice Desk, Focus Gate, Box & Go). Rollback: `d48c7e67` |
| `d48c7e67` | `8df1e53bfd71a0453912076a85ba872382d3ea70f3fae9124206ce8ff80ac564` | 11:33:09 AM EST, 2026-11-11 | Stripe convert batch 1 (Reply Forge page swap, Scope Lock, Rate Wire). Rollback: `23f792f7` |
| `23f792f7` | `fc5a6333f6dbcae81a201e8210944efbbc48a0d71b4a0d2ff043f5b902b96b31` | 11:19:53 AM EST, 2026-11-11 | Reply Forge backend only. Rollback: `a7d98847` |
| `a7d98847` | `9a3f80897a8fc11bca018bcbc9123d1b02c8cfb846d22f77cdd08bc493aa5bd3` | 11:16:14 AM EST, 2026-11-11 | He Came Home page swap. Rollback: `69679ed0` |
| `69679ed0` | `7fd039e5a538ee6c53eb812a5b8216ec6da07ae072c0b77ccff5562b441abcfa` | 10:29:30 AM EST, 2026-11-11 | He Came Home backend. |
| `c9f80788` | `f311a6f805e41c7bcc963720563dc2baf0e801548c3400e339e5f9d894f8af4f` | 10:23:31 AM EST, 2026-11-11 | Null Harbor page swap |
| `bba34658` | `459ae298e5de46508443ec6459d779f3d39e2df11cc4e538effe8bc85b301b3a` | 10:18:51 AM EST, 2026-11-11 | Download-binding fix (same digest also recorded as `caef59a1` 10:06:42 AM and `01c61a34` 10:09:15 AM EST) |
| `2aab0561` | `805e6400103a56c2dfb73de974558a0f45d887254f960c60b6383a83d93deba4` | 9:40:07 AM EST, 2026-11-11 | Maker Pro v4 |
| `adbefe95` | `f9107879ef2d52051735af34db2de1866e8eb7a7831aa7f630f3e948aa9e43dd` | 9:18:12 AM EST, 2026-11-11 | Mass-batch junk cleanup |

Full deploy log (31 publishes from 2026-11-06 through current) and per-publish receipts: `_backup/du-releases-metadata/`.

## Lock / pin (must not be changed by this backup)

These hashes were verified unchanged at backup time:

- `/workspace/du-good/.du-deploy-blocked` sha256 `433fea1d4727151c276e1c2f8ab3ed26f165c96e17be9b997a9174de31e4420f` (box copy also at `/workspace/stripe-nov11/du-deploy-blocked.433fea1d`)
- `scripts/release.sh` sha256 `17f2f70a00d123c3b5d999f75aed622e04d9a5e2da148f75aa65718314fa807b` (lasting DOWNLOADS_KV-pin version; box copy `/workspace/stripe-nov11/release.sh.with-downloadskv-pin`)
- `scripts/pages-bindings.toml` sha256 `9ada0c822df2d48dcff0bfe465be1c2a1cc366aeb07806b620919b2c7673aeb0`

Do not restore `/workspace/stripe-nov11/release.sh.before-exception` as current. Production publishes stay on `scripts/release.sh` with a reviewed sealed digest. The lock file is committed here only as a record of state; it was not removed or edited.

## What this branch includes

- The `/workspace/du-good` worktree at backup time: site HTML, functions, scripts (including pinned `release.sh` and `pages-bindings.toml`), docs (`DEPLOY.md`, `LOCK.md`, `CREDENTIALS.md` policy — no literal secrets), lock marker, and other uncommitted public-site work. Already-tracked historical binaries (e.g. Hook-Bank zip, Humanity-X zip) remain as they were in `24c91f1f`.
- `_backup/stripe-nov11/` — this week’s Stripe / Gumroad conversion plan, catalog CSV/JSON, allowlists, publish/rollback notes, pilot functions and tests, screenshots, Stripe product/price/payment-link IDs (no secret keys). Live promo/coupon *codes* were stripped from the copies of `stripe-ids.json` / `stripe-ids.txt`. SHA256 checksums of product files are under `_backup/stripe-nov11/product-file-hashes/` (checksums only, not the files).
- `_backup/du-releases-metadata/` — compact copy of `.du-releases/deploy-log.txt`, receipts, and known-good digest/receipt/sha256 lists (not the 31 GB release trees).
- `_backup/digital-underground-brand/` — logos, avatar, banner, wordmark, and other files from `/workspace/digital-underground/brand/` (3 MB).
- `_backup/x-strategy-nov9/` — Nov 9 X strategy report and listing snapshot (120 KB).
- `_backup/kerzylabs-brand/` — Kerzy Labs logo/screens/build script (7.7 MB).

## What was excluded, and where it still lives

GitHub is **public**, so secrets and paid product deliverables stay off this branch.

| Item | Why excluded | Where it still is (box / KV) |
| --- | --- | --- |
| `.du-releases/` (~31 GB) | Huge local release snapshots (baseline/candidate/staged/known-good trees) | `/workspace/du-good/.du-releases/` on the box. Metadata only is in `_backup/du-releases-metadata/`. |
| `node_modules/`, logs, `backups/`, `.wrangler/`, `dist/`, `__pycache__/` | Regeneratable / noise | Local worktree and existing `backups/` gitignore |
| `.env*`, `.dev.vars*`, `secrets/`, `**/.secrets/`, `*.key`, `*.pem` | Secrets and keys | e.g. `/workspace/stripe-nov11/null-harbor-pilot/.secrets/` (`DOWNLOAD_SIGNING_SECRET`, `STRIPE_WEBHOOK_SECRET`, mode 0600). Runtime secrets remain in Cloudflare Pages (not copied). |
| `/workspace/stripe-nov11/gumroad-raw.json` (6.2 MB) | Raw Gumroad API dump; not safe for a public repo | `/workspace/stripe-nov11/gumroad-raw.json` on the box only |
| Paid product files (epub/pdf/zip/docx) under stripe-nov11 `files/`, `files-to-upload/`, `fixtures/` | Proprietary buyer deliverables | Box paths under `/workspace/stripe-nov11/**/files/` and `**/files-to-upload/`; confirmed Oct 7 sources under `/workspace/digital-underground/fixed/_gumroad-backup-oct7/<gid>/delivered/`; live binaries also in Workers KV namespace `du-product-files` (`28ce144531b14fb28d48977050e2a8ec`, binding `DOWNLOADS_KV`). Checksums are in this branch. |
| Untracked `tools/**/*.zip` kit zips in the du-good worktree | New product-like binaries; repo is public. Already-tracked zips were left in history. | `/workspace/du-good/tools/<kit>/<kit>.zip` on the box |
| `/workspace/stripe-nov11/null-harbor-pilot/stripe-promo.txt` and `promo_code` / `coupon_id` fields | Live (or leftover) checkout promo codes must not be published | Originals remain on the box under `/workspace/stripe-nov11/` only |
| `/workspace/digital-underground` except `brand/` (~4.7 GB: gumroad backup, fixed deliverables, kdp-upload, promo/marketing dumps) | Too large / contains product files | `/workspace/digital-underground/` on the box |

## Follow-up needed

- **Private backup of proprietary product files.** The public GitHub repo must not hold paid deliverables. A private archive (private repo, encrypted volume, or off-box drive) should cover: stripe-nov11 `files/` and `files-to-upload/`, Oct 7 `delivered/` copies, untracked `tools/**/*.zip` if those kits should be preserved, and `gumroad-raw.json` if it still has operational value (keep it private).
- Secrets stay in Pages / the box `.secrets/` files — do not copy them into git, even a private repo, unless that repo is tightly access-controlled and the files stay unreadable in logs.
- Cursor Origin (`origin-cursor`) may need an authenticated git credential if HTTPS push fails (`could not read Username for https://origin.cursor.com`).

## Scan policy used before each commit

Staged text was scanned for `sk_live_`, `rk_live_`, `sk_test_`, `rk_test_`, `whsec_`, Resend `re_` keys, Cloudflare token assignments, Stripe secret assignments, GitHub tokens, `AKIA`, and private-key blocks. Hits had to be false positives (e.g. test fixture `whsec_` words, `$CLOUDFLARE_*` env var references) or the file was unstaged. Secret values are not recorded in this document.
