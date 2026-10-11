# Pantry Week promo

Sources for the 26-second Instagram, Facebook, and X promo. The finished files are `pantry-week-promo-vertical.mp4` (1080×1920) and `pantry-week-promo-square.mp4` (1080×1080).

`footage/` holds screen recordings of the live Pantry Week app (v3.3.1). `capture/index.html` places those recordings in phone and tablet frames, with the full screen visible, on the approved motion background. The app in `/pantry-week/` is unchanged. Shot list is in `SCRIPT.md`. Music credit is in `AUDIO-CREDITS.md`. The delivered MP4s are still the earlier cut. The next render also adds the Import recipes scene once that feature is live.

`record-app.mjs` re-records the app. Pass it a local code file. It does not print the code. Then `node render.mjs vertical` or `node render.mjs square` after `npm install puppeteer-core`. Pass `--encode --audio=audio/feeling-happy-bed.m4a --video=out.mp4` to write the H.264 file.
