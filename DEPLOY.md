# Digital Underground production deploys

The eight control files are already installed, with backups. This revision is documentation only. It does not change scripts.

Do not replace those scripts with an older patch. An older publish command started wrangler in `/tmp` and passed the sealed tree as the asset directory. On wrangler 3.114.17 that compiles `/tmp/functions` instead of shipping the sealed worker.

## Lock

`.du-deploy-blocked` in `/workspace/du-good` is in place. Leave it there until Alpha accepts a candidate. `scripts/build-public.sh --deploy` exits 2 before it deletes `dist/` and before npx. `scripts/release.sh deploy` and `rollback` exit 2 for the same file. There is no bypass flag. The unlock is to remove the file by hand after that acceptance.

`commission`, `execute`, `stage`, `attest`, and `layout` still run while the lock is present. They do not publish. `execute` is local `pages dev` only.

Tested locally: the independent suite passed, including the unmodified 104 Functions against the full 7145-path dist commissioning as class `production`. Local candidate `22692bdf` was reviewed in Chrome on port 8861. That candidate was not attested and was not published.

Not tested: a remote `pages deploy` or preview publish. A test that substitutes a local command for `npx` does not prove a Cloudflare upload.

## What wrangler 3.114.17 actually does

Pinned package `wrangler@3.114.17`. No remote Pages deploy was run.

- `wrangler pages deploy public` uploads the `public/` directory. `--dry-run` is not a deploy option.
- Pages rejects `--config` and `-c` before any upload: "Pages does not support custom paths for the Wrangler configuration file". The config must be named `wrangler.toml` in the current directory. There is no `wrangler.release.toml`.
- `pages_build_output_dir = "public"`. The upload root has no `functions/` directory. `--no-bundle` ships `public/_worker.js` unchanged. That file is the worker sealed at commission.
- Commission compiles Functions once with `wrangler pages functions build` and seals that module. Deploy does not compile again.
- `scripts/pages-bindings.toml` is copied to `upload-root/wrangler.toml`. It carries `COMMUNITY_KV` and the `AI` binding. `deploy` passes `--project-name digital-underground`, which this wrangler prefers over the name in the toml.

The upload root is:

```
upload-root/wrangler.toml
upload-root/public/                 the only directory passed to pages deploy
upload-root/public/_worker.js      sealed worker, shipped with --no-bundle
upload-root/public/owner/           existing owner UI, when it is in the sealed manifest
```

The command, with cwd `upload-root`, is:

```
npx -y wrangler@3.114.17 pages deploy public --no-bundle --project-name digital-underground --branch main --commit-dirty=true
```

`public/` does not contain `functions/`, `src/`, `secrets/`, or `functions/_lib/auth.js` / `functions/_lib/owner.js`. The public owner UI stays. Those are the owner shell files already in the sealed manifest, not Functions source. On a production host, `/owner/` is 401. A loopback 200 is not the auth proof.

`execute` uses the same directory: `wrangler pages dev public`, no `--config` flag, no upload.

## Release path

```
./scripts/release.sh bootstrap --from <saved-dist-plus-functions> --pages-id 36d85669 --deployed-at 2026-11-05T19:24:00Z
./scripts/release.sh stage --allowlist <reviewed-paths.txt>
./scripts/release.sh layout --digest <DIGEST>
./scripts/release.sh attest --digest <DIGEST> --reviewer "<name>" \
  --shot-390 <390.png> --shot-412 <412.png> --shot-1280 <1280.png>
./scripts/release.sh deploy --digest <DIGEST>
./scripts/release.sh rollback
```

`bootstrap` records a candidate. It sets `validated 0`. Historical `36d85669` stays `validated 0`. Nothing in this package sets it to 1. Bootstrap refuses the worktree (`scripts/build-public.sh` or `.du-deploy-blocked` inside `--from`), a 40-hex git SHA, missing `functions/`, a homepage without `#motw-slot.motw-home`, a homepage without the Featured Rival Lanes muted renderer, and `hc-shop` / `hc-pill`. Private source is `src/` and `secrets/`. The public owner UI is not private source. A saved dist that already contains `.du-prod-ok` is accepted. That file is not proof the directory is the worktree. Bootstrap does not create a publishable known-good.

`deploy` and `rollback` refuse a historical baseline.

The usable path is a new candidate:

```
./scripts/release.sh digest --dir <saved-36d-public-dist>
./scripts/release.sh commission \
  --dist <saved-36d-public-dist> \
  --dist-sha256 <that digest> \
  --functions <preserved-prepublish-functions-source> \
  --strip .du-prod-ok
./scripts/release.sh execute --digest <CANDIDATE>
./scripts/release.sh layout --digest <CANDIDATE>
./scripts/release.sh attest --digest <CANDIDATE> --reviewer "<name>" \
  --shot-390 <390.png> --shot-412 <412.png> --shot-1280 <1280.png>
# remove .du-deploy-blocked only after Alpha accepts this candidate
./scripts/release.sh deploy --digest <CANDIDATE>
```

`commission` checks the dist digest you pass and, when given `--manifest`, checks every supplied file's size and sha256 against that manifest. Paths not in the manifest are refused. `tools/` and `owner/` paths already in the manifest stay. They are the approved public corpus. New files under those trees are refused. It records `historical_provenance unknown`. It compiles Functions once with wrangler 3.114.17 and seals that module. `execute` and `layout` recompute that sealed digest and refuse to copy or run the tree if it has changed. OAuth `id` and `secret` fields that are exactly `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `X_CLIENT_ID`, or `X_CLIENT_SECRET` are env names, not credentials. `OWNER_EMAIL_HASH` is accepted only as a 64-hex identity identifier compared with `sha256("owner|" + email)`, and that value is not printed. Any other credential-shaped literal refuses commissioning without printing the value. `REDACTED` placeholders stay diagnostic and cannot be published.

`execute` starts real `wrangler pages dev` with `wrangler.toml` in that directory and no `--config` flag. Loopback `/owner/` is not the auth proof. The check sends `Host: digitalundergroundstore.com` and `X-Forwarded-Proto: https`, and requires 401. A present `store/index.html`, `league/index.html`, `sitemap.xml`, or tool `index.html` must return 200. KV blobs must not increase. `deploy` does not pass `--config`. A diagnostic candidate cannot be published. A hardcoded credential literal refuses commissioning and the value is not printed. Auth source is not modified. See CREDENTIALS.md.

If Functions source changes later, `stage` an allowlist that names those files. The candidate is recompiled and must be executed and attested again. `store/` still cannot change. An allowlist cannot edit `owner/`. Homepage rules still require `motw-home`, Featured Rival Lanes, and no `hc-shop` / `hc-pill`.

Source paths `tools/`, `workers/`, `scripts/`, `docs/`, `wrangler.toml`, `dev.log`, `README`, and `README.md` are refused in the public package unless named with `--allow-public` or a `+path` allowlist line. A page such as `privacy.html` is not removed. Public calculator pages and the owner UI that are already in the manifest are not those source paths.

Bindings on a live worker are not part of this package. This script's `deploy` targets `--branch main`. It will not run while `.du-deploy-blocked` exists. That remote call has not been run.

`stage` overlays only the allowlist. An explicit strip is a line `-.du-prod-ok`, `-.du-deploy-blocked`, or `-.du-releases`. No other path may be deleted. The strip is removed from `public/` only and is written to `DEVIATION.txt` with its sha256. The sealed tree digest still contains the file. If a control marker is in the tree and is not listed, stage refuses rather than dropping it. `src/` and `secrets/` are not shipped and are not blessed because they were in a baseline. Existing `owner/` pages in the manifest stay in `public/owner/`. New `owner/` paths are refused. `store/` must stay byte-identical to the baseline.

`attest` binds the reviewer, the three PNG sha256 values, and the strip and deviation hashes to the digest. It does not read pixels. Widths must be 390, 412, and 1280, height at least 700. It does not publish. A diagnostic candidate is not publishable.

`layout` prints the upload root. It does not call wrangler. It refuses a tree whose digest no longer matches the sealed digest.

## One reviewed sanitization before any later publish

The live site serves `.du-prod-ok` (173 bytes, HTTP 200). `.du-deploy-blocked` is not on the site (HTTP 404). A later public upload must not ship that marker. The reviewed transition is an allowlist line `-.du-prod-ok`. That changes the public manifest and leaves the sealed digest intact. It is not an implicit cleanup of the whole baseline.

## This revision

Docs only: `DEPLOY.md`, `docs/deploy.md`, `LOCK.md`. The installed scripts stay as they are. Local tests passed. Remote publish was not tested. The freeze remains until Alpha acceptance.
