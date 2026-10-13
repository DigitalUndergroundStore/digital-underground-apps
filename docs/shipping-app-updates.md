# Shipping updates to installed buyer apps

Hosted buyer apps (folders with `unlock.js` + `app.bin`) update over the air through the **service worker** and a shared **update toast**. Buyer unlock keys (`localStorage` / `sessionStorage`) and in-app data are never stored in the SW cache, so they survive updates.

## What buyers see

1. You deploy a new build to `main` (Cloudflare Pages).
2. On the next visit (or within about an hour), the browser downloads the new `sw.js`.
3. A small toast appears: **“Update available — tap to refresh.”**
4. After tap, the new shell loads. Unlock and saved plan data remain (same storage keys).

## How to ship a new version

### 1. Bump the build id

In `<app>/unlock.js`, change the `CFG.build` string (timestamp + short hash), e.g.:

```js
var CFG = { salt: "…", iter: 250000, build: "202610111430-a1b2c3d4" };
```

Update matching query strings on the same files:

- `unlock.js?v=…` in `index.html` (and subpages)
- `app.bin?v=…` inside `unlock.js` `getBin()`
- `FILES` entries in `sw.js` for `unlock.js?v=…` and `app.bin?v=…`

### 2. Regenerate service workers (recommended)

```bash
python3 tools/generate-hosted-sw.py
```

This rewrites each app’s `sw.js` from `assets/buyer/sw-hosted-template.js`, sets `version.json`, and wires `pwa-update.js` into unlock shells.

### 3. Rebuild encrypted payload (if the tool changed)

Pantry Week and other encrypted apps: rebuild `app.bin` with the product build script (see `README.md`). **Do not change** `CFG.salt`, `iter`, or `additionalData` unless you intend a new product generation.

### 4. Merge to `main`

Cloudflare Pages deploys automatically. Verify:

- `curl -I https://digitalundergroundstore.com/<app>/sw.js`
- `curl https://digitalundergroundstore.com/<app>/version.json`

### 5. Storage keys (do not rename casually)

| App | Unlock storage key |
|-----|-------------------|
| Pantry Week | `du_pantry_week_key_v1` |
| Others | `du_<slug>_key_v1` (see each `unlock.js`) |

In-app data keys live inside `app.bin` source. When changing schema, add a **migration** in the app JS that reads the previous key and writes the new shape.

## Service worker strategy

- **Navigation (`index.html`)**: network-first, fall back to cache (fresh shell when online).
- **`app.bin`, `unlock.js`, `version.json`**: network-first when online (offline falls back to cache). Prevents stale recipe bundles on installed PWAs.
- **Other shell assets**: stale-while-revalidate (cache hit, background refresh).
- **Install**: worker calls `skipWaiting()` after precache; toast still posts `SKIP_WAITING` for manual refresh. `pwa-update.js` compares live `version.json` to the embedded build id.

## PlanetView & Cork

These are maintained separately. Bump the cache name in `planetview/sw.js` or `cork/sw.js` and follow the same toast pattern via `/assets/buyer/pwa-update.js` where wired.
