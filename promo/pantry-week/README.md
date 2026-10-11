# Pantry Week promo

Sources for the 26-second Instagram, Facebook, and X promo. The finished files are `pantry-week-promo-vertical.mp4` (1080×1920) and `pantry-week-promo-square.mp4` (1080×1080).

`capture/index.html` is the walkthrough that gets recorded. It does not replace the buyer-locked app in `/pantry-week/`. Shot list is in `SCRIPT.md`. Music credit is in `AUDIO-CREDITS.md`.

Rebuild the frames with `node render.mjs vertical` or `node render.mjs square` after `npm install puppeteer-core`. Chrome has to be installed. Pass `--encode --audio=audio/feeling-happy-bed.m4a --video=out.mp4` to write the H.264 file in the same step.
