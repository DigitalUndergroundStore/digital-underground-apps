# Cloudflare additions required before a Null Harbor Stripe publish

R2 is not used. Product files are stored in a dedicated Workers KV namespace (values are under the 25 MiB limit).

## Secrets (Pages project `digital-underground`)

Set in Cloudflare Pages → Settings → Environment variables / Functions secrets (production):

| Secret | Purpose | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | Retrieve a Checkout Session on the thank-you re-download path | Live secret. Not on the worker today (Maker Pro uses hosted Payment Links only). |
| `STRIPE_WEBHOOK_SECRET` | Verify `Stripe-Signature` on `/api/stripe/webhook` | Comes from the webhook endpoint, created only after the function is live. Starts with `whsec_`. |
| `DOWNLOAD_SIGNING_SECRET` | HMAC for expiring download tokens (72 hours) | Generate a long random string (e.g. 32+ bytes). Do not reuse the Stripe key. |
| `RESEND_API_KEY` | Delivery email | Already present. Do not overwrite. Must be able to send as `notify@digitalundergroundstore.com`. |
| `COMMUNITY_NOTIFY_FROM` | From header | Already present. Optional override; code falls back to `Digital Underground <notify@digitalundergroundstore.com>`. |

No other Maker Pro / tip Stripe objects should be changed.

## Bindings

| Binding | Type | Namespace | Purpose |
|---|---|---|---|
| `COMMUNITY_KV` | KV | existing `5e086a24647c419f8ac5577b85a0c651` (`worker-du-community`) | Idempotency keys `stripe:evt:<eventId>` (30-day TTL). Already bound. Do not reuse this namespace for files. |
| `DOWNLOADS_KV` | KV | **new** namespace title `du-product-files` | Null Harbor file bytes only (`get` with `{type:"arrayBuffer"}`). Do not store other app data here. |

## File storage (Workers KV)

Upload from the current Gumroad/Payhip v2 package (do not invent a new edit):

Source zip: `/workspace/digital-underground/channels/payhip/07-jcazp-Null-Harbor/files/Null-Harbor-v2.zip`

| KV key | File | Size (from zip) |
|---|---|---|
| `null-harbor/Null-Harbor.epub` | Null-Harbor.epub | 748,033 bytes |
| `null-harbor/Null-Harbor.pdf` | Null-Harbor.pdf | 279,857 bytes |

The worker reads those two keys as binary. Verify sha256 after upload.

## Stripe webhook endpoint (after the function is live)

- URL: `https://digitalundergroundstore.com/api/stripe/webhook`
- Events: `checkout.session.completed` only
- Put the signing secret in `STRIPE_WEBHOOK_SECRET`, then a gated redeploy if Pages only injects new secrets on a new deployment.

## Local / preview wrangler

For `wrangler pages dev`, the same secrets can live in a gitignored `.dev.vars`. Bind `DOWNLOADS_KV` to the `du-product-files` namespace (or a local mock). Do not commit secrets.
