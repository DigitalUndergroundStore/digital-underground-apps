# Null Harbor Stripe pilot + live-only cleanup proposal

**Date:** Wednesday, Nov 11, 2026 (America/Toronto, EST)  
**Status:** Proposal only. **Nothing has been changed** on the site, in Stripe, or in KV.  
**Scope (Donald):** migrate only products that are actually live for sale right now. Remove everything that is not up for sale. Ignore hidden, unlisted, coming-soon, retired, and stale items for the Stripe swap. Keep the Null Harbor pilot if it is live.

Related audit: `/workspace/stripe-nov11/GUMROAD-TO-STRIPE-PLAN.md`. Exact slug lists: `/workspace/stripe-nov11/removal-lists/`.

---

## 1. Null Harbor is live — pilot stands

Confirmed this morning against the live site, the storefront, the sitemap, and Gumroad:

- Catalog: `/store/p/null-harbor/`, **$4.99**, CTA **Buy**, `https://kerzy.gumroad.com/l/jcazp`, not coming soon.
- Live page `https://digitalundergroundstore.com/store/p/null-harbor/` returns **200**, title “Null Harbor — Digital Underground Store”, price $4.99, Buy button to that Gumroad URL, not noindex.
- Share page `/p/null-harbor/` **301**s to the store page (normal).
- On `/store/` as a books card with a Buy button; also on `/store/thrillers/`.
- In `sitemap.xml` (`lastmod` 2026-10-29).
- Gumroad listing `https://kerzy.gumroad.com/l/jcazp` returns **200**, title “Null Harbor — Near-Future Thriller Novella”, buyable.

It is a simple DRM-free ebook with no license gate. It remains the first Stripe pilot: one product, one payment link, a thank-you or Resend download email, one store product page swap (freeze exception for that file only), Gumroad left in place until the test purchase works. No other Buy buttons change in the pilot.

---

## 2. Exact count of truly live paid products

**75 products are live and paid on Gumroad right now**, plus **Maker Pro** already on Stripe.

| Count | What | Notes |
|---|---|---|
| **72** | Paid items in `scripts/store/catalog.json` with a live Gumroad Buy CTA, not coming soon, not free | On `/store/`, in `sitemap.xml`. Full list: `removal-lists/live-paid-catalog.txt`. |
| **+ 3** | Humanity X Book 1, Book 2, and the $14.99 Books 1+2 pack | Live store pages and Buy buttons. **Missing from `catalog.json` and from `sitemap.xml`.** Keep them. List below. |
| **= 75** | **Truly live paid Gumroad products** (this is the Stripe migration set, after the pilot) | |
| **+ 1** | Maker Pro (Monthly $9 / Yearly $79 / Founding $59 USD) | Already on Stripe. Keep. Do not migrate. |
| **ASK + 1** | Networking & Distribution, $69 one-time, “payment link by email” | Live page `/store/p/networking-distribution/`, not in catalog or sitemap. See KEEP/ASK. |

The 15 “coming soon” catalog calculators are **not** in this 75. Airhand, Bored Blocks, and the old GrokMate Phone listing are **not** in this 75.

### 72 catalog paid (migration set after the pilot)

| Product | Price shown | Gumroad URL |
|---|---|---|
| Session Forge | $14.99+ | https://kerzy.gumroad.com/l/wcvgxo |
| PlainHelp Ai | $39 | https://kerzy.gumroad.com/l/ozzrh |
| Winston — Hands-Free Kitchen Voice Assistant | $19 | https://kerzy.gumroad.com/l/jkpty |
| Offer Desk | $19 | https://kerzy.gumroad.com/l/bhrrtz |
| Complete Freelance Suite | $79 | https://kerzy.gumroad.com/l/vvtib |
| Cork — Darts Scoreboard | $25 | https://kerzy.gumroad.com/l/fjmmi |
| Focus & Habits Pack | $19 | https://kerzy.gumroad.com/l/wgjffu |
| AI Creator Bundle | $79 | https://kerzy.gumroad.com/l/lgvubv |
| Freelance Admin Stack | $35 | https://kerzy.gumroad.com/l/lggigy |
| Null Harbor | $4.99 | https://kerzy.gumroad.com/l/jcazp |
| He Came Home Without Her | $4.99 | https://kerzy.gumroad.com/l/ygwhif |
| Grok Prompt Pack | $29 | https://kerzy.gumroad.com/l/jsdrug |
| AI Audience Growth Toolkit | $29 | https://kerzy.gumroad.com/l/pgkgdc |
| Invoice Desk | $19 | https://kerzy.gumroad.com/l/nvmvyx |
| Scope Lock | $12 | https://kerzy.gumroad.com/l/omzql |
| Reply Forge | $9 | https://kerzy.gumroad.com/l/nlwvb |
| ChatGPT Prompt Pack | $9 | https://kerzy.gumroad.com/l/lqynfs |
| Rate Wire | $9 | https://kerzy.gumroad.com/l/ppnorh |
| Launch Ledger | $29 | https://kerzy.gumroad.com/l/iacbv |
| Wholesale Line Sheet Builder | $12 | https://kerzy.gumroad.com/l/khyul |
| Maker Newsletter Content Calendar | $9 | https://kerzy.gumroad.com/l/zuvxgn |
| Craft Fair Booth Fee Break-Even Calculator | $9 | https://kerzy.gumroad.com/l/wwxcf |
| Etsy Fee Reverse Price Calculator | $10 | https://kerzy.gumroad.com/l/gbwucg |
| Print-on-Demand Profit Sheet | $9 | https://kerzy.gumroad.com/l/ykwgb |
| Wholesale & Retail Price Calculator | $9 | https://kerzy.gumroad.com/l/shhjy |
| Custom Order Deposit Log | $9 | https://kerzy.gumroad.com/l/imlmej |
| Wholesale Order Sheet | $12 | https://kerzy.gumroad.com/l/wussph |
| Market Booth Sales Log | $9 | https://kerzy.gumroad.com/l/qgrsdm |
| Inventory & Restock Tracker | $9 | https://kerzy.gumroad.com/l/ytfshn |
| Custom Commission Request Form | $9 | https://kerzy.gumroad.com/l/rjouac |
| Maker Order Tracker | $9 | https://kerzy.gumroad.com/l/rqwdtr |
| Craft Fair & Market Checklist | $9 | https://kerzy.gumroad.com/l/tenrtd |
| Maker Price Calculator | $9 | https://kerzy.gumroad.com/l/cdymjj |
| 14-Day Launch Countdown Planner | $9 | https://kerzy.gumroad.com/l/qwuqbi |
| Indie Pricing Playbook | $12 | https://kerzy.gumroad.com/l/liehbs |
| Indie SaaS Ops Pack | $19 | https://kerzy.gumroad.com/l/rvdfp |
| Freelance Tax Year Checklist (Canada) | $12 | https://kerzy.gumroad.com/l/ztchxg |
| Alternatives & Comparison Page Kit | $9 | https://kerzy.gumroad.com/l/latbjm |
| Dunning & Churn Email Pack | $9 | https://kerzy.gumroad.com/l/qeido |
| Launch-Week Email Sequence | $12 | https://kerzy.gumroad.com/l/wqxar |
| Freelance Client Onboarding Kit | $9 | https://kerzy.gumroad.com/l/zpwtwm |
| Cold Outreach Pack for Makers | $12 | https://kerzy.gumroad.com/l/cvjzny |
| App Store Copy Pack | $12 | https://kerzy.gumroad.com/l/jfhatl |
| Landing-Page Copy Pack | $15 | https://kerzy.gumroad.com/l/jvkku |
| Course Outline Pack | $15 | https://kerzy.gumroad.com/l/fmfss |
| Streak Kit | $9 | https://kerzy.gumroad.com/l/idasqr |
| Focus Gate | $7 | https://kerzy.gumroad.com/l/tckoc |
| Box & Go | $12 | https://kerzy.gumroad.com/l/hfyam |
| Packlane | $7 | https://kerzy.gumroad.com/l/lchlou |
| Moving Box Inventory | $8 | https://kerzy.gumroad.com/l/jgeovg |
| Shared Chore Board for Roommates & Couples | $8 | https://kerzy.gumroad.com/l/okizaj |
| Home Repair Log | $9 | https://kerzy.gumroad.com/l/dywksh |
| Utility Bill Tracker | $9 | https://kerzy.gumroad.com/l/yjtoz |
| Contractor Quote Comparison | $9 | https://kerzy.gumroad.com/l/cocot |
| Warranty & Receipt Log | $7 | https://kerzy.gumroad.com/l/cjaaax |
| Savings Goal Tracker | $7 | https://kerzy.gumroad.com/l/ameqxu |
| Emergency Contact Sheet | $7 | https://kerzy.gumroad.com/l/dtetrb |
| Subscription Tracker | $9 | https://kerzy.gumroad.com/l/vexfp |
| Bill Due Date Tracker | $7 | https://kerzy.gumroad.com/l/iwqlk |
| Daily Medication Schedule | $9 | https://kerzy.gumroad.com/l/qogsqu |
| Grocery Budget Tracker | $7 | https://kerzy.gumroad.com/l/mdboy |
| Holiday Hosting Pack | $9 | https://kerzy.gumroad.com/l/lrbrpb |
| Wedding Guest & Budget Planner | $14 | https://kerzy.gumroad.com/l/saxabd |
| Debt Payoff Planner | $9 | https://kerzy.gumroad.com/l/ylerfs |
| New Year Reset Planner | $7 | https://kerzy.gumroad.com/l/oqtlzv |
| Sinking Funds Planner | $7 | https://kerzy.gumroad.com/l/racmfc |
| Small-Landlord Rent Ledger | $14 | https://kerzy.gumroad.com/l/acmeak |
| Side-Hustle Income & Tax Tracker | $9 | https://kerzy.gumroad.com/l/saixtz |
| Roommate Bill Splitter | $7 | https://kerzy.gumroad.com/l/rqnxwg |
| Estate Admin Checklist | $15 | https://kerzy.gumroad.com/l/dposil |
| Elder-Care Coordination Sheet | $12 | https://kerzy.gumroad.com/l/qnczxzg |
| Kitchen Renovation Planner | $12 | https://kerzy.gumroad.com/l/hzqsvb |

### 3 live paid books missing from the catalog (keep; add to catalog later)

| Product | Price | Gumroad URL | Where linked |
|---|---|---|---|
| Humanity X: Off the Ground | $9.99 | https://kerzy.gumroad.com/l/umndpu | /store/p/humanity-x-off-the-ground/ and /p/humanity-x-off-the-ground/ |
| Humanity X: Into The Stars | $9.99 | https://kerzy.gumroad.com/l/sgrnpe | /store/p/humanity-x-into-the-stars/ and /p/humanity-x-into-the-stars/ |
| Humanity X: Books 1 + 2 (Ebook Pack) | $14.99 | https://kerzy.gumroad.com/l/egrywe | /store/p/humanity-x-books-1-2/ |

---

## 3. Why there are 1,300+ `/store/p/` pages for ~148 catalog items

`/workspace/du-good/store/p/` currently has **1,306** product page folders. They are **not** 1,306 variants or share pages of the 148 catalog items.

| Bucket | Count | What it is |
|---|---|---|
| Current catalog pages | **148** | One folder each for the 148 rows in `catalog.json` (72 paid + 16 free-via-Gumroad + 43 free on `/tools/` + 2 free beta + 15 coming soon). All 148 are in `sitemap.xml`. |
| Live extras, not in catalog | **5** | Humanity X ×3, Maker Pro, Networking & Distribution. Real pages, not noindexed, **not** in the sitemap. |
| Mass-generated leftover batch | **1,153** | Junk/coming-soon calculators and kits from the Oct 26–27, 2026 store expand. See section 4. |
| **Total `/store/p/`** | **1,306** | |

Share pages are separate: **35** folders under `/p/` (plus OG images). Those are the X/share URLs for flagship products, including Null Harbor and the Humanity X books. They are not the 1,300.

Almost every store product page also has a generated twin in `src/store-overrides/p/` (**1,305**; only Maker Pro has no override) and, for the expand batch, a `/tools/<slug>/` page. That is why the tree looks huge: each mass-generated item was written three times (store page + override + tool).

None of this 1,153 should be in the Stripe migration. The pilot and later swaps only touch the 75 live paid Gumroad products (and Maker Pro is already done).

---

## 4. The mass-generated batch (Donald is right)

This is the leftover “1,000+ products” dump, not a new mystery set.

**When:** overnight of **Sunday Oct 26 into Monday Oct 27, 2026** (America/Toronto).

**How:** a series of **170** “Wave SE / WAVE-STORE-EXPAND” jobs. The generators live under `/workspace/wave/` as `newstore.py`, `newstore3.py`, … `newstoreN.py` (plus matching `newtools*.py` / `body*.py`). Notes are in `/workspace/digital-underground/marketing/2026-10-26-overnight/WAVE-STORE-EXPAND.md` and `WAVE-STORE-EXPAND-*.md`. Early waves also queued Gumroad creates via `/workspace/gq/mk.py`, but that night kerzy **hit Gumroad’s daily cap** (“you can only create 10 products per day”) — `GUMROAD-QUEUE-COMING-SOON.md` says **0 of 22 were created that night**, and early expand reports say “No Gumroad products created. No Gumroad URLs added.”

**Then the cull (Oct 27):** `STORE-CULL-500-HIDDEN-CATALOG-2026-10-27.md` — browse cards went **1,258 → 350 public**, with **908** moved to a hidden `/store/archive/` catalog. The archived **product pages were left live at 200** on purpose (“deep links/Gumroad queue intact”). Featured/flagship pages were left alone.

**What happened since:** the public catalog later shrank again to the current **148** in `catalog.json`. `/store/archive/` now only says “No archived products right now” (`noindex`, not linked from nav). The leftover pages were **never deleted**.

**Counts today (not in the current catalog, excluding the 5 real extras):**

| | Count |
|---|---|
| Junk `/store/p/<slug>/` pages | **1,153** |
| Matching `src/store-overrides/p/<slug>/` | **1,153** |
| Matching `/tools/<slug>/` pages | **1,153** (every junk slug has one) |
| Pattern | 806 `*-cost-calculator`, 254 other `*-calculator`, plus trackers, logs, kits, checklists, planners, and similar |
| HTML `noindex` | **1,153** of 1,153 junk store pages |
| Say “coming soon” | **1,128** |
| In `sitemap.xml` | **0** |
| Linked from nav, footer, or store hero | **0** (not found; `/store/archive` is also unlinked) |
| Own Gumroad checkout | **No.** Many pages mention Gumroad only in “related” cards, which point at **other** live products (Due Desk `gfbgve`, Exam Desk `zpqpto`, Hook Bank `vusus`, etc.). They do not have their own `kerzy.gumroad.com/l/<id>` Buy CTA. |
| Sales on those junk SKUs | No own Gumroad listing was found on the pages, so there is no own checkout to have sold through. This audit did not pull Gumroad sales reports. |

Exact slug list: `/workspace/stripe-nov11/removal-lists/junk-store-p-slugs.txt`.

They still return **200** if someone has a URL. They are also named in `functions/_middleware.js` (the huge `/tools/` allowlist) and `scripts/build-public.sh` (copy list), and many have files under `store/covers/`.

---

## 5. Cleanup proposal (change nothing until Donald says go)

Goal: take off the site everything that is **not actually for sale**, without touching real live products, free-but-real tools, the marketplace, Kerzy Labs, or Airhand until Donald confirms the ASK items.

### 5a. REMOVE — junk mass-batch (1,153)

For each slug in `removal-lists/junk-store-p-slugs.txt`:

- Add a **301 redirect** `/store/p/<slug>/` → `/store/` (and the no-slash form) in `_redirects`.
- Add a **301** `/tools/<slug>/` → `/store/` (these tool pages were generated with the batch; they are not the 43 real free tools).
- Stop serving or delete `store/p/<slug>/` and `src/store-overrides/p/<slug>/` (and the `/tools/<slug>/` page).
- Drop the slug from `scripts/build-public.sh` and the `_middleware.js` `/tools/` allowlist.
- Do **not** add them to `sitemap.xml` (they are already absent).
- Optional later: unused `store/covers/` files for those slugs. Not required for the first cleanup if redirects are in place.

### 5b. REMOVE — coming soon, not for sale (15 catalog items)

These **are** in `catalog.json`, on `/store/`, and in `sitemap.xml`, but the catalog CTA is “Coming soon · preview” and they should not be treated as live sale items.

| Product | Slug | Price shown | Store page |
|---|---|---|---|
| 3D Print Cost Calculator | 3d-print-cost-calculator | $8 | /store/p/3d-print-cost-calculator/ |
| Subscription Box Profit Planner | subscription-box-planner | $9 | /store/p/subscription-box-planner/ |
| Maker Hourly Rate Calculator | maker-hourly-rate-calculator | $8 | /store/p/maker-hourly-rate-calculator/ |
| Maker Cash Flow Forecast | maker-cash-flow-forecast | $9 | /store/p/maker-cash-flow-forecast/ |
| Product Bundle Pricing Calculator | product-bundle-pricing-calculator | $9 | /store/p/product-bundle-pricing-calculator/ |
| EV Charging Cost Calculator | ev-charging-cost-calculator | $7 | /store/p/ev-charging-cost-calculator/ |
| Rent vs Buy Calculator | rent-vs-buy-calculator | $8 | /store/p/rent-vs-buy-calculator/ |
| Home Solar Payback Calculator | home-solar-payback-calculator | $8 | /store/p/home-solar-payback-calculator/ |
| Recipe Cups to Grams Converter | recipe-unit-converter | $7 | /store/p/recipe-unit-converter/ |
| Exam Countdown Study Planner | exam-study-planner | $7 | /store/p/exam-study-planner/ |
| Party Food Quantity Calculator | party-food-quantity-calculator | $7 | /store/p/party-food-quantity-calculator/ |
| Fuel Economy Log | fuel-economy-log | $7 | /store/p/fuel-economy-log/ |
| Baby Feeding & Sleep Log | baby-feeding-sleep-log | $7 | /store/p/baby-feeding-sleep-log/ |
| Flooring & Tile Calculator | flooring-tile-calculator | $7 | /store/p/flooring-tile-calculator/ |
| Room Paint Calculator | room-paint-calculator | $7 | /store/p/room-paint-calculator/ |

For each:

- Remove the catalog entry from `scripts/store/catalog.json` (or mark unpublished so `gen-store.py` no longer emits a browse card).
- Remove the card and JSON-LD ItemList row from `store/index.html` (and the override index if present).
- Remove the 15 URLs from `sitemap.xml`.
- 301 `/store/p/<slug>/` → `/store/`.
- Remove or redirect the store page + override.

**ASK (do not auto-delete):** each of these 15 also has a `/tools/<slug>/` preview. Keep those as free tools, or redirect them with the store page? Default proposal: **ASK** before deleting the tool preview.

### 5c. REMOVE — stale Buy links (10)

`store/index.html` is out of date versus `catalog.json`. Ten coming-soon cards still have a **Buy** link to a Gumroad URL that is **not** in the current catalog `gumroad` field:

| Product | Slug | Stale Gumroad URL | Where |
|---|---|---|---|
| 3D Print Cost Calculator | 3d-print-cost-calculator | https://kerzy.gumroad.com/l/alugq | store/index.html card CTA still says Buy |
| Subscription Box Profit Planner | subscription-box-planner | https://kerzy.gumroad.com/l/saemg | store/index.html card CTA still says Buy |
| Maker Hourly Rate Calculator | maker-hourly-rate-calculator | https://kerzy.gumroad.com/l/fabovb | store/index.html card CTA still says Buy |
| Maker Cash Flow Forecast | maker-cash-flow-forecast | https://kerzy.gumroad.com/l/wiqjy | store/index.html card CTA still says Buy |
| Product Bundle Pricing Calculator | product-bundle-pricing-calculator | https://kerzy.gumroad.com/l/pltgr | store/index.html card CTA still says Buy |
| Party Food Quantity Calculator | party-food-quantity-calculator | https://kerzy.gumroad.com/l/zknqr | store/index.html card CTA still says Buy |
| Fuel Economy Log | fuel-economy-log | https://kerzy.gumroad.com/l/wgjukx | store/index.html card CTA still says Buy |
| Baby Feeding & Sleep Log | baby-feeding-sleep-log | https://kerzy.gumroad.com/l/ejharz | store/index.html card CTA still says Buy |
| Flooring & Tile Calculator | flooring-tile-calculator | https://kerzy.gumroad.com/l/nxlrrj | store/index.html card CTA still says Buy |
| Room Paint Calculator | room-paint-calculator | https://kerzy.gumroad.com/l/fdqlvo | store/index.html card CTA still says Buy |

These go away when the coming-soon cards are removed (5b). If the cleanup is staged, strip these Buy hrefs first so we stop sending people to checkout for products that are not for sale.

The other five coming-soon cards already say Preview or have no Gumroad href in the card.

### 5d. Leave or tidy — empty archive page

`/store/archive/` exists, is `noindex`, is not in the nav or sitemap, and currently says there are no archived products. Low priority. Can stay, or 301 to `/store/`.

### 5e. Do not remove (and do not “clean up”) as junk

Humanity X pages, Maker Pro, and Networking & Distribution are among the 1,158 “not in catalog.json” folders but they are **real**. Leave them in place. (Bonus later, not this cleanup: add Humanity X and Maker Pro to `catalog.json` and the sitemap.)

### Counts to remove in the first cleanup (if Donald approves 5a–5c, and parks 15 tool previews as ASK)

| Category | Store pages | Tool pages | Overrides | Sitemap rows | Store browse cards / stale Buys | Redirects to `/store/` |
|---|---:|---:|---:|---:|---:|---:|
| Junk mass-batch | 1,153 | 1,153 | 1,153 | 0 | 0 | 2,306 (store + tools) |
| Coming soon (catalog) | 15 | 0 pending ASK | 15 | 15 | 15 cards, 10 stale Buy hrefs | 15 store URLs (+15 tools if Donald says remove) |
| **Subtotal (tools ASK kept)** | **1,168** | **1,153** | **1,168** | **15** | **15 cards / 10 Buys** | **2,321** |
| **If coming-soon tools also go** | 1,168 | 1,168 | 1,168 | 15 | same | 2,336 |

Nav/footer: no per-product junk links to remove. One store entry stays (`/store/`).

---

## 6. KEEP / ASK — free or real, but not a paid Gumroad→Stripe swap

These stay on the site unless Donald says otherwise. They are **not** in the removal list above.

| Item | Mark | Why |
|---|---|---|
| **43 free tools** already opening on `/tools/…` (catalog CTA does not go to Gumroad) | **KEEP** | Real, free, on-site. List: `removal-lists/free-tools-catalog.txt`. |
| **16 free store items** that still collect the file on Gumroad (kids’ stories, Due Desk, Exam Desk, Hook Bank, Promo Lane, and several kits) | **KEEP** (later: host the file on-site so Gumroad is not required) | Free but actually offered on the store. |
| **PlanetView Live** (free beta; list $24; gift code `DUFREEPV`) | **KEEP** | Real free beta. Checkout/license still Gumroad; move only after a license path exists. |
| **Pantry Week** (free beta; encrypted app; buyer code from Gumroad receipt) | **KEEP** | Same. |
| **Marketplace listings from other makers**, including 7 that use *their* Gumroad shops | **KEEP** | “Zero cut, your checkout.” Not DU products. |
| **Kerzy Labs games** (CyberArena, Quad Pong, Rival Lanes, Stack Attack Arena) | **KEEP** | Separate brand; not DU checkout. |
| **Airhand** (Early Access, Buy buttons hidden; marketplace listing `cm_du_airhand` visits airhand.pages.dev, price CA$6.99 / site $6.99; `/p/airhand` already 301s to `/store/`; no `/store/p/airhand/`) | **ASK** | Real product, **not for sale**. Leave hidden, or also hide/remove the marketplace listing? Do not add a Stripe button until you say. |
| **Networking & Distribution** (`/store/p/networking-distribution/`, $69, mailto payment link; copy includes builder intros) | **ASK** | Live service page, not in catalog or sitemap, not Gumroad/Stripe. Keep, move to Stripe later, or take down? The “intros” wording is the same kind of claim you asked to remove from Maker Pro. |
| **Coming-soon `/tools/` previews** for the 15 catalog calculators | **ASK** | See 5b. |
| **Maker Pro** and the **Tip us** footer link | **KEEP** | Already Stripe, already live. |
| Unlisted/off-site only: Bored Blocks, old GrokMate Phone Gumroad listing | **Nothing to remove on the site** | Not in the current store tree. Confirm later if the Gumroad listings themselves should be unpublished (off-site, not this release). |

### 16 free-via-Gumroad store items (KEEP)

| Product | Price shown | Gumroad URL |
|---|---|---|
| The Brave Little Beaver | Free | https://kerzy.gumroad.com/l/bukwxo |
| The Day Ethan Chose Kindness | Free | https://kerzy.gumroad.com/l/efouck |
| Tilly's Big Cleanup | Free | https://kerzy.gumroad.com/l/vlaqmh |
| A New Friend – A Brighter Day | Free | https://kerzy.gumroad.com/l/vzfysf |
| Due Desk | Free | https://kerzy.gumroad.com/l/gfbgve |
| Exam Desk | Free | https://kerzy.gumroad.com/l/zpqpto |
| Hook Bank | Free | https://kerzy.gumroad.com/l/vusus |
| Promo Lane | Free | https://kerzy.gumroad.com/l/mlrnfq |
| Launch Day Kit | Free | https://kerzy.gumroad.com/l/dvzvtb |
| Listing Kit | Free | https://kerzy.gumroad.com/l/rmczwy |
| Changelog Kit | Free | https://kerzy.gumroad.com/l/wvinsa |
| Pricing Page Kit | Free | https://kerzy.gumroad.com/l/goxgg |
| Cold DM Kit | Free | https://kerzy.gumroad.com/l/qscmoo |
| Testimonial Kit | Free | https://kerzy.gumroad.com/l/nmpiw |
| Onboarding Email Kit | Free | https://kerzy.gumroad.com/l/fixdjo |
| Weekly Budget Kit | Free | https://kerzy.gumroad.com/l/fvrnct |

Plus PlanetView and Pantry Week (section 1c of the earlier plan).

### 43 on-site free tools (KEEP)

| Product | On-site URL |
|---|---|
| Maker Monthly Sales Goal Tracker | /tools/maker-sales-goal-tracker/ |
| Package Shipping Log | /tools/package-shipping-log/ |
| Maker Weekly Planner | /tools/maker-weekly-planner/ |
| Product Photo Shot List | /tools/product-photo-shot-list/ |
| Launch Post Builder | /tools/launch-post-builder/ |
| Maker Outreach Message Builder | /tools/maker-outreach-builder/ |
| Listing Copy Builder | /tools/listing-copy-builder/ |
| Kids Allowance Tracker | /tools/kids-allowance-tracker/ |
| Library Book Tracker | /tools/library-book-tracker/ |
| Pantry & Freezer Inventory | /tools/pantry-inventory-list/ |
| Plant Watering Schedule | /tools/plant-watering-schedule/ |
| Morning Routine Checklist | /tools/morning-routine-checklist/ |
| Weekly Cleaning Schedule | /tools/cleaning-schedule/ |
| Field Studio | https://digitalundergroundstore.com/tools/field-studio/ |
| Moving Day Checklist | https://digitalundergroundstore.com/tools/move-checklist-kit/ |
| Waitlist & Pre-Launch Kit | https://digitalundergroundstore.com/tools/waitlist-kit/ |
| Indie SEO Starter Kit | https://digitalundergroundstore.com/tools/indie-seo-kit/ |
| Build-in-Public 30-Day Post Pack | https://digitalundergroundstore.com/tools/build-in-public-pack/ |
| User Feedback Kit | https://digitalundergroundstore.com/tools/feedback-kit/ |
| Holiday Gift & Budget Planner | https://digitalundergroundstore.com/tools/holiday-gift-planner/ |
| Home Maintenance Calendar | https://digitalundergroundstore.com/tools/home-maintenance-calendar/ |
| Job Hunt Kit | https://digitalundergroundstore.com/tools/job-hunt-kit/ |
| Press Kit Builder | https://digitalundergroundstore.com/tools/press-kit/ |
| Competitor Teardown Worksheet | https://digitalundergroundstore.com/tools/competitor-teardown-kit/ |
| Product Hunt Day-Of Playbook | https://digitalundergroundstore.com/tools/product-hunt-kit/ |
| Apartment Hunt Kit (Canada) | https://digitalundergroundstore.com/tools/apartment-hunt-kit/ |
| New Parent Checklist | https://digitalundergroundstore.com/tools/new-parent-checklist/ |
| Road Trip Kit | https://digitalundergroundstore.com/tools/road-trip-kit/ |
| 30-Day Declutter Challenge | https://digitalundergroundstore.com/tools/declutter-challenge/ |
| Student Semester Starter | https://digitalundergroundstore.com/tools/student-semester-starter/ |
| First Apartment Essentials | https://digitalundergroundstore.com/tools/first-apartment-essentials/ |
| Refund & Returns Policy Kit | https://digitalundergroundstore.com/tools/refund-policy-kit/ |
| Home Emergency Prep Kit | https://digitalundergroundstore.com/tools/emergency-prep-kit/ |
| Product Listing Optimizer | https://digitalundergroundstore.com/tools/product-listing-optimizer/ |
| Kids' Birthday Party Planner | https://digitalundergroundstore.com/tools/kids-birthday-party-planner/ |
| Car Maintenance Log | https://digitalundergroundstore.com/tools/car-maintenance-log/ |
| Affiliate Program Starter Kit | https://digitalundergroundstore.com/tools/affiliate-program-kit/ |
| Price Increase Kit | https://digitalundergroundstore.com/tools/price-increase-kit/ |
| Home Inventory for Insurance | https://digitalundergroundstore.com/tools/home-inventory-kit/ |
| Black Friday Sale Kit for Makers | https://digitalundergroundstore.com/tools/black-friday-sale-kit/ |
| User Interview Script Kit | https://digitalundergroundstore.com/tools/user-interview-kit/ |
| Packing Lists by Trip Type | https://digitalundergroundstore.com/tools/packing-list-kit/ |
| Crowdfunding Launch Kit | https://digitalundergroundstore.com/tools/crowdfunding-launch-kit/ |

---

## 7. Release path (when Donald approves — not now)

- **One gated production release**, not a file-by-file trickle of 1,168 pages. Use `/workspace/du-good` `scripts/release.sh` with a reviewed sealed digest, the same process as other production ships. Direct `wrangler pages deploy` and `build-public.sh --deploy` stay forbidden.
- The store tree is under the **release freeze**. This cleanup is a bulk unpublish, so the release would use **one reviewed exception / allowlist for the cleanup manifest** (redirects, sitemap, catalog, `store/index.html`, and the listed page removals), then the freeze is restored immediately. This is not a blanket thaw, and it is not 1,168 separate one-file exceptions.
- **Current production** (as of the Maker Pro plan-card ship, 8:47 AM EST today) is Cloudflare Pages id **`b8f05bfb`**. That is the **rollback target** for this cleanup. Rolling back to `b8f05bfb` restores the current site, including every removed page. The removal is reversible that way; we would not need to rebuild the junk pages by hand.
- **Redirects:** every removed `/store/p/<slug>/` and (if approved) `/tools/<slug>/` **301 to `/store/`**, so old links and Google do not 404. `_redirects` ships in the same release.
- Check the release at phone and desktop widths, confirm Null Harbor, Humanity X, Maker Pro, the tip link, PlanetView/Pantry Week, `/store/`, and a sample of redirected junk URLs (`/store/p/acoustic-wall-panel-build-cost-calculator/` → `/store/`, 301).
- **Do not mix the Null Harbor Stripe pilot and this cleanup in the same release** unless you explicitly want that. Safer: cleanup first (or second), pilot as its own one-page exception, so a checkout test is not tied to deleting 1,000+ pages.

---

## 8. What happens next (still no changes until you say)

1. You confirm the KEEP/ASK items (especially Airhand’s marketplace listing, Networking & Distribution, and the 15 coming-soon tool previews).
2. You confirm the cleanup may go ahead as one gated release rolling back to **b8f05bfb**, with 301s to `/store/`.
3. Separately, the **Null Harbor** Stripe pilot proceeds as planned (it is live). Currency and the other pricing questions in the main plan still need answers before a Stripe product is created.
