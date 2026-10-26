# Pantry Week source changelog

## 3.16.1 (2026-10-24)

- Meal photo uploads are now auto-screened on the server (Workers AI vision). Accepted meal photos are approved right away; non-meal, unsafe, people/screenshot photos are rejected and not saved; unclear results stay under review. Upload message now says which happened.

## 3.16.0 (2026-10-24)

Built on the live 3.15.x source (build 202610230345-pw3152; src/jhagho verified byte-identical to that app.bin before editing). Entries 3.6.1–3.15.2 were not recorded in this file.

- **Share a photo of a meal I made (new, uploads):** recipe page "📷 Share my meal photo" and a "Made it? Share a photo of your meal" button on the last Cook-mode step. Opens `js/meal-share.js`: take/choose a photo (resized on device to 1280px JPEG), optional credit name/handle, and a **required consent checkbox** ("saved to Pantry Week / Digital Underground … if it's a good shot it may be shown on the website or in promotion … reviewed before anything is shown publicly"). Upload is multipart `POST /api/pantry-week/meal-photo` (functions/api/pantry-week/meal-photo.js; fields photo, consent=yes, consentText, recipeId, recipeName, displayName, appVersion), stored in COMMUNITY_KV (`pwmeal:img:/meta:/index`) with status `pending`; images are public only once approved. Owner review with COMMUNITY_ADMIN_TOKEN: `GET ?action=list&status=pending`, `POST ?action=approve|reject|delete&id=…`. The device remembers what it shared (localStorage `pantry_week_shared_meals`).
- Add from photo (OCR) and "Use my photo" are unchanged and still never upload.

## 3.6.0 (2026-10-11)

Built on 3.4.4 (same 248-recipe library and photos; 3.4.4 UI kept, including the Smart Chef "New idea" pill top-right).

- **Find more recipes:** Recipes tab searches the Wikimedia Cookbook via `/api/recipe-search` (titles, links, thumbnails only). Tapping a result fetches that one page through `/api/recipe-fetch` (Wikibooks branch) into the import preview; source credited "From Wikibooks (CC BY-SA)". Browser deep links for other recipe sites plus paste-a-link. Offline: "Find more needs internet".
- **Add from photo:** New recipe sheet has Take photo / Choose photo. Tesseract.js 5.1.1 lazy-loads only then; OCR text goes through the paste parser into the editable form. Nothing is uploaded.
- **Smart Chef sourcing:** library recipe first (best pantry fit), then one Cookbook recipe online (about 6 s), then the template builder labelled "Smart Chef original".

## 3.4.4 (2026-10-11)

- **Backdrop:** Pre-blurred food photo (`images/backdrop-food.webp`, 12 KB) with a light wash; gentle bokeh motion on Plan and empty states only (paused when hidden / reduced motion).
- **Cook from what you have:** `pantry-match.js` - groups Ready to cook / Missing 1 / Missing 2-3, assume-staples setting (flour, sugar, butter), synonym matching, 25 rows + infinite scroll, "Updated, N new matches" highlight, used-item chips, Smart Chef ideas interleaved.
- **Smart Chef:** "New idea" pill top-right of the result card; template validation (no stray "1 black beans" in BBQ ribs; steps only reference listed ingredients).
- **Plan:** Tonight card is tappable (chevron) and opens the recipe. **Cook mode:** expandable Ingredients panel.
- **Release fixes:** Cook list shows 25 rows and loads 25 more as you scroll; group headers never repeat (spotlight rows lead inside their own group; Smart Chef ideas sit in their group); nothing missing more than 3 is listed. Smart Chef "New idea" pill moved out of the card's open button (nested buttons broke the layout) to the card's top-right corner. Smart Chef steps only name listed ingredients (finishing garnishes, lime, beans, tomatoes, salsa, butter, crumbs, potatoes); profile seasonings only when in the pantry; burgers always list buns and use any cheese; no "1 each medium onion".
- **Library:** Unchanged from 3.4.3 (248 recipes, same photos). The 3.5.0 library/photo swap was held back: several replacement photos did not match their dish and nine photos were byte-identical duplicates.

## 3.5.0 (draft, not shipped)

- **Library overhaul:** Replaced 24 gimmicky / bowl-style / random recipes with well-loved classics (cheeseburgers, lasagna, BBQ ribs, pork chops dinner, shepherd's pie, grilled cheese & tomato soup, sloppy joes, tacos, fajitas, pot roast, etc.). Existing keepers tagged `classic` / `collection-classic`. Total remains **248** recipes.
- **Fill a simple week:** Strong preference for `classic` and familiar family dishes; de-prioritizes bowl-format titles.
- **Photos:** Re-curated heroes for all replaced IDs via Openverse + CLIP vision gate (`scripts/vision-curate-photos.py`). Manifest: `library-v350-manifest.json`.

## 3.4.3 (2026-10-11)

- **Pantry suggestions:** Canadian grocery synonym map (`pantry-normalize.js`) so “Cook from what you have” matches hamburger ↔ ground beef, white onion ↔ onion, ribs ↔ pork ribs, tortillas, pork chops, etc. List refreshes on every add/remove via existing render path.
- **Smart Chef:** Ingredient roles and template rules (no peanut butter frittatas, bread not a grain-bowl base); proper units for onion, garlic, peanut butter; coherent subsets; natural titles; more templates (burgers, BBQ ribs, pan chops, wraps, chili, hash, sandwiches). Dedupe on protein + dish type + flavour profile; never errors when pantry has protein or starch — falls back to a variation.
- **Smart Chef (Donald):** Classic home cooking first — cheeseburgers, pork chops, roast chicken, pot roast, meatloaf, spaghetti and meat sauce, shepherd's pie, grilled cheese, tacos, BBQ ribs, chili, stir-fry — with proper recipe names; grain bowls/curry/fusion deferred until classics are exhausted (`tools/audit-recipe-library.mjs` for library review).
- **Test:** `tools/test-smart-chef-donald.mjs` — 20 sensible unique recipes from Donald’s pantry.

## 3.4.2 (2026-10-11)

- **Backdrop:** Soft premium scene (aligned with store promo aurora: sage, lilac, sky) — static CSS gradient on every screen; gentle GPU-only orb drift on **Plan** and **empty states**. Pauses when the tab is hidden and when `prefers-reduced-motion` is on. Cards stay solid surfaces.
- **Import photos:** `photoUrl()` passes the full recipe into `PW_PHOTOS.urlFor` so imported `photoUrl` / `photoKey` are used (same fix as live build 202610111915-pw342).

## 3.4.1 (2026-10-11)

- **Import:** JSON-LD `image` supports string, URL arrays, `ImageObject`, and arrays of `ImageObject` (picks largest by width×height, e.g. BBC Good Food).
- **Link import:** Server fetch uses browser-like headers; blocked sites get a clear “paste recipe text instead” message (see hosted `/api/recipe-fetch`).

## 3.4.0 (2026-10-11)

- **Import:** More → Import from another app; empty-state link on Recipes. Paprika, Mela, schema.org JSON/JSON-LD, CSV column mapper, recipe-link fetch, and paste-text parser with editable preview. Tag **Imported**, name de-dupe, aisle assignment, generic dish photo or imported image URL.
- **Docs:** `pw-v322/docs/import-research.md` — competitor export research (Mealime: no documented bulk export).

## 3.3.1 (2026-10-11)

- **Smart Chef:** Guard `built.tags` when saving drafts (`built.tags || template.tags || []`) so save never throws on templates that omit tags on the built object.
- **Navigation:** Programmatic sheet/detail closes use `popHistorySilently()` so `history.back()` from Close/Cancel/Fill does not arm the Plan “Swipe back again to exit” toast.

## 3.3.0 (2026-10-11)

- **Library:** 248 recipes (`r1`–`r248`) including batch 2 comfort dinners, one-pan, BBQ, soups, pub, Tex-Mex, takeout-style, and breakfasts/lunches.
- **Photos:** Self-hosted WebP heroes for all 248 recipes with Openverse + Wikimedia sourcing, CLIP vision gate, type-generic fallbacks when needed, and `scripts/photo-verification-log.jsonl` audit trail; hosted copies under `pantry-week/photos/`.
- **Navigation:** Back/close on sheets and detail; Android/system back walks history; Plan root double-back toast (“Swipe back again to exit”); tab swipe with 24px edge guard.
- **Plan:** Tappable meal cards with thumbnails; compact actions.
- **More:** Settings with device-only note, app version, and remove buyer code; footer no longer shows build id or version.
- **Smart Chef:** Full recipe cards with offline hero photos; saved creations behave like library recipes.
- **List:** Manual extras use **Have it**; remove via menu, swipe, or long-press.

## 3.2.3 (2026-10-11)

- **Smart Chef (offline):** Pantry tab builds full recipes from pantry items using tested templates (stir-fry, pasta, skillet, sheet-pan, soup, curry, grain bowl, tacos, frittata, salad, fried rice, casserole) and flavor profiles (Italian, Asian, Mexican, Canadian comfort, Indian). Try another, save to **My creations**, add to plan, add missing items to the shopping list. No network or AI.
- **Smart Chef uniqueness:** Rejects near-duplicates of library or saved recipes (name, protein, template, key ingredients). Session and `localStorage` hash history so Try another and future sessions do not repeat prior Smart Chef drafts.

## 3.2.1 (2026-10-11)

- **Fill week:** Random picks from the full 126-recipe library on each fill; no duplicate recipes in the same week; variety across proteins and cuisines; respects active diet filters and search.
- **Fill options:** Sheet with segmented scope (dinners only, lunch + dinner, all three meals), “replace all” toggle, and remembered `fillPrefs` in `pantry_week_v2`.
- **Photos:** 126 unique Wikimedia Commons hero images (`photos.js`), with `scripts/build-photos-commons.py` to regenerate.
- **Version:** App shows semantic **3.2.1**; build id optional in More.

## 3.2.0 (2026-10-11)

- **Recipe library:** 126 built-in recipes (`r1`–`r126`): original 36 starters unchanged IDs, plus 90 new weeknight dishes (global bowls, curries, tacos, sheet-pan, pasta, breakfasts, snacks, desserts).
- **Tags:** Diet (vegetarian, vegan, gluten-free, dairy-free, high-protein), meal type, cost (budget / moderate / splurge), difficulty (easy / medium / hard), and quick (≤20 min) on catalog recipes.
- **Photos:** Per-recipe Unsplash hero images keyed by recipe id (`photos.js`).
- **Shopping:** Expanded aisle grouping for new ingredients; metric hints (grams) shown for lb/oz lines.
- **Data:** Still `pantry_week_v2`; missing starter recipes auto-merge on load; plans referencing `r1`–`r36` stay valid.
- **UI:** SVG tab icons, scrollable filters (vegan, high-protein, budget, etc.), masthead install banner (no floating overlap), dark mode polish, app version 3.2.0.
