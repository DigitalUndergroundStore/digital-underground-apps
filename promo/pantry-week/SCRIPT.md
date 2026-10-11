# Pantry Week 2.0 promo

26-second vertical (1080×1920) and square (1080×1080) cuts. 30 fps H.264. The words on screen carry the story with the sound off.

Price on screen is CAD$24. The store line is digitalundergroundstore.com. Gumroad is not shown.

The pictures inside the phone and tablet are screen recordings of the real Pantry Week app (`pantry-week/`), unlocked locally for the shoot. The app files in the repo are unchanged.

## Story

| Time | On-screen words | What you see |
| --- | --- | --- |
| 0.00–1.72 | What's for dinner? Again? | Bright hook. Full type on the first frame. |
| 1.58–6.15 | Pick the meals | Phone. Tap Tonight on Lemon Herb Chicken, then pick Tomato Basil Pasta for Monday dinner. |
| 6.15–10.70 | The week fills in | Tap Fill a simple week. Monday shows Overnight Oats Jars, Chickpea Grain Bowls, and Lemon Herb Chicken. |
| 10.70–16.15 | Shop by aisle | Phone shopping list, 86 to buy, grouped by aisle. Tap Have it on green beans. |
| 16.15–21.15 | Print it. Works offline. | Tablet. The print sheet: this week's menu and the shopping list. |
| 21.00–26.00 | Pantry Week, CAD$24, Pay once, digitalundergroundstore.com | End card. No subscription. No account. |

Captions sit below the top 250px. The end card is centered in that safe area.

## Music

Feeling Happy by Ahjay Stelino. See `AUDIO-CREDITS.md`. The bed is `audio/feeling-happy-bed.m4a`.

## Rebuild

`record-app.mjs` drives the local app and writes PNGs. It reads the buyer code from a file you pass on the command line and does not print it. `render.mjs` composites those PNGs into the phone and tablet frames.

```bash
cd promo/pantry-week
npm install puppeteer-core
# serve pantry-week/ at http://127.0.0.1:8765
node record-app.mjs /path/to/buyer-code.txt
node render.mjs vertical --out=/tmp/pw-frames-vertical --encode --audio=audio/feeling-happy-bed.m4a --video=/tmp/pantry-week-promo-vertical.mp4
node render.mjs square --out=/tmp/pw-frames-square --encode --audio=audio/feeling-happy-bed.m4a --video=/tmp/pantry-week-promo-square.mp4
```
