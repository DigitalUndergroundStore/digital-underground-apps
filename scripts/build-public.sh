#!/usr/bin/env bash
# Build dist/ with ONLY public site files, then (with --deploy) publish to Cloudflare Pages.
# Functions stay in ./functions (wrangler picks them up from the working directory).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist && mkdir dist
EXCLUDES=(dist src tools scripts docs workers functions node_modules .git .github .wrangler .dev.vars .gitignore .nojekyll CNAME README.md dev.log wrangler.toml package.json package-lock.json secrets)
args=(); for e in "${EXCLUDES[@]}"; do args+=(--exclude="./$e"); done
tar -cf - --anchored "${args[@]}" --no-anchored \
  --exclude='*SECRET*' --exclude='*.keystore' --exclude='*.jks' --exclude='*.pem' --exclude='.env*' \
  --exclude='*.bak*' --exclude='*.log' --exclude='*.test.*' . | tar -xf - -C dist
# tools/ holds build scripts (excluded above); publish only the static Field Studio app from it.
mkdir -p dist/tools && cp -r tools/field-studio dist/tools/field-studio
# safety: fail if anything sensitive slipped in
if find dist \( -iname '*secret*' -o -iname '*.keystore' -o -iname '.env*' -o -path 'dist/src/*' \) | grep -q .; then echo "sensitive file in dist/" >&2; exit 1; fi
echo "dist/: $(find dist -type f | wc -l) files, $(du -sh dist | cut -f1)"
if [[ "${1:-}" == "--deploy" ]]; then
  npx -y wrangler@3 pages deploy dist --project-name digital-underground --branch main --commit-dirty=true
fi
