# Pantry Week source changelog

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
