# Gumroad → Stripe migration plan (read-only audit)

**Date:** Wednesday, Nov 11, 2026 (America/Toronto, EST)  
**Scope:** Read-only. No deploys, no Stripe writes, no edits to `/workspace/du-good`, no KV writes.  
**Asked by:** Donald (“Ok start the process of replacing everything with stripe”). This document is the first step only — a map and a recommended order. Nothing has been switched yet.

## Snapshot

Stripe account `acct_1Uaag8RAOyy6tigL` (Canada) is live: **charges enabled, payouts enabled**, details submitted, default currency **CAD**. Business URL is digitalundergroundstore.com.

Stripe already has only two products, both created for the Nov 11 tip / Maker Pro work. **No DU Gumroad products have been created in Stripe yet. No webhook endpoints exist.**

| Stripe product | Prices | Payment link | After checkout |
|---|---|---|---|
| Digital Underground Maker Pro | $9 USD / month, $79 USD / year, $59 USD founding year (first 25) | [Monthly](https://buy.stripe.com/dRm9AVgKgbtf94y8KC0ZW01), [Yearly](https://buy.stripe.com/9B6cN7fGc2WJ3Kee4W0ZW02), [Founding](https://buy.stripe.com/5kQeVf8dK68V94y6Cu0ZW03) | Hosted confirmation; automatic tax on |
| Support Digital Underground (tip) | Customer-chosen amount (suggested $5 USD, min $1) | [Tip link](https://donate.stripe.com/bJe5kFdy42WJdkOgd40ZW00) | Redirects to the homepage; automatic tax off |

No Stripe coupons. Maker Pro and the tip button are already on the live site and are out of scope for this swap.

**Currency conflict (Donald must decide before any product is created):**

- Stripe account default, the Oct 8 approved catalogue (`/workspace/digital-underground/product-catalogue.md` and Gerold `HANDOFF.md`), and the Airhand marketplace listing all use **CAD**.
- The live store copy, JSON-LD (`priceCurrency: USD`), support page (“one-time price in USD”), share-page generator, and the Maker Pro / tip links already charge **USD**.

Prices below are written as the site shows them (a bare `$`), not as a confirmed currency.

## 1. Product inventory

Source of truth for most store cards: `/workspace/du-good/scripts/store/catalog.json` (148 products; 90 still point at `kerzy.gumroad.com`). Extra live book pages and hidden/unlisted Gumroad products are listed after the main tables. A machine-readable dump is at `/workspace/stripe-nov11/catalog-products.csv`.

Kerzy Labs games (CyberArena, Quad Pong, Rival Lanes, Stack Attack Arena) stay off this list — they are not DU checkout and must not be branded or migrated as DU Stripe products. Airhand Buy buttons stay hidden until Donald says otherwise. Pantry Week and PlanetView are free beta.

### 1a. Paid / priced products currently checking out on Gumroad (catalog)

| Product | Price shown | Gumroad URL | Store page | Status |
|---|---|---|---|---|
| Session Forge | $14.99+ | https://kerzy.gumroad.com/l/wcvgxo | /store/p/session-forge/ | live, Gumroad checkout |
| PlainHelp Ai | $39 | https://kerzy.gumroad.com/l/ozzrh | /store/p/plainhelp/ | live, Gumroad checkout |
| Winston — Hands-Free Kitchen Voice Assistant | $19 | https://kerzy.gumroad.com/l/jkpty | /store/p/winston-hands-free-kitchen-voice-assistant/ | live, Gumroad checkout |
| Offer Desk | $19 | https://kerzy.gumroad.com/l/bhrrtz | /store/p/offer-desk/ | live, Gumroad checkout |
| Complete Freelance Suite | $79 | https://kerzy.gumroad.com/l/vvtib | /store/p/complete-freelance-suite/ | live, Gumroad checkout |
| Cork — Darts Scoreboard | $25 | https://kerzy.gumroad.com/l/fjmmi | /store/p/cork-offline-darts-scoreboard/ | live, Gumroad checkout |
| Focus & Habits Pack | $19 | https://kerzy.gumroad.com/l/wgjffu | /store/p/focus-habits-pack/ | live, Gumroad checkout |
| AI Creator Bundle | $79 | https://kerzy.gumroad.com/l/lgvubv | /store/p/ai-creator-bundle/ | live, Gumroad checkout |
| Freelance Admin Stack | $35 | https://kerzy.gumroad.com/l/lggigy | /store/p/freelance-admin-stack/ | live, Gumroad checkout |
| Null Harbor | $4.99 | https://kerzy.gumroad.com/l/jcazp | /store/p/null-harbor/ | live, Gumroad checkout |
| He Came Home Without Her | $4.99 | https://kerzy.gumroad.com/l/ygwhif | /store/p/he-came-home-without-her/ | live, Gumroad checkout |
| Grok Prompt Pack | $29 | https://kerzy.gumroad.com/l/jsdrug | /store/p/grok-prompt-pack/ | live, Gumroad checkout |
| AI Audience Growth Toolkit | $29 | https://kerzy.gumroad.com/l/pgkgdc | /store/p/ai-audience-growth-toolkit/ | live, Gumroad checkout |
| Invoice Desk | $19 | https://kerzy.gumroad.com/l/nvmvyx | /store/p/invoice-desk/ | live, Gumroad checkout |
| Scope Lock | $12 | https://kerzy.gumroad.com/l/omzql | /store/p/scope-lock/ | live, Gumroad checkout |
| Reply Forge | $9 | https://kerzy.gumroad.com/l/nlwvb | /store/p/reply-forge/ | live, Gumroad checkout |
| ChatGPT Prompt Pack | $9 | https://kerzy.gumroad.com/l/lqynfs | /store/p/chatgpt-prompt-pack/ | live, Gumroad checkout |
| Rate Wire | $9 | https://kerzy.gumroad.com/l/ppnorh | /store/p/rate-wire/ | live, Gumroad checkout |
| Launch Ledger | $29 | https://kerzy.gumroad.com/l/iacbv | /store/p/launch-ledger/ | live, Gumroad checkout |
| Wholesale Line Sheet Builder | $12 | https://kerzy.gumroad.com/l/khyul | /store/p/wholesale-line-sheet-builder/ | live, Gumroad checkout |
| Maker Newsletter Content Calendar | $9 | https://kerzy.gumroad.com/l/zuvxgn | /store/p/maker-newsletter-content-calendar/ | live, Gumroad checkout |
| Craft Fair Booth Fee Break-Even Calculator | $9 | https://kerzy.gumroad.com/l/wwxcf | /store/p/craft-fair-breakeven-calculator/ | live, Gumroad checkout |
| Etsy Fee Reverse Price Calculator | $10 | https://kerzy.gumroad.com/l/gbwucg | /store/p/etsy-fee-reverse-calculator/ | live, Gumroad checkout |
| Print-on-Demand Profit Sheet | $9 | https://kerzy.gumroad.com/l/ykwgb | /store/p/print-on-demand-cost-sheet/ | live, Gumroad checkout |
| Wholesale & Retail Price Calculator | $9 | https://kerzy.gumroad.com/l/shhjy | /store/p/wholesale-price-calculator/ | live, Gumroad checkout |
| Custom Order Deposit Log | $9 | https://kerzy.gumroad.com/l/imlmej | /store/p/custom-order-deposit-log/ | live, Gumroad checkout |
| Wholesale Order Sheet | $12 | https://kerzy.gumroad.com/l/wussph | /store/p/wholesale-order-sheet/ | live, Gumroad checkout |
| Market Booth Sales Log | $9 | https://kerzy.gumroad.com/l/qgrsdm | /store/p/market-booth-sales-log/ | live, Gumroad checkout |
| Inventory & Restock Tracker | $9 | https://kerzy.gumroad.com/l/ytfshn | /store/p/inventory-restock-tracker/ | live, Gumroad checkout |
| Custom Commission Request Form | $9 | https://kerzy.gumroad.com/l/rjouac | /store/p/commission-request-form/ | live, Gumroad checkout |
| Maker Order Tracker | $9 | https://kerzy.gumroad.com/l/rqwdtr | /store/p/maker-order-tracker/ | live, Gumroad checkout |
| Craft Fair & Market Checklist | $9 | https://kerzy.gumroad.com/l/tenrtd | /store/p/craft-fair-checklist/ | live, Gumroad checkout |
| Maker Price Calculator | $9 | https://kerzy.gumroad.com/l/cdymjj | /store/p/maker-price-calculator/ | live, Gumroad checkout |
| 14-Day Launch Countdown Planner | $9 | https://kerzy.gumroad.com/l/qwuqbi | /store/p/launch-countdown-planner/ | live, Gumroad checkout |
| Indie Pricing Playbook | $12 | https://kerzy.gumroad.com/l/liehbs | /store/p/indie-pricing-playbook/ | live, Gumroad checkout |
| Indie SaaS Ops Pack | $19 | https://kerzy.gumroad.com/l/rvdfp | /store/p/indie-saas-ops-pack/ | live, Gumroad checkout |
| Freelance Tax Year Checklist (Canada) | $12 | https://kerzy.gumroad.com/l/ztchxg | /store/p/freelance-tax-year-canada/ | live, Gumroad checkout |
| Alternatives & Comparison Page Kit | $9 | https://kerzy.gumroad.com/l/latbjm | /store/p/alternatives-page-kit/ | live, Gumroad checkout |
| Dunning & Churn Email Pack | $9 | https://kerzy.gumroad.com/l/qeido | /store/p/dunning-email-pack/ | live, Gumroad checkout |
| Launch-Week Email Sequence | $12 | https://kerzy.gumroad.com/l/wqxar | /store/p/launch-week-email-sequence/ | live, Gumroad checkout |
| Freelance Client Onboarding Kit | $9 | https://kerzy.gumroad.com/l/zpwtwm | /store/p/client-onboarding-kit/ | live, Gumroad checkout |
| Cold Outreach Pack for Makers | $12 | https://kerzy.gumroad.com/l/cvjzny | /store/p/cold-outreach-pack/ | live, Gumroad checkout |
| App Store Copy Pack | $12 | https://kerzy.gumroad.com/l/jfhatl | /store/p/app-store-copy-pack/ | live, Gumroad checkout |
| Landing-Page Copy Pack | $15 | https://kerzy.gumroad.com/l/jvkku | /store/p/landing-page-copy-pack/ | live, Gumroad checkout |
| Course Outline Pack | $15 | https://kerzy.gumroad.com/l/fmfss | /store/p/course-outline-pack/ | live, Gumroad checkout |
| Streak Kit | $9 | https://kerzy.gumroad.com/l/idasqr | /store/p/streak-kit/ | live, Gumroad checkout |
| Focus Gate | $7 | https://kerzy.gumroad.com/l/tckoc | /store/p/focus-gate/ | live, Gumroad checkout |
| Box & Go | $12 | https://kerzy.gumroad.com/l/hfyam | /store/p/box-go/ | live, Gumroad checkout |
| Packlane | $7 | https://kerzy.gumroad.com/l/lchlou | /store/p/packlane/ | live, Gumroad checkout |
| Moving Box Inventory | $8 | https://kerzy.gumroad.com/l/jgeovg | /store/p/moving-box-inventory/ | live, Gumroad checkout |
| Shared Chore Board for Roommates & Couples | $8 | https://kerzy.gumroad.com/l/okizaj | /store/p/shared-chore-board/ | live, Gumroad checkout |
| Home Repair Log | $9 | https://kerzy.gumroad.com/l/dywksh | /store/p/home-repair-log/ | live, Gumroad checkout |
| Utility Bill Tracker | $9 | https://kerzy.gumroad.com/l/yjtoz | /store/p/utility-bill-tracker/ | live, Gumroad checkout |
| Contractor Quote Comparison | $9 | https://kerzy.gumroad.com/l/cocot | /store/p/contractor-quote-compare/ | live, Gumroad checkout |
| Warranty & Receipt Log | $7 | https://kerzy.gumroad.com/l/cjaaax | /store/p/warranty-receipt-log/ | live, Gumroad checkout |
| Savings Goal Tracker | $7 | https://kerzy.gumroad.com/l/ameqxu | /store/p/savings-goal-tracker/ | live, Gumroad checkout |
| Emergency Contact Sheet | $7 | https://kerzy.gumroad.com/l/dtetrb | /store/p/emergency-contact-sheet/ | live, Gumroad checkout |
| Subscription Tracker | $9 | https://kerzy.gumroad.com/l/vexfp | /store/p/subscription-tracker/ | live, Gumroad checkout |
| Bill Due Date Tracker | $7 | https://kerzy.gumroad.com/l/iwqlk | /store/p/bill-due-date-tracker/ | live, Gumroad checkout |
| Daily Medication Schedule | $9 | https://kerzy.gumroad.com/l/qogsqu | /store/p/medication-schedule/ | live, Gumroad checkout |
| Grocery Budget Tracker | $7 | https://kerzy.gumroad.com/l/mdboy | /store/p/grocery-budget-tracker/ | live, Gumroad checkout |
| Holiday Hosting Pack | $9 | https://kerzy.gumroad.com/l/lrbrpb | /store/p/holiday-hosting-pack/ | live, Gumroad checkout |
| Wedding Guest & Budget Planner | $14 | https://kerzy.gumroad.com/l/saxabd | /store/p/wedding-planner/ | live, Gumroad checkout |
| Debt Payoff Planner | $9 | https://kerzy.gumroad.com/l/ylerfs | /store/p/debt-payoff-planner/ | live, Gumroad checkout |
| New Year Reset Planner | $7 | https://kerzy.gumroad.com/l/oqtlzv | /store/p/new-year-reset-planner/ | live, Gumroad checkout |
| Sinking Funds Planner | $7 | https://kerzy.gumroad.com/l/racmfc | /store/p/sinking-funds-planner/ | live, Gumroad checkout |
| Small-Landlord Rent Ledger | $14 | https://kerzy.gumroad.com/l/acmeak | /store/p/rent-ledger/ | live, Gumroad checkout |
| Side-Hustle Income & Tax Tracker | $9 | https://kerzy.gumroad.com/l/saixtz | /store/p/side-hustle-tax-tracker/ | live, Gumroad checkout |
| Roommate Bill Splitter | $7 | https://kerzy.gumroad.com/l/rqnxwg | /store/p/roommate-bill-splitter/ | live, Gumroad checkout |
| Estate Admin Checklist | $15 | https://kerzy.gumroad.com/l/dposil | /store/p/estate-admin-checklist/ | live, Gumroad checkout |
| Elder-Care Coordination Sheet | $12 | https://kerzy.gumroad.com/l/qnczxzg | /store/p/elder-care-coordination/ | live, Gumroad checkout |
| Kitchen Renovation Planner | $12 | https://kerzy.gumroad.com/l/hzqsvb | /store/p/kitchen-renovation-planner/ | live, Gumroad checkout |

Count: **72** paid catalog products. All use `https://kerzy.gumroad.com/l/<id>`. Session Forge is pay-what-you-want (`$14.99+`).

### 1b. Live on the store, but missing from catalog.json

| Product | Price shown | Gumroad URL | Where linked | Status |
|---|---|---|---|---|
| Humanity X: Off the Ground | $9.99 | https://kerzy.gumroad.com/l/umndpu | /store/p/humanity-x-off-the-ground/ and /p/humanity-x-off-the-ground/ | live, missing from catalog.json |
| Humanity X: Into The Stars | $9.99 | https://kerzy.gumroad.com/l/sgrnpe | /store/p/humanity-x-into-the-stars/ and /p/humanity-x-into-the-stars/ | live, missing from catalog.json |
| Humanity X: Books 1 + 2 (Ebook Pack) | $14.99 (was $19.98) | https://kerzy.gumroad.com/l/egrywe | /store/p/humanity-x-books-1-2/ | live, missing from catalog.json |

### 1c. Free beta still issued through Gumroad

| Product | Price shown | Gumroad URL | Where linked | Status |
|---|---|---|---|---|
| PlanetView Live | Free beta (list $24, coupon DUFREEPV) | https://kerzy.gumroad.com/l/oxnfvy | Catalog CTA still points at Gumroad, but `/store/` card and footer send people to `/free-planetview/` email signup; gift email then sends the same Gumroad URL with `?code=DUFREEPV`. Playable at `/planetview/`. | Free beta. License key comes from the Gumroad 100%-off code (capped at 1,000 uses). |
| Pantry Week | Free beta | https://kerzy.gumroad.com/l/jhagho | `/store/p/pantry-week/`, `/p/pantry-week/`, `/store/` card, marketplace listing visits `/p/pantry-week/` | Free beta. Hosted app is encrypted (`app.bin`); buyer code from the Gumroad receipt unlocks it. |

### 1d. Free products that still go to Gumroad for the file

| Product | Price shown | Gumroad URL | Store page | Status |
|---|---|---|---|---|
| The Brave Little Beaver | Free | https://kerzy.gumroad.com/l/bukwxo | /store/p/the-brave-little-beaver/ | free, delivery still via Gumroad |
| The Day Ethan Chose Kindness | Free | https://kerzy.gumroad.com/l/efouck | /store/p/the-day-ethan-chose-kindness/ | free, delivery still via Gumroad |
| Tilly's Big Cleanup | Free | https://kerzy.gumroad.com/l/vlaqmh | /store/p/tilly-s-big-cleanup/ | free, delivery still via Gumroad |
| A New Friend – A Brighter Day | Free | https://kerzy.gumroad.com/l/vzfysf | /store/p/a-new-friend-a-brighter-day/ | free, delivery still via Gumroad |
| Due Desk | Free | https://kerzy.gumroad.com/l/gfbgve | /store/p/due-desk/ | free, delivery still via Gumroad |
| Exam Desk | Free | https://kerzy.gumroad.com/l/zpqpto | /store/p/exam-desk/ | free, delivery still via Gumroad |
| Hook Bank | Free | https://kerzy.gumroad.com/l/vusus | /store/p/hook-bank/ | free, delivery still via Gumroad |
| Promo Lane | Free | https://kerzy.gumroad.com/l/mlrnfq | /store/p/promo-lane/ | free, delivery still via Gumroad |
| Launch Day Kit | Free | https://kerzy.gumroad.com/l/dvzvtb | /store/p/launch-day-kit/ | free, delivery still via Gumroad |
| Listing Kit | Free | https://kerzy.gumroad.com/l/rmczwy | /store/p/listing-kit/ | free, delivery still via Gumroad |
| Changelog Kit | Free | https://kerzy.gumroad.com/l/wvinsa | /store/p/changelog-kit/ | free, delivery still via Gumroad |
| Pricing Page Kit | Free | https://kerzy.gumroad.com/l/goxgg | /store/p/pricing-page-kit/ | free, delivery still via Gumroad |
| Cold DM Kit | Free | https://kerzy.gumroad.com/l/qscmoo | /store/p/cold-dm-kit/ | free, delivery still via Gumroad |
| Testimonial Kit | Free | https://kerzy.gumroad.com/l/nmpiw | /store/p/testimonial-kit/ | free, delivery still via Gumroad |
| Onboarding Email Kit | Free | https://kerzy.gumroad.com/l/fixdjo | /store/p/onboarding-email-kit/ | free, delivery still via Gumroad |
| Weekly Budget Kit | Free | https://kerzy.gumroad.com/l/fvrnct | /store/p/weekly-budget-kit/ | free, delivery still via Gumroad |

These are the 16 free catalog items that still collect the file through Gumroad. PlanetView and Pantry Week are listed only in 1c above. Hook Bank, Promo Lane, Due Desk, Exam Desk and several “kits” still collect the file through Gumroad even though the price is Free.

**43 other free tools** already open on digitalundergroundstore.com (`/tools/...`) and do not use Gumroad. They need no Stripe work.

### 1e. Coming soon (catalog says preview only; store HTML is stale)

| Product | Planned price | Catalog CTA | Status |
|---|---|---|---|
| 3D Print Cost Calculator | $8 | Coming soon · preview → /store/p/3d-print-cost-calculator/ | coming soon in catalog.json (gumroad field empty) |
| Subscription Box Profit Planner | $9 | Coming soon · preview → /store/p/subscription-box-planner/ | coming soon in catalog.json (gumroad field empty) |
| Maker Hourly Rate Calculator | $8 | Coming soon · preview → /store/p/maker-hourly-rate-calculator/ | coming soon in catalog.json (gumroad field empty) |
| Maker Cash Flow Forecast | $9 | Coming soon · preview → /store/p/maker-cash-flow-forecast/ | coming soon in catalog.json (gumroad field empty) |
| Product Bundle Pricing Calculator | $9 | Coming soon · preview → /store/p/product-bundle-pricing-calculator/ | coming soon in catalog.json (gumroad field empty) |
| EV Charging Cost Calculator | $7 | Coming soon · preview → /store/p/ev-charging-cost-calculator/ | coming soon in catalog.json (gumroad field empty) |
| Rent vs Buy Calculator | $8 | Coming soon · preview → /store/p/rent-vs-buy-calculator/ | coming soon in catalog.json (gumroad field empty) |
| Home Solar Payback Calculator | $8 | Coming soon · preview → /store/p/home-solar-payback-calculator/ | coming soon in catalog.json (gumroad field empty) |
| Recipe Cups to Grams Converter | $7 | Coming soon · preview → /store/p/recipe-unit-converter/ | coming soon in catalog.json (gumroad field empty) |
| Exam Countdown Study Planner | $7 | Coming soon · preview → /store/p/exam-study-planner/ | coming soon in catalog.json (gumroad field empty) |
| Party Food Quantity Calculator | $7 | Coming soon · preview → /store/p/party-food-quantity-calculator/ | coming soon in catalog.json (gumroad field empty) |
| Fuel Economy Log | $7 | Coming soon · preview → /store/p/fuel-economy-log/ | coming soon in catalog.json (gumroad field empty) |
| Baby Feeding & Sleep Log | $7 | Coming soon · preview → /store/p/baby-feeding-sleep-log/ | coming soon in catalog.json (gumroad field empty) |
| Flooring & Tile Calculator | $7 | Coming soon · preview → /store/p/flooring-tile-calculator/ | coming soon in catalog.json (gumroad field empty) |
| Room Paint Calculator | $7 | Coming soon · preview → /store/p/room-paint-calculator/ | coming soon in catalog.json (gumroad field empty) |

**Drift:** `/workspace/du-good/store/index.html` still shows **Buy** buttons to Gumroad for at least the first five of these (`alugq`, `saemg`, `fabovb`, `wiqjy`, `pltgr`). Those IDs are not in current `catalog.json`. The generated storefront is out of date versus the catalog. Do not “fix” this as part of a Stripe swap without Donald confirming whether those products are actually for sale.

### 1f. Hidden, unpublished, or only in the old catalogue

| Product | Price | Gumroad URL | Where linked | Status |
|---|---|---|---|---|
| Airhand (Early Access) | $6.99 (marketplace says CA$6.99) | https://kerzy.gumroad.com/l/fifcuh (not linked on site) | /p/airhand/ redirects to /store/; marketplace cm_du_airhand | hidden. Buy buttons stay hidden until Donald says. Listing visits airhand.pages.dev. Share-page generator marks hidden:True. |
| Bored Blocks | CAD$9 (Oct 8 catalogue) | https://kerzy.gumroad.com/l/bxacp | not on current store catalog or /p/ pages | retired or unlisted. In /workspace/digital-underground/product-catalogue.md and HANDOFF.md. Not in catalog.json. Confirm whether to retire. |
| GrokMate Phone (old listing) | — | https://kerzy.gumroad.com/l/hxpmp (unpublished) | unpublished on Gumroad | unpublished. Oct catalogue: no longer sold separately; included with GrokMate/PlainHelp (ozzrh). |

PlainHelp Ai (`/store/p/plainhelp/`, Gumroad `ozzrh`, $39) is the current name for what the Oct catalogue called **GrokMate**. The same Gumroad product still licenses `plainhelp/`, `grokmate/`, and `voice-companion/` via the Gumroad license API.

## 2. Every place Gumroad is linked, by risk

Gumroad shows up in well over a thousand files under `/workspace/du-good`, but almost all of those are **generated** from a short list of sources. Change the sources, regenerate, then ship through the sealed release process. Do not hand-edit 1,300 product pages.

### High risk — `/store/` is under the release freeze

Each of these needs the **one-file exception process, per file**, then the exception removed after the release (same process used for the Maker Pro page). A catalog regen will touch many store files at once, so plan tight, reviewed exceptions rather than a blanket thaw.

| Area | What links to Gumroad | Notes |
|---|---|---|
| `/workspace/du-good/scripts/store/catalog.json` | `cta_href` + `gumroad` id on 90 products | **Source of truth** for most Buy buttons. |
| `scripts/gen-store.py` | Hard-coded Offer Desk spotlight (`https://kerzy.gumroad.com/l/bhrrtz`); PlanetView special-case still aware of Gumroad `oxnfvy` / code `DUFREEPV` | Regenerates `store/index.html`. |
| `store/index.html` | Offer Desk spotlight, almost every paid/free-Gumroad card CTA, leftover Buy links on coming-soon cards | Generated. Freeze applies. |
| `store/p/<slug>/index.html` (~1,304 pages) | Buy / Get free buttons, “Buying on Gumroad” FAQ, JSON-LD `offers.url`, sticky buy bars | Generated from catalog + overrides. Freeze applies **per file** if shipped piecemeal. Humanity X pages are custom and not in catalog.json. |
| `store/series/humanity-x/`, `store/thrillers/` | Book series pages with Gumroad CTAs | Freeze applies. |
| `src/store-overrides/p/*/index.html` | Large generated override tree; many mention Gumroad the same way as store pages | Source for a subset of product pages. Freeze applies once copied into `store/`. |
| `store/p/maker-pro/` | Already Stripe; no Gumroad | Leave alone. |

### Medium risk — live site, not all under the store freeze, still user-facing

| Area | What links to Gumroad | Notes |
|---|---|---|
| `scripts/generate-product-share-pages.py` | `checkout_url()` always returns `https://kerzy.gumroad.com/l/{code}`. Includes hidden Airhand `fifcuh`. | Regenerates `/p/<slug>/` share pages and `/p/index.json`. |
| `p/<slug>/index.html` (~35 share pages) | CTA + JSON-LD offers | Used in X posts and marketplace (Pantry Week). |
| `scripts/gen-landing.py` | `G="https://kerzy.gumroad.com/l/"` plus FAQ copy (“You pay once on Gumroad”) | Landing pages for freelance / student kits. |
| `scripts/add-jsonld.py` | Offer URL falls back to checkout; currency defaults to USD | SEO. |
| `functions/_lib/subscribers.js` | `GIFT_URL` and `AUDIO_URL` = `https://kerzy.gumroad.com/l/oxnfvy?code=DUFREEPV` | Newsletter signup gift email (Resend). This is how PlanetView free-beta licenses are issued. |
| `support/index.html`, terms-adjacent support copy | “Your download is in your Gumroad library and receipt email. Checkout is handled securely by Gumroad… Refunds go through Gumroad under Gumroad's refund policy.” | Must change when the first Stripe product goes live, or customers will be sent to the wrong library. |
| `plainhelp/js/license.js` + `js/config.js` (and copies in `grokmate/`, `voice-companion/`) | Live license check against `https://api.gumroad.com/v2/licenses/verify` with product id `7B2ojeO8ghmsuaqetQ6JRg==` | Refunds/chargebacks revoke access. Cannot switch checkout without a new license system and a path for existing Gumroad keys. |
| `pantry-week/unlock.js` | Encrypted `app.bin`; code comes from the Gumroad receipt link. Error copy: “Open your Pantry Week link from your Gumroad receipt…” | Buyer-code fulfillment, not just a file email. |
| Blog / tools copy | `blog/platforms-dont-pay-own-your-checkout/`, `blog/how-to-list-your-product/`, `blog/what-is-the-developer-marketplace/`, `blog/how-to-get-first-users-for-an-indie-app/`, plus some `/tools/*` kits that mention Gumroad in the copy | Informational; update after checkout actually moves. |
| `scripts/gen-blog.py`, `scripts/blog_posts_oct22.py`, `scripts/p-hero.py`, `scripts/patch-buyer-pwa.py`, `scripts/repair-buyer-pwa-html.py` | Generators / patchers that still know about Gumroad URLs or receipt links | Medium because a later regen could re-introduce old links. |
| Homepage / nav / footers | `index.html`, `public/assets/home-v3/home.js`, `public/assets/site-nav/site-nav.js` may mention Gumroad only via embedded marketplace data (third-party listings) or shared footer gift flow | Footer gift goes to `/free-planetview/`, which then emails the Gumroad code. |

### Lower risk / do not treat as “replace with our Stripe”

| Area | What it is | Action |
|---|---|---|
| Marketplace KV (`COMMUNITY_KV`, 111 approved listings read-only this audit) | **7 third-party listings** use other sellers' Gumroad shops (ClientReady Studio on `clientreadystudiohq.gumroad.com`, and imnobody on `shadowwhisper72.gumroad.com`), including `?ref=digitalunderground` and some Gumroad CDN images | **Do not replace.** These are makers' own checkouts. The marketplace promise is “zero cut, your checkout.” |
| `functions/_lib/community.js` | Owner-only `buyUrl` field is validated as `https://*.gumroad.com/` only | Leave for now, or later widen to allow a maker's Stripe/itch/etc. link. Not a DU product migration. |
| DU's own marketplace listings | Airhand (`cm_du_airhand`) visits `https://airhand.pages.dev/`, price CA$6.99, not on sale. Pantry Week visits `/p/pantry-week/`. Kerzy games visit kerzylabs.pages.dev. | No kerzy.gumroad.com links in these listings. |
| `/workspace/digital-underground/product-catalogue.md` and `/workspace/gerold-handoff/HANDOFF.md` | Internal catalogue / bot rules, prices in CAD, Gumroad store https://kerzy.gumroad.com/ | Update docs after the live swap, not before. |
| X / Buffer rules | Standing rule: links in store posts go to digitalundergroundstore.com, never straight to Gumroad | Keep that rule. Share pages (`/p/<slug>/`) still *button* to Gumroad today. |

### Email

- **Product delivery today** is Gumroad's own receipt + library, not a DU Resend template.
- **DU Resend** (`notify@digitalundergroundstore.com` via `COMMUNITY_NOTIFY_FROM`, plus the newsletter flow in `subscribers.js`) sends: marketplace listing notices, creator welcome / “your listing is live,” and the PlanetView signup gift that contains the Gumroad $0 code. Only the gift email is a checkout dependency.
- No other product-fulfillment email templates were found in `functions/`.

## 3. How fulfillment works today, and what Stripe would need

Stripe Payment Links (what Maker Pro already uses) **take payment and email a Stripe receipt**. They do **not** attach a product file, issue a license key, or give the buyer a library to re-download later. There are **zero** Stripe webhooks configured today. After-completion is “hosted confirmation,” except the tip link which redirects home.

### Today on Gumroad (three fulfillment styles)

1. **File delivery (most products).** Buyer pays (or claims a free item) on `kerzy.gumroad.com`. Gumroad emails a receipt with a download link and keeps the file in the buyer's Gumroad library (`gumroad.com/library`). Store and book pages literally tell people this. Typical files: DRM-free EPUB/PDF (books), self-contained HTML tools that run offline in a browser, prompt packs, checklists, kits. Offer Desk copy even says “one link in your receipt — unlock and install, no download.”
2. **License-gated apps (PlainHelp Ai / GrokMate / voice-companion, and PlanetView).** After purchase (or the $0 PlanetView code), Gumroad issues a license key. The app POSTs that key to `https://api.gumroad.com/v2/licenses/verify`. Refunds, chargebacks, and open disputes revoke access. Keys are rechecked about every 7 days when online.
3. **Buyer-code encrypted PWA (Pantry Week).** The hosted tool lives only in encrypted `app.bin`. The code from the Gumroad receipt (and the receipt link) derives the unlock key. Without that code the file is unreadable. This is separate from the Gumroad license API.

Bundles (Complete Freelance Suite, AI Creator Bundle, Focus & Habits Pack, Freelance Admin Stack, Humanity X 1+2 pack) are single Gumroad listings that deliver several files. Stripe has no Gumroad-style “bundle product” unless we build one (multiple line items, or one Price that unlocks several downloads).

Pay-what-you-want (Session Forge `$14.99+`, and historically some free `$0+` items) is native on Gumroad. Stripe can do a custom amount (as the tip link does) or a minimum price, but it is a different setup than a fixed Price.

### What each Stripe Payment Link would need before a Buy button is switched

- A Stripe Product + Price (currency decided first) and a Payment Link or Checkout Session.
- **Post-purchase file delivery:** either a `checkout.session.completed` webhook that emails a signed download link from Resend (`notify@digitalundergroundstore.com`), or an after-payment redirect to a thank-you page that verifies `session_id` and then starts the download / unlock.
- **Receipts:** Stripe's receipt is fine for the charge; the email must also say how to get the file. Lost-file support cannot say “open your Gumroad library.”
- **A library / re-download path** to replace gumroad.com/library (account on the site, or a signed “email me my files again” link).
- **License-gated apps:** a DU license issuer (webhook mints a key, app verifies against us, refunds revoke it). Existing Gumroad keys must keep working.
- **Pantry Week:** a way to issue the same style of buyer code after a Stripe payment (or keep the current free-beta Gumroad path until that exists).
- **Automatic tax:** already on for Maker Pro; decide whether it applies to one-time product prices (it changes the amount charged).
- **Do not turn off Gumroad** until the new path is proven and old buyers are covered.

## 4. Recommended order (one piece at a time, smallest first)

Do not batch-replace “everything.” Each step is its own Stripe create (when approved) + one site change + a check, then stop for Donald's look.

0. **Decisions only (this document).** Donald answers the questions in section 5. No site or Stripe writes until then.
1. **Pilot: one simple paid file, no license gate.** Best first candidates: **Null Harbor ($4.99)** or **Humanity X: Off the Ground ($9.99)** — a DRM-free ebook, instant download, no app unlock. Create one Stripe product, one payment link, a thank-you or Resend download email, and swap **one** store product page (one-file freeze exception). Leave the Gumroad URL in the page source commented or as a rollback. Buy it once as a real test, confirm file + receipt, then keep or roll back.
2. **The other file-only paid books** (He Came Home Without Her, Humanity X book 2, then the $14.99 pack). Same fulfillment pattern, one product at a time.
3. **Simple paid HTML tools** with no license API (start with one, e.g. Scope Lock $12 or Reply Forge $9; then Invoice Desk, Offer Desk, Rate Wire, etc.). Still need the download-or-unlock-from-receipt flow.
4. **Free Gumroad items that already have a `/tools/` home** can drop Gumroad without Stripe (just point the store CTA at the on-site tool). Free items that only exist as a Gumroad file should be hosted on the site or given a $0 claim flow — no Payment Link required.
5. **Bundles**, after their member products already deliver on Stripe, so one payment can unlock several files.
6. **License-gated and encrypted apps last:** PlainHelp, PlanetView, Pantry Week. These need a license/code issuer, grandfathering of Gumroad keys, and (for PlanetView) a replacement for the newsletter gift code `DUFREEPV`. Keep them on Gumroad until that is built and tested.
7. **Airhand** only when Donald unhides the Buy buttons, and only after the license/PWA path is decided. Do not put a Stripe button on a hidden page or the marketplace listing yet.
8. **Support, terms, and refund copy** as soon as the first real Stripe sale works, so we stop sending people to Gumroad's library and Gumroad's refund policy.
9. **Coming-soon calculators and unlisted catalogue items** (Bored Blocks, old GrokMate Phone) stay off Stripe until Donald says they are for sale or retired.
10. **Marketplace third-party Gumroad links and Kerzy Labs:** never part of this migration.

## 5. Questions Donald must answer

1. **Currency.** Charge **USD** (matches live store copy, JSON-LD, and Maker Pro) or **CAD** (Stripe account default, Oct 8 catalogue, Airhand listing)? Pick one and apply it consistently.
2. **Prices.** Keep the numbers as shown (e.g. $19 stays $19 in the chosen currency), or convert from the Oct 8 CAD list?
3. **Session Forge** is `$14.99+` pay-what-you-want. Fixed price, or a Stripe custom-amount link with a $14.99 minimum?
4. **Automatic tax.** Turn it on for these one-time products (as with Maker Pro), knowing the buyer may pay more than the sticker price?
5. **What to retire or leave unlisted.** Confirm Bored Blocks, the old GrokMate Phone listing, and the 15 “coming soon” calculators. The live `store/index.html` still has Buy links to Gumroad for some of those calculators — should those be for sale, or should the storefront be brought in line with catalog.json (preview only)?
6. **Humanity X.** The two books and the $14.99 pack are live but missing from `catalog.json`. Include them in the Stripe catalog and add them to catalog.json, or leave them as hand-maintained pages?
7. **First pilot.** Null Harbor ($4.99) vs Humanity X: Off the Ground ($9.99), or a different simple file product?
8. **Existing Gumroad buyers.** Keep Gumroad library access forever for old purchases? We will need that if we do not rebuild a library on day one.
9. **Free products.** Host the files on our site and stop sending people to Gumroad, or keep a $0 claim flow?
10. **Refund policy.** Once we leave Gumroad's policy, what is DU's refund window and who processes refunds (Donald, or Alpha with the existing full-access key, case by case)?
11. **Airhand price and timing.** Site/share page $6.99, marketplace CA$6.99, old catalogue CAD$15. Which price, and still hidden?
12. **PlanetView / Pantry Week.** Stay on the current free-beta Gumroad path until a license/code system exists (recommended), or try to move them earlier?

## What I will not do until you say so

- No Stripe product/price/payment-link creates.
- No deploys, no `/workspace/du-good` edits, no KV writes.
- No change to Maker Pro or the tip link.
- No Airhand Buy button.
- No touch of Kerzy Labs or other makers' Gumroad listings.

Working files for this audit: `/workspace/stripe-nov11/catalog-products.csv`, `catalog-products.json`, and this plan. Stripe API responses used for the inventory live under `/workspace/stripe-nov11/stripe/` (no secret keys stored in the plan).
