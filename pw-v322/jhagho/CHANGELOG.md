# Pantry Week source changelog

## 3.4.3 (2026-10-11)

- **Pantry suggestions:** Canadian grocery synonym map (`pantry-normalize.js`) so “Cook from what you have” matches hamburger ↔ ground beef, white onion ↔ onion, ribs ↔ pork ribs, tortillas, pork chops, etc. List refreshes on every add/remove via existing render path.
- **Smart Chef:** Ingredient roles and template rules (no peanut butter frittatas, bread not a grain-bowl base); proper units for onion, garlic, peanut butter; coherent subsets; natural titles; more templates (burgers, BBQ ribs, pan chops, wraps, chili, hash, sandwiches). Dedupe on protein + dish type + flavour profile; never errors when pantry has protein or starch — falls back to a variation.
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
