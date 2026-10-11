# Pantry Week 3.3.1 promo

26-second vertical (1080×1920) and square (1080×1080) cuts. 30 fps H.264. The words on screen carry the story with the sound off.

Price on screen is CAD$24. The store line is digitalundergroundstore.com. Gumroad is not shown.

The pictures inside the phone and tablet are screen recordings of the live app at `https://digitalundergroundstore.com/pantry-week/` (v3.3.1). The app files in this repo are unchanged.

## Story

| Time | On-screen words | What you see |
| --- | --- | --- |
| 0.00–1.55 | What's for dinner? Again? | Bright hook. |
| 1.52–4.70 | 248 recipes, then Canadian meals | Phone. Photo cards, tap the Canadian filter. |
| 4.60–8.25 | Fill a simple week, then the week fills in | Dinners only, Lunch + dinner, All three meals. Then the filled week. |
| 8.15–13.15 | Shop by aisle, then Have it | Produce aisle, tap Have it. |
| 13.05–16.85 | Smart Chef, then Cook from what you have | A built recipe, then the pantry matches and Share. |
| 16.75–19.15 | Swipe between tabs | The plan slides to the recipe box. |
| 19.05–21.15 | 248 recipes | Tablet. Canadian photo grid. |
| 21.00–26.00 | Pantry Week, CAD$24, Pay once, digitalundergroundstore.com | End card. |

Captions sit below the top 250px and above the device. The phone and the tablet are scaled to fit inside the frame. Each screenshot fills the device screen with no crop.

## Music

Feeling Happy by Ahjay Stelino. See `AUDIO-CREDITS.md`.

## Rebuild

`record-app.mjs` opens the live app. Pass it a local code file. It does not print the code.

```bash
cd promo/pantry-week
npm install puppeteer-core
node record-app.mjs /path/to/buyer-code.txt
node render.mjs vertical --out=/tmp/pw-frames-vertical --encode --audio=audio/feeling-happy-bed.m4a --video=/tmp/pantry-week-promo-vertical.mp4
node render.mjs square --out=/tmp/pw-frames-square --encode --audio=audio/feeling-happy-bed.m4a --video=/tmp/pantry-week-promo-square.mp4
```
