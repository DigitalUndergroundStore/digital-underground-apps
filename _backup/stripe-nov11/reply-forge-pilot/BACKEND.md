# Reply Forge backend (no page swap)

Date: 2026-11-11, America/Toronto (EST). Authorized by [pt2099u] after Donald's HCH $0 test ("It worked, continue").

## Product
- Live page `/store/p/reply-forge/` still Gumroad `https://kerzy.gumroad.com/l/nlwvb` (Buy buttons and JSON-LD not swapped).
- Price charged: **$9.00 USD** (matches live store / JSON-LD; not historical Payhip CAD$6).
- File-only HTML tool, no license-key issuer. Next after Null Harbor and He Came Home Without Her. Exclusions held (no Airhand, coming-soon, Humanity X, Session Forge PWYW, license-gated apps).
- Tax code: `txcd_10201000` (prewritten software, downloaded), not the e-book code used for the novellas.

## Deliverable files (current Gumroad Oct 7 / Oct 11 set)
Later unapplied zip-fix-oct19 / overwritten `fixed/nlwvb/` copies were **not** used. Obsolete `Reply-Forge-v1.zip` was not uploaded.

| Key | Bytes | sha256 |
|---|---:|---|
| `reply-forge/Reply-Forge-v1.1.zip` | 54,029 | `72d1762030f1fb43219634a93af3c4c78e8b08d9e69cafa0f79f8911c034dd4b` |
| `reply-forge/Reply-Forge-On-Your-Phone.pdf` | 50,732 | `886c26710af61a973182ded2cb56ec851c824fd17c1211a3cdde0d5a0b850fbe` |

Source: `/workspace/digital-underground/fixed/_gumroad-backup-oct7/nlwvb/delivered/`. Prior Null Harbor and HCH KV keys were left untouched (sha256 reconfirmed after PUT).

## Stripe (live, promo codes allowed but not required)
- product `prod_Vbrxm71SbdMaZ5`
- price `price_1UaeDkRAOyy6tigLuiYDbDq9` ($9.00 USD, one_time)
- payment link `plink_1UaeDlRAOyy6tigLvljf34Z5`
- URL `https://buy.stripe.com/8x228t0Liapb5Sm3qi0ZW06`
- `allow_promotion_codes=true`, `restrictions=null`
- redirect `https://digitalundergroundstore.com/thanks/?sku=reply-forge&session_id={CHECKOUT_SESSION_ID}`
- metadata `sku=reply-forge` on product, price, payment link, and payment_intent
- Existing webhook `we_1Uad7vRAOyy6tigLTbfz5MPL` reused (shared `STORE_SKUS`)

## Single-use $0 test promo
- code: `RF-5Z7P348L5H`
- coupon `MVVxFklq` (100% off, once, max_redemptions=1)
- promo `promo_1UaeDnRAOyy6tigLRSjuE5TH` (max_redemptions=1, livemode)

## Publish
- digest `fc5a6333f6dbcae81a201e8210944efbbc48a0d71b4a0d2ff043f5b902b96b31`
- functions_digest `68ab3b083f709a5800170012fb416d0d571b7500344698609942964b41118aea`
- worker_sha `edb1d1705c69185d1c14af0e76ebf9889c50d40828232c84e8e2d37009a74955`
- pages_id **`23f792f7`** (alias https://23f792f7.digital-underground.pages.dev)
- deployed_at 2026-11-11T16:19:47Z = 2026-11-11 11:19:47 AM EST (America/Toronto)
- rollback **`a7d98847`** (HCH page-swap digest `9a3f8089…`)
- Allowlist was only `functions/_lib/store-skus.js` (pinned-worker.js rebuilt from that). Thanks page already sku-generic. Reply Forge product page not in the tree change.
- Temporary store-must-equal-known-good exception in `release.sh` was reverted after deploy. DOWNLOADS_KV pin restored (`17f2f70a…`). Lock restored (`433fea1d…`). `pages-bindings.toml` unchanged (`9ada0c82…`).
- Deployment `23f792f7` kv_namespaces include COMMUNITY_KV `5e086a24647c419f8ac5577b85a0c651` and DOWNLOADS_KV `28ce144531b14fb28d48977050e2a8ec`.

## Verification
- `/` `/store/` `/store/p/null-harbor/` `/store/p/he-came-home-without-her/` `/store/p/reply-forge/` on `23f792f7` are raw byte-identical to `a7d98847` aliases (home sha `aeba588652e0f4c2`, store sha `8d72661dd26491e1`).
- Live and alias: Null Harbor and HCH Buy/JSON-LD still Stripe; Reply Forge still Gumroad `nlwvb`; new Stripe URL not on the Reply Forge page.
- Unsigned POST `/api/stripe/webhook` → 400 `{"ok":false,"error":"bad_header"}` (live and alias).
- Fresh signed downloads 200 with matching sha256/bytes/content-type for NH epub+pdf, HCH epub+docx, RF zip+pdf.
- Local tests: `node tests/pilot.test.mjs` all passed (including rf e2e).

## How Donald should test
1. Do **not** use the live product Buy button (it still goes to Gumroad).
2. Open `https://buy.stripe.com/8x228t0Liapb5Sm3qi0ZW06` directly.
3. Apply promo code `RF-5Z7P348L5H` (single-use, 100% off). Pay $0.
4. Use email `kerzydon@gmail.com` as in the prior tests.
5. After checkout: thanks page at `/thanks/?sku=reply-forge&session_id=…`, plus email from `notify@digitalundergroundstore.com` subject “Your Reply Forge download”, with 72-hour links for `Reply-Forge-v1.1.zip` and `Reply-Forge-On-Your-Phone.pdf`.
6. Leave the live page on Gumroad until this test is confirmed.
