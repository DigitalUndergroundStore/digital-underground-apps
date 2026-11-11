# Null Harbor Phase 2 — evidence (KV storage)

Written: 2026-11-11 10:11 AM EST (America/Toronto).
Authorized by Donald (“It's done” / Go, [pt2094u]). R2 abandoned after error 10042; file storage is Workers KV.

## Result

Phase 2 A–D completed. Fulfillment functions and `/thanks/` are live on production. The live Null Harbor product page was **not** swapped (Gumroad Buy remains). The Stripe payment link was **not** published on the site.

Current production:
- pages_id: `01c61a34`
- alias: https://01c61a34.digital-underground.pages.dev
- digest: `459ae298e5de46508443ec6459d779f3d39e2df11cc4e538effe8bc85b301b3a`
- functions_digest: `ab373fe9c52cf5a5d201b1b15208813aefbf4b2924dbb25d322ff06f50bab179`
- worker_sha: `f1d8cde915ddd272ed3fb126fd1b76936c87e903c3b27b60f455d86c58ab7315`
- deployed_at: 2026-11-11 10:09:15 AM EST (America/Toronto) (`2026-11-11T15:09:15Z`)

Prior same-digest publish (before `STRIPE_WEBHOOK_SECRET` was available to the worker): pages_id `caef59a1` at 2026-11-11 10:06:42 AM EST (`2026-11-11T15:06:42Z`).

Rollback target remains Maker Pro v4: pages_id `2aab0561`, digest `805e6400103a56c2dfb73de974558a0f45d887254f960c60b6383a83d93deba4`.

## Freeze restored

- `.du-deploy-blocked` sha256 `433fea1d4727151c276e1c2f8ab3ed26f165c96e17be9b997a9174de31e4420f`
- `scripts/release.sh` sha256 `cf317e372c2f816dfb32cfaa0f26fff9764a50f8b193617e081ea225742e5761`

A temporary `assert_store_unchanged` exception was applied only during the two gated deploys: compare staged `store/` to current known-good (must be identical), not the Nov 6 BASE (which still contains pre-cleanup store files). No store files were allowlisted or changed. The exception was reverted immediately after each deploy.

## A. KV namespace, files, secrets, bindings

- New dedicated KV namespace (not reused): title `du-product-files`, id `28ce144531b14fb28d48977050e2a8ec`, binding name `DOWNLOADS_KV`.
- `COMMUNITY_KV` (`5e086a24647c419f8ac5577b85a0c651`) left in place for webhook idempotency only. Product files are not stored there.
- Uploaded keys and sha256 round trip (GET bytes match source):
  - `null-harbor/Null-Harbor.epub` 748,033 bytes sha256 `c6a2ee47ffcfda1aed2f6e186374efbd1781502894bed925fd854f23f82c145c`
  - `null-harbor/Null-Harbor.pdf` 279,857 bytes sha256 `8e6ce34166c4092e54ba96586f5842f7355d946b8f0d14b3b0b9d9cccc725656`
- Local pilot tests (`node tests/pilot.test.mjs`) all passed, including `e2e download sha256` (downloaded bytes equal source).
- Pages production secrets added (values never printed; existing Resend secrets were not overwritten):
  - `STRIPE_SECRET_KEY`
  - `DOWNLOAD_SIGNING_SECRET` (randomly generated)
  - `STRIPE_WEBHOOK_SECRET` (after the webhook endpoint existed)
- Confirmed still present after every PATCH: `RESEND_API_KEY`, `COMMUNITY_NOTIFY_FROM`.

### Binding overwrite (important for the next deploy)

`scripts/pages-bindings.toml` only lists `COMMUNITY_KV`. `wrangler pages deploy` (via `release.sh`) sent those bindings and dropped `DOWNLOADS_KV` from the project. The binding was re-PATCHed after the final deploy, and a GET confirmed:

- `COMMUNITY_KV` → `5e086a24647c419f8ac5577b85a0c651`
- `DOWNLOADS_KV` → `28ce144531b14fb28d48977050e2a8ec`

Any future `release.sh` deploy will drop `DOWNLOADS_KV` again unless `pages-bindings.toml` (and its pinned `BINDINGS_SHA` in `release.sh`) is updated first, or the binding is re-PATCHed immediately after publish. Do not deploy again until that is handled — downloads would 503.

## B. Gated publish (functions + `/thanks/` only)

Allowlist: `ALLOWLIST-PHASE2.txt` (new `_lib` helpers, `/api/stripe/webhook`, `/api/store/download`, `/api/store/session-download`, `thanks/index.html`). The Null Harbor store page was not in the allowlist and was not published.

### Verification

Unsigned POST `/api/stripe/webhook` (no `Stripe-Signature`):
- After webhook secret was live: **400** `{"ok":false,"error":"bad_header"}` on both `digitalundergroundstore.com` and `01c61a34.digital-underground.pages.dev`.
- (Before the secret pickup deploy the same request correctly returned 400 `missing_secret`.)

Signed test (HMAC of a fake `checkout.session.completed` with `payment_status=unpaid`, not a real session): **200** `{"ok":true,"ignored":"not_paid"}` on production and the `01c61a34` alias. Signature verification works; no fulfillment or email was sent.

Unchanged pages — byte-identical on Pages aliases vs rollback `2aab0561.digital-underground.pages.dev`:

| path | status | sha256 (new `01c61a34` == old `2aab0561`) |
|---|---|---|
| `/` | 200 | `31483cd1944543b5c05ab47e5b60d47425530df8db3f29fbe34d2f934b4fad96` |
| `/store/` | 200 | `8d72661dd26491e19202e05fd6c0a89add72cd70eeabff458204ec22c2383ab8` |
| `/store/p/null-harbor/` | 200 | `86f2a87452eddb0a59b19d4999736b1a4d3c317168ca1236ff35013051f00cf8` |

Production custom-domain HTML differs from the aliases only by Cloudflare email obfuscation (`mailto:` rewritten / `[email protected]`). Content is the same.

Live Null Harbor page: Gumroad Buy (`https://kerzy.gumroad.com/l/jcazp`) still present. No `buy.stripe.com` / payment-link URL on the page.

`/thanks/` is **200** on production (new page; 404 on the `2aab0561` alias).

## C. Stripe webhook

- Endpoint id: `we_1Uad7vRAOyy6tigLTbfz5MPL`
- URL: `https://digitalundergroundstore.com/api/stripe/webhook`
- Event: `checkout.session.completed` only
- livemode: true, status: enabled
- Created: 2026-11-11 10:07 AM EST (America/Toronto)
- `STRIPE_WEBHOOK_SECRET` stored in Pages production secrets (never printed). Redeployed via gated `release.sh` to `01c61a34` so the worker picked it up. Signed test above succeeded afterward.

## D. Single-use $0 test coupon

- Coupon id: `3x4nh6MB` — 100% off, duration `once`, `max_redemptions=1`, livemode, times_redeemed=0 at creation, name `NH $0 test (single use)`.
- Promotion code id: `promo_1UadAoRAOyy6tigLeN1T4t45`
- **Promotion code: `NH0-EL34H8GUQ3`** (max_redemptions=1, active, times_redeemed=0 at creation). OK to share in this chat. Do not post it publicly.
- Payment link `plink_1UacocRAOyy6tigLzypb4Gme` remains active; `allow_promotion_codes=true`. URL (do **not** publish on the site or Buffer/X): `https://buy.stripe.com/bJe6oJ65CfJveoS2me0ZW04`

The code is not locked to `kerzydon@gmail.com` (Stripe promotion codes cannot be easily restricted to that address here). It is single-use, so the first successful redemption consumes it.

## What Donald should do for the $0 test

1. Open `https://buy.stripe.com/bJe6oJ65CfJveoS2me0ZW04` (private; not linked from the live store page).
2. Use email **kerzydon@gmail.com**.
3. Apply promotion code **NH0-EL34H8GUQ3**. Total should go to $0.
4. Complete checkout. Stripe should redirect to `https://digitalundergroundstore.com/thanks/?sku=null-harbor&session_id={CHECKOUT_SESSION_ID}`.

### What he will see

- Stripe Checkout for Null Harbor at $4.99, with a promotion-code field; after the code is applied the amount due is $0.
- After completion, the `/thanks/` page titled “Thank you — Digital Underground”, with a “Your download” section. If the webhook has already fulfilled, the page can also re-issue download links via `/api/store/session-download?session_id=…` without sending a second email.

### Email to expect

- From: `Digital Underground <notify@digitalundergroundstore.com>`
- To: `kerzydon@gmail.com`
- Subject: `Your Null Harbor download`
- Body: thank-you text, two 72-hour signed links (Null-Harbor.epub and Null-Harbor.pdf), a pointer back to the thanks page to refresh links after expiry, and contact `digitalunderground.store@proton.me`.

A 100% off session is treated as paid (`payment_status` `paid` / `complete` / `no_payment_required`). After this test, the promotion code is spent.

## Out of scope (not done)

- Live Null Harbor page was not swapped to Stripe. Gumroad remains the public Buy button.
- Payment link was not added to the site, Buffer, or X.

## Download binding fix (2026-11-11 10:18:51 AM EST, America/Toronto)

Donald’s $0 checkout and fulfillment email worked, but `/api/store/download` returned plain text `Downloads are not configured yet.` (503). The handler reads `env.DOWNLOADS_KV` and returns that message when the binding is missing.

Diagnosis:
- Endpoint name is correct: `DOWNLOADS_KV`.
- Project-level `deployment_configs.production.kv_namespaces` already had `DOWNLOADS_KV` → `du-product-files` `28ce144531b14fb28d48977050e2a8ec` (the post-deploy PATCH from Phase 2).
- The **running deployment** did not. `01c61a34` (and `caef59a1`) had only `COMMUNITY_KV`. Wrangler `pages deploy` takes bindings from `scripts/pages-bindings.toml` (copied to upload-root `wrangler.toml`) and writes them onto the deployment; a later project PATCH does not attach the binding to an already-published deployment.

Fix:
- Added `DOWNLOADS_KV` / `28ce144531b14fb28d48977050e2a8ec` to `scripts/pages-bindings.toml` (sha256 `9ada0c822df2d48dcff0bfe465be1c2a1cc366aeb07806b620919b2c7673aeb0`).
- Updated `BINDINGS_SHA` in `scripts/release.sh` to that digest, and added prepare_upload greps so a future deploy refuses if `DOWNLOADS_KV` or the namespace id is missing.
- Temporary store-assert exception (compare to known-good, no store changes) only for this publish; reverted immediately after.
- Gated `release.sh deploy` of the same sealed digest (no page or function source changes; Gumroad page untouched).

New production:
- pages_id: `bba34658`
- alias: https://bba34658.digital-underground.pages.dev
- digest unchanged: `459ae298e5de46508443ec6459d779f3d39e2df11cc4e538effe8bc85b301b3a`
- functions_digest unchanged: `ab373fe9c52cf5a5d201b1b15208813aefbf4b2924dbb25d322ff06f50bab179`
- deployed_at: 2026-11-11 10:18:51 AM EST (America/Toronto) (`2026-11-11T15:18:51Z`)
- Deployment `kv_namespaces`: `COMMUNITY_KV` → `5e086a24647c419f8ac5577b85a0c651`, `DOWNLOADS_KV` → `28ce144531b14fb28d48977050e2a8ec`

Verification (fresh signed tokens minted locally; tokens and secrets not printed), 200 on both production and the `bba34658` alias:
- epub: `Content-Type: application/epub+zip`, 748,033 bytes, sha256 `c6a2ee47ffcfda1aed2f6e186374efbd1781502894bed925fd854f23f82c145c`
- pdf: `Content-Type: application/pdf`, 279,857 bytes, sha256 `8e6ce34166c4092e54ba96586f5842f7355d946b8f0d14b3b0b9d9cccc725656`

`/`, `/store/`, `/store/p/null-harbor/` still byte-identical to rollback alias `2aab0561`. Live Buy button still Gumroad. `/thanks/` 200. Unsigned webhook still 400 `bad_header`.

Freeze:
- Lock restored: `433fea1d4727151c276e1c2f8ab3ed26f165c96e17be9b997a9174de31e4420f`
- `release.sh` is **not** returned to `cf317e37…` — that backup predates the DOWNLOADS_KV pin and would fail `require_wrangler_pin` (or drop the binding on the next stage/deploy). Lasting sha256: `17f2f70a00d123c3b5d999f75aed622e04d9a5e2da148f75aa65718314fa807b` (backup: `/workspace/stripe-nov11/release.sh.with-downloadskv-pin`).

Donald’s existing 72-hour email/thanks links should work now without a new checkout.

## Null Harbor page swap (2026-11-11 10:23:31 AM EST, America/Toronto)

Authorized by Donald (“Works”, [pt2096u]). Published `page-swap/null-harbor.index.html` → `store/p/null-harbor/index.html` only. Dirty `assets/site-nav/site-nav.css` was not allowlisted or staged (staged tree CSS sha matched known-good).

Pre-publish re-diff vs known-good / live `bba34658` source: only checkout copy and URLs changed.
- Both Buy buttons (hero + sticky) and JSON-LD `Offer.url` point to `https://buy.stripe.com/bJe6oJ65CfJveoS2me0ZW04` (price still 4.99 USD, InStock).
- Related-product Gumroad links unchanged (`ygwhif`, `bukwxo`, `efouck`, `vlaqmh`, `vzfysf`).
- Previous Gumroad Null Harbor URL kept only in an HTML rollback comment, not as a live `href`.
- Stripe payment link `plink_1UacocRAOyy6tigLzypb4Gme` remains active, `allow_promotion_codes=true`, `restrictions=null`. Promotion codes are enabled but not required; the link is not limited to the $0 test coupon.

Gated `release.sh` publish with a one-file temporary store exception (only `store/p/null-harbor/index.html` may differ from known-good; `forbidden_path` allowed that path only). Exception reverted immediately after deploy. `DOWNLOADS_KV` pin kept (`pages-bindings.toml` sha256 `9ada0c822df2d48dcff0bfe465be1c2a1cc366aeb07806b620919b2c7673aeb0`, `release.sh` restored to `17f2f70a00d123c3b5d999f75aed622e04d9a5e2da148f75aa65718314fa807b`). Lock restored: `433fea1d4727151c276e1c2f8ab3ed26f165c96e17be9b997a9174de31e4420f`.

New production:
- pages_id: `c9f80788`
- alias: https://c9f80788.digital-underground.pages.dev
- digest: `f311a6f805e41c7bcc963720563dc2baf0e801548c3400e339e5f9d894f8af4f`
- functions_digest unchanged: `ab373fe9c52cf5a5d201b1b15208813aefbf4b2924dbb25d322ff06f50bab179`
- deployed_at: 2026-11-11 10:23:31 AM EST (`2026-11-11T15:23:31Z`)
- Deployment `kv_namespaces`: `COMMUNITY_KV` → `5e086a24647c419f8ac5577b85a0c651`, `DOWNLOADS_KV` → `28ce144531b14fb28d48977050e2a8ec`

Rollback target is now `bba34658` (digest `459ae298e5de46508443ec6459d779f3d39e2df11cc4e538effe8bc85b301b3a`).

Verification:
- Live `/store/p/null-harbor/` 200 on production and `c9f80788`. Both Buy buttons and JSON-LD offer URL are the Stripe payment link. No live `href` to `kerzy.gumroad.com/l/jcazp`.
- `/` and `/store/` byte-identical on `c9f80788` vs prior `bba34658` aliases (sha256 `31483cd1944543b5c05ab47e5b60d47425530df8db3f29fbe34d2f934b4fad96` and `8d72661dd26491e19202e05fd6c0a89add72cd70eeabff458204ec22c2383ab8`).
- Fresh signed `/api/store/download` 200 on production and the new alias: epub `application/epub+zip` 748,033 bytes sha256 `c6a2ee47ffcfda1aed2f6e186374efbd1781502894bed925fd854f23f82c145c`; pdf `application/pdf` 279,857 bytes sha256 `8e6ce34166c4092e54ba96586f5842f7355d946b8f0d14b3b0b9d9cccc725656`.
- Unsigned webhook still 400 `bad_header`.
