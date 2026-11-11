# Null Harbor Stripe pilot — Phase 1 (build and test only)

Time: 2026-11-11 morning America/Toronto (EST)
Status: Built and unit-tested. Not deployed. Live Gumroad Buy buttons unchanged. No Stripe webhook endpoint created.

## Stripe objects (live account, not on the site)

Created via API with the live secret (not printed). Tax code used: `txcd_10302001` (Stripe Tax “E-books”), which Stripe accepted (better fit than generic `txcd_10000000`).

- product `prod_VbqVrKv8CckQrC` — Null Harbor
- price `price_1UacoZRAOyy6tigLOQZV2We6` — $4.99 USD one-time, tax_behavior exclusive
- payment link `plink_1UacocRAOyy6tigLzypb4Gme` — active, metadata `sku=null-harbor`, automatic tax on
- URL `https://buy.stripe.com/bJe6oJ65CfJveoS2me0ZW04`
- after_completion redirect: `https://digitalundergroundstore.com/thanks/?sku=null-harbor&session_id={CHECKOUT_SESSION_ID}`

Do not share that link until webhook, R2 files, and the thanks page are live: a payment today would charge and only send a Stripe receipt, not the book. Maker Pro and tip products were not changed. Founding link stays inactive from the earlier v4 work.

## Code (isolated copy — `/workspace/stripe-nov11/null-harbor-pilot/`)

- Webhook `functions/api/stripe/webhook.js`: `checkout.session.completed`, Stripe signature verify (`STRIPE_WEBHOOK_SECRET`), idempotent via `COMMUNITY_KV` key `stripe:evt:<id>`.
- Signed 72-hour download tokens and `GET /api/store/download?t=&file=`.
- Re-download: thank-you page + `GET /api/store/session-download?session_id=` (looks up the paid session, does not send a second email).
- Delivery email from `notify@digitalundergroundstore.com` (Resend) with signed file links and `/thanks/?sku=null-harbor`.
- Thank-you page at `thanks/index.html`.
- Page swap (not published) at `page-swap/null-harbor.index.html`.

The shared `/workspace/du-good` tree was not modified. `store/p/null-harbor/index.html` still matches known-good (Gumroad).

## Tests

`node tests/pilot.test.mjs` — all passed:

- Signature: valid, tampered body, wrong secret, expired timestamp, missing header
- Tokens: valid, expired, tampered, wrong secret
- Idempotency: KV mark/get
- Local e2e with a fake signed `checkout.session.completed` event: one Resend email, second delivery returns `duplicate` and does not email again, download returns fixture bytes, expired token is 403

## Needed from Donald before publish

1. Approve Cloudflare secrets and the R2 bucket / `DOWNLOADS_BUCKET` binding in `CLOUDFLARE-SETUP.md`, and uploading the v2 EPUB+PDF to those keys.
2. After those are live, approve creating the Stripe webhook endpoint (not created now) and storing `STRIPE_WEBHOOK_SECRET`.
3. A **single-use / max_redemptions=1** 100% off coupon (or a $0 price) for a live test purchase. Do not make a public forever-free coupon.
4. Confirm notify@ can send, and that he wants USD $4.99 with automatic tax (product tax code e-books).
5. A go-ahead to run the gated `release.sh` publish in `RELEASE-PLAN.md` (one-file store exception, lock restore, rollback `2aab0561`).

No production digest was sealed. No email sent. No KV writes to production.
