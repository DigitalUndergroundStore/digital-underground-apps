# Hosted photo cleanup (follow-up to v3.3.0)

**Scope:** `pantry-week/photos/r{id}.webp` only — filenames unchanged; no `app.bin` rebuild.

**What changed:** Manual vision review (contact sheet in 16-tile batches) plus owner-flagged fixes. Replacements are Wikimedia Commons (CC) stills chosen to match dish type or title.

**`photos.js`:** No structural change required — keys remain `r1`…`r248` pointing at the same paths. After merge, optional sanity check: `BY_ID['r6']` etc. still resolve to `photos/r6.webp` on the hosted CDN.

**Audit:** See `PHOTO_CLEANUP_IDS.json` for the recipe ids updated in this pass.

**Regenerate contact sheet (local):**

```bash
python3 pantry-week/scripts/make-review-batches.py
```
