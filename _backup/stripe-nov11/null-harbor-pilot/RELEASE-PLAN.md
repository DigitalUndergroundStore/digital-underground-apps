# Staged release plan — Null Harbor Stripe pilot (not published)

Rollback target if this later ships: current production Pages id **`2aab0561`** (digest `805e6400103a56c2dfb73de974558a0f45d887254f960c60b6383a83d93deba4`), after Maker Pro v4. Do not deploy this Phase 1 work.

Source of new files (do not edit the shared dirty `/workspace/du-good` store tree until publish): `/workspace/stripe-nov11/null-harbor-pilot/`.

## Allowlist (exact files)

Copy into `/workspace/du-good` only at publish time, then stage with `scripts/release.sh`:

```
functions/_lib/crypto-util.js
functions/_lib/store-skus.js
functions/_lib/stripe-signature.js
functions/_lib/download-token.js
functions/_lib/fulfillment.js
functions/api/stripe/webhook.js
functions/api/store/download.js
functions/api/store/session-download.js
thanks/index.html
store/p/null-harbor/index.html
-.du-prod-ok
```

`store/p/null-harbor/index.html` is the only store file. Use a temporary one-file freeze exception (same pattern as Maker Pro: `forbidden_path` + assert vs known-good, limited to that path), then revert `scripts/release.sh` to `/workspace/stripe-nov11/release.sh.before-exception` (sha256 `cf317e372c2f816dfb32cfaa0f26fff9764a50f8b193617e081ea225742e5761`). Do not stage dirty `assets/site-nav/site-nav.css`. Do not mix this with other store edits.

The staged (unpublished) page swap is already written at:

`page-swap/null-harbor.index.html`

It points the Null Harbor Buy buttons, sticky CTA, and JSON-LD offer at `https://buy.stripe.com/bJe6oJ65CfJveoS2me0ZW04`, updates checkout copy to Stripe, and adds a re-download path to `/thanks/?sku=null-harbor`. The Gumroad URL `https://kerzy.gumroad.com/l/jcazp` is left in an HTML comment for rollback. Related-product Gumroad links on that page are unchanged. The live worktree file was not modified.

## Release commands (when Donald approves a publish — not now)

1. Confirm Cloudflare secrets, DOWNLOADS_KV files, and (then) the Stripe webhook endpoint exist.
2. Copy the allowlisted files into `/workspace/du-good` (page swap over `store/p/null-harbor/index.html` only for the stage).
3. Apply the one-file exception. `./scripts/release.sh stage --allowlist <this list>`.
4. `execute` → layout shots → attest. If `RELEASE.txt` has no `class production` line, append it after execute (same as recent releases).
5. Unlock, `CLOUDFLARE_API_TOKEN="$CLOUDFLARE_KV_API_TOKEN"`, `CLOUDFLARE_ACCOUNT_ID=89c87c2f93e2a2f89147d44259d5d542`, box-owned `/tmp/node_modules/.cache`, `deploy --digest <DIGEST>`.
6. Restore lock `433fea1d4727151c276e1c2f8ab3ed26f165c96e17be9b997a9174de31e4420f`. Revert `release.sh`. Restore the worktree Null Harbor page only if the copy was meant to stay unpublished in git; after a successful publish the swapped file is the new source.
7. Verify: Buy buttons are Stripe; `/thanks/` 200; a 100% off (single-use) test purchase delivers email + files; Gumroad left as comment; homepage and one other product page unchanged.

## What was not staged in Phase 1

No `release.sh` stage or deploy was run. No sealed digest. Production remains `2aab0561`. The live `/store/p/null-harbor/` Buy button is still Gumroad.
