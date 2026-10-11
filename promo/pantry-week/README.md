# Pantry Week promo

Sources for the 26-second Instagram, Facebook, and X promo. The finished files are `pantry-week-promo-vertical.mp4` (1080×1920) and `pantry-week-promo-square.mp4` (1080×1080).

`footage/` holds screen recordings of the real Pantry Week app. `capture/index.html` places those recordings in phone and tablet frames. The app in `/pantry-week/` is unchanged. Shot list is in `SCRIPT.md`. Music credit is in `AUDIO-CREDITS.md`.

`record-app.mjs` re-records the app. Pass it a local code file. It does not print the code. Then `node render.mjs vertical` or `node render.mjs square` after `npm install puppeteer-core`. Pass `--encode --audio=audio/feeling-happy-bed.m4a --video=out.mp4` to write the H.264 file.
