# Deploying digitalundergroundstore.com

Deploy only public files:

```
./scripts/build-public.sh --deploy
```

This builds `dist/`, which holds public files only. It leaves out src/, tools/, scripts/, docs/, workers/, functions/, node_modules, .git, README, dev.log, wrangler.toml, package files, and anything secret, .bak, .log or test. The script then runs
`npx -y wrangler@3 pages deploy dist --project-name digital-underground --branch main --commit-dirty=true`
from the repo root, so wrangler still bundles `./functions`.

Run `./scripts/build-public.sh` with no flag to build and inspect `dist/` without deploying.

Do NOT run `wrangler pages deploy .`, because it publishes the whole repo, including the unencrypted Pantry Week source. As a backup, `functions/_middleware.js` returns 404 for /src, /tools, /scripts, /docs, /workers, dev.log and README.md.

Commit locally only.
