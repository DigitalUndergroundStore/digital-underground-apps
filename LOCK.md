# Lock production publish

The lock is already in place. Do not remove it while applying this docs revision.

```
touch /workspace/du-good/.du-deploy-blocked
```

That file exists as of 14:38 EST. `./scripts/build-public.sh --deploy` then exits 2 before `dist/` is removed and before npx.

The same file locks `scripts/release.sh deploy` and `scripts/release.sh rollback`. There is no `--force` and no unlock flag. Remote publish has not been tested. The freeze stays until Alpha accepts a candidate. To unlock after that acceptance, remove the file by hand:

```
rm /workspace/du-good/.du-deploy-blocked
```

Do not remove it as part of this docs revision. `commission`, `execute`, `stage`, `attest`, and `layout` do not publish and still run while the lock is present. `execute` is local `pages dev` only.
