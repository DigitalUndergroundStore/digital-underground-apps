# Junk cleanup precheck (before any removal)

Time: 2026-11-11 morning America/Toronto (EST)
Slug list: 1153 unique (`removal-lists/junk-store-p-slugs.txt`, frozen copy in this folder)

## Cross-checks (must be zero overlaps)

| Check | Result |
|---|---|
| catalog.json store slugs | 0 overlap |
| catalog.json /tools/ hrefs | 0 overlap |
| 5 live extras (Humanity X x3, Maker Pro, Networking & Distribution) | 0 overlap |
| sitemap.xml | 0 overlap |
| nav / homepage / footer | 0 overlap |
| 43 catalog free /tools/ keep list | 0 overlap |
| Kerzy Labs site files (text) | 0 overlap |
| Marketplace/community/makers/league source files | 0 overlap |
| COMMUNITY_KV listings (115 items, all statuses, read-only GET) | 0 overlap, 0 errors |
| maker: KV records (79) | 0 overlap |

**No slugs excluded.** Marketplace (community listings, makers, KV, league) has no references to these junk store/tool pages (no links, embeds, or cover URLs). Marketplace will not be modified.

## On-disk presence (worktree)

- store/p/<slug>/index.html missing: 0
- tools/<slug>/index.html missing: 0
- src/store-overrides/p/<slug>/index.html missing: 0

## Redirect plan

Cloudflare Pages static _redirects cap is 2,000 rules. 1,153 store + 1,153 tools URLs (plus slash variants) exceed that, so redirects go in `functions/_middleware.js` via a reviewed slug set (not _redirects).

## Kept-page links to junk URLs

19 related-product hrefs on live catalog store pages point at junk /store/p/<slug>/ paths. They will follow the 301 to /store/. Those 19 live pages are not edited.

## Also not in this release

Coming-soon catalog items, stale Buy links, Airhand, Networking & Distribution, free tools, Null Harbor, Stripe, marketplace, league, KV.

## Rollback target

pages_id b8f05bfb
digest 1403306969f0ffba84c9bf16a0e0245fbdde0d45977e0b8121da5e5244075cdd
(current known-good / candidate / live, Maker Pro v3, 8:47 AM EST)

## release.sh known-good sha (to restore after exception)

cf317e372c2f816dfb32cfaa0f26fff9764a50f8b193617e081ea225742e5761
.lock sha expected 433fea1d4727151c276e1c2f8ab3ed26f165c96e17be9b997a9174de31e4420f
actual lock 433fea1d4727151c276e1c2f8ab3ed26f165c96e17be9b997a9174de31e4420f
