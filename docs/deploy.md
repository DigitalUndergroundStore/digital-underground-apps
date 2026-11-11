# Deploying digitalundergroundstore.com

The release scripts are installed. `.du-deploy-blocked` in `/workspace/du-good` still locks production publish. Leave that file in place until Alpha accepts a candidate. `./scripts/build-public.sh --deploy` exits 2 before it deletes `dist/` and before npx. `./scripts/release.sh deploy` and `rollback` exit 2 for the same file. There is no bypass flag. Removing the file is the unlock, and it is not done from these scripts.

`./scripts/build-public.sh` with no flag still builds an inspect-only `dist/`. That dist can contain `.du-prod-ok` if the tree has it. That matches the current 36d85669 public manifest. It is not a release. Do not add a silent exclude for that marker here. A later upload drops it only through an explicit allowlist line `-.du-prod-ok`, recorded as a deviation. See `DEPLOY.md`.

Do not run `wrangler pages deploy .`, `wrangler pages deploy dist`, or `wrangler pages deploy` from `/tmp`. Do not pass `--config` or `-c`. Pages 3.114.17 rejects a custom config path before any upload. The release command has cwd = upload root, reads `wrangler.toml` in that directory, and is:

```
npx -y wrangler@3.114.17 pages deploy public --no-bundle --project-name digital-underground --branch main --commit-dirty=true
```

The shipped worker is the pinned file `public/_worker.js`. The upload root has no `functions/` directory. Historical 36d85669 stays unvalidated. A new candidate is commissioned from the hash-proven public dist plus the preserved Functions source. See `DEPLOY.md`. `deploy` and `rollback` still refuse while `.du-deploy-blocked` exists. That remote command has not been run. Local `pages dev`, the 104-function commission, and the Chrome review of candidate `22692bdf` on port 8861 were local only. No attest and no publish were done for that candidate.

Public `tools/` calculators and the `owner/` UI that are already in the sealed manifest stay in `public/`. `/owner/` is 401 on a production host. Loopback is not that proof. Source trees (`/src`, `/scripts`, `/docs`, `/workers`, dev.log, README) are not the public package. This script does not deploy them.

Commit locally only. The freeze remains until Alpha acceptance.
