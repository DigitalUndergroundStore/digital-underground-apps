# He Came Home Without Her — backend only (no page swap)

Written: 2026-11-11 10:29:30 AM EST (America/Toronto)
Authorized by Donald (“One at a time I want to test the next one to”, [pt2097u]).

## Product

Next live, paid, file-only product after Null Harbor (plan order; Humanity X excluded; not Airhand / coming-soon / Session Forge PWYW).

- Title: **He Came Home Without Her**
- Store page (unchanged, still Gumroad): https://digitalundergroundstore.com/store/p/he-came-home-without-her/
- Price: **$4.99 USD** one-time (same as the live store JSON-LD; tax code `txcd_10302001` e-books)
- Files (uploaded to KV `du-product-files` / `DOWNLOADS_KV`, Null Harbor keys left untouched):
  - `he-came-home-without-her/He-Came-Home-Without-Her.epub` 391,985 bytes sha256 `f3bfbd9ec11daab328e57271c45019d653b4068db07f0d258f68ef88f72754f9`
  - `he-came-home-without-her/He-Came-Home-Without-Her.docx` 83,833 bytes sha256 `e480343435c884848eb19fbbb68b389c5a0ba4fac9117c84d50bf650bf2388dd`
- These are the corrected deliverables (real italics, Afterword), not the older asterisk-ridden 88,403-byte DOCX. EPUB was not on the original Gumroad listing; it is included as a second format, same as Null Harbor’s epub+pdf pair.

## Stripe (not on the live page)

- product `prod_VbrA41hew0pNFr`
- price `price_1UadRlRAOyy6tigLyIPfSb6Q` — $4.99 USD, exclusive tax
- payment link `plink_1UadRmRAOyy6tigL3gl4jXyA` — active, livemode, `allow_promotion_codes=true`, `restrictions=null` (codes allowed, not required)
- URL (do not publish on the site): https://buy.stripe.com/dRmcN7gKgbtfbcGbWO0ZW05
- metadata `sku=he-came-home-without-her`
- Redirect: `https://digitalundergroundstore.com/thanks/?sku=he-came-home-without-her&session_id={CHECKOUT_SESSION_ID}` (written without braces doubling in live config)
- Reused existing webhook `we_1Uad7vRAOyy6tigLTbfz5MPL` at `/api/stripe/webhook`. No new endpoint. Fulfillment is per-SKU via `STORE_SKUS`.

## $0 test promo (single use)

- Coupon `MnORPRnI` — 100% off, duration once, max_redemptions=1
- Promotion code: **HCH-2MRQGY6V75** (copy-pastable; max_redemptions=1, not public)

## How Donald should test

The live product page still points at Gumroad (`https://kerzy.gumroad.com/l/ygwhif`). He must open the Stripe payment link directly:

1. Open https://buy.stripe.com/dRmcN7gKgbtfbcGbWO0ZW05
2. Use email **kerzydon@gmail.com**
3. Apply promotion code **HCH-2MRQGY6V75**. Total should go to $0.
4. Complete checkout. He should land on `/thanks/?sku=he-came-home-without-her&session_id=…`
5. Email from `Digital Underground <notify@digitalundergroundstore.com>`, subject `Your He Came Home Without Her download`, with 72-hour signed links for the EPUB and DOCX.

Do not post the payment link or promo code on the site, Buffer, or X.

## Backend publish

- pages_id: `69679ed0` — https://69679ed0.digital-underground.pages.dev
- digest: `7fd039e5a538ee6c53eb812a5b8216ec6da07ae072c0b77ccff5562b441abcfa`
- functions_digest: `010d903c7b30be265e2aab04012e49580ca988919643add2715922aed3ae1d74`
- deployed_at: 2026-11-11 10:29:30 AM EST (`2026-11-11T15:29:30Z`)
- Allowlist: `functions/_lib/store-skus.js`, `thanks/index.html` only (thanks page is now sku-generic). No store page swap. Dirty `site-nav.css` not staged.
- Deployment `kv_namespaces`: `COMMUNITY_KV` → `5e086a24647c419f8ac5577b85a0c651`, `DOWNLOADS_KV` → `28ce144531b14fb28d48977050e2a8ec`
- Lock restored: `433fea1d4727151c276e1c2f8ab3ed26f165c96e17be9b997a9174de31e4420f`
- `release.sh` DOWNLOADS_KV pin kept: `17f2f70a00d123c3b5d999f75aed622e04d9a5e2da148f75aa65718314fa807b`
- Rollback: **`c9f80788`** (digest `f311a6f805e41c7bcc963720563dc2baf0e801548c3400e339e5f9d894f8af4f`)

Local tests (`node tests/pilot.test.mjs`) all passed, including sha256 for both SKUs.

Live verification: `/store/`, `/store/p/null-harbor/`, and `/store/p/he-came-home-without-her/` byte-identical to `c9f80788` aliases; He Came Home Buy still Gumroad. Homepage sealed source is identical; served HTML differs only in marketplace project grid (111 → 112 live community listings, unrelated). Unsigned webhook 400 `bad_header`. Fresh signed downloads 200 with matching sha256 for Null Harbor epub+pdf and He Came Home epub+docx.
