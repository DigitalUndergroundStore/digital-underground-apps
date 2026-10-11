# Pantry Week 3.4.2 promo

Recorded from live build `202610111915-pw342`. The motion backdrop stays behind the devices. The Plan screen shows the app's own soft moving backdrop. Import keeps the recipe site's photo. The earlier promo files stay in place. This cut is a new pair of files.

26-second vertical (1080×1920) and square (1080×1080) cuts. 30 fps H.264. The words on screen carry the story with the sound off.

Price on screen is CAD$24. The store line is digitalundergroundstore.com. Gumroad is not shown.

The pictures inside the phone and tablet are screen recordings of the live app at `https://digitalundergroundstore.com/pantry-week/` (v3.4.2, build 202610111915-pw342). The app files in this repo are unchanged.

## Story

| Time | On-screen words | What you see |
| --- | --- | --- |
| 0.00–1.45 | What's for dinner? Again? | Hook, over the moving food backdrop. |
| 1.40–3.75 | 248 recipes, then Canadian meals | Phone. Photo cards, tap the Canadian filter. |
| 3.65–6.45 | Fill a simple week, then the week fills in | Dinners only, Lunch + dinner, All three meals. |
| 6.35–9.65 | Shop by aisle, then Have it | Produce aisle, tap Have it. |
| 9.55–11.90 | Smart Chef, then Cook from what you have | A built recipe, then the pantry matches and Share. |
| 11.80–13.55 | Swipe between tabs | The plan slides to the recipe box. |
| 13.45–15.05 | 248 recipes | Tablet. Canadian photo grid. |
| 14.95–21.15 | Switching apps? Bring your recipes. | Paste a recipe link, the preview fills, then it is saved in the recipe box. |
| 21.00–26.00 | Pantry Week, CAD$24, Pay once, digitalundergroundstore.com | End card. |

Captions sit below the top 250px and above the device. The phone and the tablet are scaled to fit inside the frame. Each screenshot fills the device screen with no crop.

## This cut

Import pastes the BBC Good Food easy chicken curry link. The preview fills with that page's photo, then the recipe is saved into the recipe box with the photo. The line on screen is "Switching apps? Bring your recipes."

The frame behind the devices is the approved motion look. On the Plan shot, the app's own soft backdrop drifts. The devices and the full screens stay sharp. Earlier promo MP4s stay where they are.

## Music

Feeling Happy by Ahjay Stelino. See `AUDIO-CREDITS.md`.

## Rebuild

`record-app.mjs` opens the live app. Pass it a local code file. It does not print the code.

```bash
cd promo/pantry-week
npm install puppeteer-core
node record-app.mjs /path/to/buyer-code.txt
node render.mjs vertical --out=/tmp/pw-frames-vertical --encode --audio=audio/feeling-happy-bed.m4a --video=/tmp/pantry-week-promo-v342-vertical.mp4
node render.mjs square --out=/tmp/pw-frames-square --encode --audio=audio/feeling-happy-bed.m4a --video=/tmp/pantry-week-promo-v342-square.mp4
```
