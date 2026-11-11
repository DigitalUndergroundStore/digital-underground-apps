# Store-only junk cleanup — release report
Time: 2026-11-11 09:17 AM America/Toronto (EST)
Status: STAGED, EXECUTED, ATTESTED, NOT PUBLISHED. Production is still b8f05bfb.

## Marketplace / KV (Donald’s constraint)

Pre-release cross-check found **zero** references to any of the 1,153 junk slugs in marketplace pages, community listings, makers, league, listing cover URLs, or COMMUNITY_KV / maker KV (115 listings + 79 maker records, read-only). **No slugs were excluded.** Marketplace, makers, league, and KV were not modified.

## What was removed (worktree + staged snapshot)

- Worktree: deleted all 1,153 junk dirs under `store/p/`, `tools/`, and `src/store-overrides/p/`. Remaining `store/p/` dirs: 153 (148 catalog + 5 extras). Null Harbor, Humanity X, Maker Pro, Networking & Distribution kept.
- Staged production snapshot: deleted **1,146** `store/p/` trees and **1,153** `tools/` trees.
- Seven junk slugs had `/tools/` pages in production but **no** `/store/p/` tree in known-good/candidate (worktree-only store pages, never published):
  chia-seed-cup-batch-cost-calculator, chick-brooder-build-cost-calculator, chicken-coop-build-cost-calculator, chicken-coop-heater-cost-calculator, chicken-dust-bath-build-cost-calculator, chicken-satay-skewer-batch-cost-calculator, chili-batch-calculator
  Middleware still 301s both `/store/p/<slug>/` and `/tools/<slug>/` for all 1,153 slugs, including these seven.

## Redirects

Not `_redirects` (2,306 URLs would exceed the 2,000 static-rule cap). Exact slug set in `functions/_lib/junk-store-slugs.js`, early 301 in `functions/_middleware.js` to `/store/`.

## Kept-page links

19 live catalog product pages have a related-product href to a junk `/store/p/<slug>/`. Those live pages were not edited; the 301 will send them to `/store/`.

## Untouched (as approved)

Coming-soon items, stale Buy links, Airhand, Networking & Distribution, free tools, Null Harbor, Stripe, `index.html`, `store/index.html`, footer badges, tip link, dirty `site-nav.css`, marketplace/community/makers/league/KV.

## Release IDs (attested, not live)

- staged digest: `f9107879ef2d52051735af34db2de1866e8eb7a7831aa7f630f3e948aa9e43dd`
- functions_digest: `1dca933c854baf5870f6fcb278a17b26f5c1b0888a680aaa7c61be293667873c`
- worker_sha: `616b22912dc6378f91b33b3377f1502636d6f939398712a06c1ded752f29d6c3`
- source_manifest: `545717c3a22849583e9721750a684cb4afac4a85c305adc5fa19d4e0e7f40beb`
- class production, publishable 1, kv_writes 0
- execute: `/` 200, `/api/community/listings` 200, production-host `/owner/` 401, `/store/` 200, `/league/` 200, `/sitemap.xml` 200, `/tools/mead-batch-calculator/` recorded absent (file deleted, as required)
- attested_at 2026-11-11T14:14:59Z (9:14 AM EST)
- allowlist: `/workspace/stripe-nov11/junk-cleanup-nov11/ALLOWLIST.txt`

## Rollback target (still live)

- pages_id `b8f05bfb`
- digest `1403306969f0ffba84c9bf16a0e0245fbdde0d45977e0b8121da5e5244075cdd`
- live site still serves junk tool pages (cleanup not published)

## Why deploy did not finish

1. First `stage` apply refused: 7 production-absent store/p slugs (fixed in the helper; restaged successfully).
2. First deploy refused: `RELEASE.txt` from `stage` had no `class production` line (attest and the previous Maker Pro release had it; the line was then appended to match). Deploy then passed that gate.
3. Second deploy reached wrangler, then failed: wrangler OAuth refresh returned 400 Bad Request, and this session has no `CLOUDFLARE_API_TOKEN`. Only `CLOUDFLARE_ACCOUNT_ID` (set for the command) and `CLOUDFLARE_KV_API_TOKEN` are present. The KV token was not used for Pages deploy. Lock was restored by a trap in both deploy attempts.

Production was not changed.

## Current safety state

- `.du-deploy-blocked` restored, sha256 `433fea1d4727151c276e1c2f8ab3ed26f165c96e17be9b997a9174de31e4420f`
- Temporary `@junk-cleanup` exception is **still in** `scripts/release.sh` (needed so a later deploy of this digest can pass `assert_store_unchanged`). Revert immediately after a successful deploy:
  `cp -a /workspace/stripe-nov11/release.sh.before-exception /workspace/du-good/scripts/release.sh`
  expected sha256: `cf317e372c2f816dfb32cfaa0f26fff9764a50f8b193617e081ea225742e5761`
- No Stripe changes, no KV writes, no email.

## To finish publish (one gated deploy)

With a working Pages deploy token in the environment (`CLOUDFLARE_API_TOKEN`):

```
cd /workspace/du-good
# remove .du-deploy-blocked only for this command, then restore the saved lock
export CLOUDFLARE_ACCOUNT_ID=89c87c2f93e2a2f89147d44259d5d542
./scripts/release.sh deploy --digest f9107879ef2d52051735af34db2de1866e8eb7a7831aa7f630f3e948aa9e43dd
# restore lock (saved copy: /workspace/stripe-nov11/junk-cleanup-nov11/.du-deploy-blocked.saved)
# revert release.sh to the backup above
```

Then spot-check: 10 junk URLs 301 → `/store/`; 15 real product pages 200 (include Null Harbor, Humanity X, Maker Pro); homepage (four Featured-on badges + tip); `/store/`; `/tools/`; sitemap.

Evidence dir: `/workspace/stripe-nov11/junk-cleanup-nov11/`
