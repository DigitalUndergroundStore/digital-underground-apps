# Pantry Week 2.0 promo

Vertical and square cuts of the same 26-second story. Both are 30 fps H.264. On-screen words carry the story when the sound is off.

Price on screen is CAD$24. The store line is digitalundergroundstore.com. Gumroad is not shown.

## Story

| Time | Scene | On-screen words | What moves |
| --- | --- | --- | --- |
| 0.00–1.85 | Hook | What's for dinner? Again? | Type is on the first frame. No fade-in. |
| 1.67–7.45 | Pick meals | Pick the meals | Three 30-minute dinners are tapped onto the week: Lemon chicken, Green bean skillet, Tomato basil pasta. Filters shown: Quick, Vegetarian, Gluten-free, Dairy-free. |
| 7.27–12.65 | Week | The week fills in | Monday through Sunday fill in. Thursday is marked Leftovers. Counter runs up to 7 dinners. |
| 12.47–18.25 | Shopping list | Shop by aisle | Produce, Dairy, Pantry, and an extra Household line. Quantities are already combined. Basil is marked Have it. Copy list as text and Print stay on screen. |
| 18.07–21.65 | Print | Print it. Works offline. | A printable week plus the aisle list. |
| 21.47–26.00 | End card | Pantry Week / CAD$24 / Pay once. / digitalundergroundstore.com / No subscription. No account. | Holds to the last frame. |

Captions and body type sit inside a 264px inset on the vertical cut and a 276px inset on the square cut, clear of the top and bottom Reels bars.

## Sample week

The capture uses one sample week so the shopping list matches the meals: basil, green beans, lemons, parmesan, spaghetti, plus paper towels as an extra item. Those produce lines are the same items shown on the current vertical ad. The 36-recipe count, 30-minute dinners, diet filters, leftovers, aisle totals, Have it, copy, print, and offline use are the v2.0 feature claims.

The phone app in `pantry-week/` is the encrypted buyer build (`app.bin`). This folder does not change that app. `capture/index.html` is the walkthrough that was screen-recorded.

## Rebuild

```bash
cd promo/pantry-week
npm install puppeteer-core
node render.mjs vertical --out=/tmp/pw-frames-vertical
node render.mjs square --out=/tmp/pw-frames-square
```

`render.mjs` can also encode when given `--encode --audio=audio/feeling-happy-bed.m4a --video=...`.
