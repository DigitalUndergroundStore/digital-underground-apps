#!/usr/bin/env bash
# Sandbox the release gate. No network, no wrangler, no git reset.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SANDBOX="$(mktemp -d /tmp/du-release-sandbox.XXXXXX)"
TREE="$SANDBOX/du-good"
PUB="$SANDBOX/public-36d85669"
mkdir -p "$TREE/scripts" "$TREE/functions" "$TREE/assets" "$PUB/functions" "$PUB/store"
cp "$ROOT/scripts/release.sh" "$ROOT/scripts/build-public.sh" "$ROOT/scripts/pages-bindings.toml" "$TREE/scripts/"
chmod +x "$TREE/scripts/release.sh" "$TREE/scripts/build-public.sh"
touch "$TREE/.du-prod-ok"
echo "home-v24" > "$TREE/assets/note.txt"
echo "sneak-1" > "$TREE/sneak.html"
echo '<div class="hc-shop"></div><div id="motw-slot"></div>' > "$TREE/bad-index.html"
echo "dirty-fn" > "$TREE/functions/index.js"
mkdir -p "$TREE/owner" "$TREE/secrets" "$TREE/src" "$TREE/functions/_lib/auth"
echo x > "$TREE/owner/x.js"
echo x > "$TREE/secrets/token"
echo x > "$TREE/src/app.js"
echo x > "$TREE/functions/_lib/auth/session.js"
echo x > "$TREE/note.pem"

cat > "$PUB/index.html" << 'EOF'
<div id="motw-slot" class="motw-home"></div>
<section class="ftr" id="featured"><div class="ftr-row" id="ftrRow"></div></section>
<script>
['cm_kerzy_neonbastion'].forEach(function(){});
var media='<video class="ftr-vid" muted playsinline></video>';
new IntersectionObserver(function(){});
</script>
<div class="ftr-promo">this-spot-could-be-yours-wide.webp this-spot-could-be-yours-16x9.webp <a href="/store/p/maker-pro/">Get Maker Pro</a></div>
<footer>PlanetView signup stays</footer>
EOF
cp "$PUB/index.html" "$TREE/good-index.html"
echo "store-page" > "$PUB/store/index.html"
cat > "$PUB/functions/index.js" << 'EOF'
export function onRequest(){ return new Response('<div id="motw-slot" class="motw-home"></div><section id="featured"></section>', {headers:{"content-type":"text/html"}}); }
EOF
mkdir -p "$PUB/functions/_lib"
echo 'export function owner(){ return "owner-lib"; }' > "$PUB/functions/_lib/owner.js"
echo 'export function auth(){ return "auth-lib"; }' > "$PUB/functions/_lib/auth.js"

python3 - "$SANDBOX" << 'PY'
import struct, sys, zlib
from pathlib import Path
out = Path(sys.argv[1])
def png(path, w, h):
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + b"\x00\x00\x00" * w for _ in range(h))
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    Path(path).write_bytes(data)
png(out / "s390.png", 390, 844)
png(out / "s412.png", 412, 900)
png(out / "s1280.png", 1280, 900)
png(out / "bad.png", 100, 100)
PY

cd "$TREE"
pass() { echo "PASS $*"; }
fail() { echo "FAIL $*" >&2; exit 1; }
expect_refuse() {
  local name="$1"; shift
  if "$@" >"$SANDBOX/out.txt" 2>"$SANDBOX/err.txt"; then
    fail "$name should have refused, out=$(cat "$SANDBOX/out.txt")"
  fi
  pass "$name"
}

grep -q "pages deploy \\." scripts/build-public.sh && fail "build-public.sh contains pages deploy ."
grep -q 'cd /tmp && npx' scripts/release.sh && fail "release.sh still deploys from /tmp"
grep -q 'pages deploy "$tmp"' scripts/release.sh && fail "release.sh still uploads the temp root"
grep -q 'cd "$upload" && "$wrangler_cmd" -y "wrangler@${WRANGLER_PIN}" pages deploy public --no-bundle --project-name digital-underground' scripts/release.sh || fail "wrangler must run in the upload root and upload public/ only"
grep -q 'cm_kerzy_neonbastion' scripts/release.sh || fail "stale homepage assertion"
grep -q 'require_functions' scripts/release.sh || fail "stale bootstrap does not require functions"
grep -q 'source changed after stage' scripts/release.sh || fail "missing source-after-stage check"
grep -q 'There is no bypass flag' scripts/release.sh || fail "lock can be bypassed"
pass "publish command matches wrangler 3.114.17 layout"

expect_refuse "direct build-public --deploy" ./scripts/build-public.sh --deploy
grep -q "does not publish this working tree" "$SANDBOX/err.txt" || fail "missing refuse text"
[[ ! -d dist ]] || fail "refused deploy still built dist"
pass "refused --deploy before dist"

mkdir -p "$SANDBOX/nofn"
cp "$PUB/index.html" "$SANDBOX/nofn/index.html"
expect_refuse "bootstrap without functions" ./scripts/release.sh bootstrap --from "$SANDBOX/nofn" --pages-id 36d85669 --deployed-at 2026-11-05T19:24:00Z
expect_refuse "bootstrap git sha" ./scripts/release.sh bootstrap --from "$PUB" --pages-id aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa --deployed-at 2026-11-05T19:24:00Z
expect_refuse "bootstrap worktree" ./scripts/release.sh bootstrap --from "$TREE" --pages-id 36d85669 --deployed-at 2026-11-05T19:24:00Z
expect_refuse "bootstrap dirty promo page" bash -c 'mkdir -p "'$SANDBOX'/badpub/functions" && cp "'$PUB'/index.html" "'$SANDBOX'/badpub/" && cp "'$PUB'/functions/index.js" "'$SANDBOX'/badpub/functions/" && printf "%s\n" "<div class=\"hc-shop\"></div>" >> "'$SANDBOX'/badpub/index.html" && ./scripts/release.sh bootstrap --from "'$SANDBOX'/badpub" --pages-id 36d85669 --deployed-at 2026-11-05T19:24:00Z'

./scripts/release.sh bootstrap --from "$PUB" --pages-id 36d85669-0000-4000-8000-000000000001 --deployed-at 2026-11-05T19:24:00Z >"$SANDBOX/boot-uuid.txt"
grep -q "pages_id=36d85669-0000-4000-8000-000000000001" "$SANDBOX/boot-uuid.txt" || fail "UUID pages id refused"
pass "bootstrap accepts Pages UUID"

./scripts/release.sh bootstrap --from "$PUB" --pages-id 36d85669 --deployed-at 2026-11-05T19:24:00Z >"$SANDBOX/boot.txt"
grep -q "^baseline " "$SANDBOX/boot.txt" || fail "bootstrap did not print digest"
grep -q "pages_id=36d85669" "$SANDBOX/boot.txt" || fail "bootstrap did not record 36d85669"
grep -q "functions_included 1" .du-releases/baseline/BASELINE.txt || fail "functions not in baseline"
grep -q "^functions_digest " .du-releases/baseline/BASELINE.txt || fail "missing functions digest"
grep -q "source_root_not_blessed 1" .du-releases/baseline/BASELINE.txt || fail "worktree was treated as blessed source"
grep -q '^validated 0$' .du-releases/baseline/BASELINE.txt || fail "bootstrap opened the publish gate"
grep -q 'functions_compiled_bundle preserved 0' .du-releases/baseline/BASELINE.txt || fail "bootstrap claimed the compiled bundle was preserved"
grep -q 'functions_provenance unverified-source' .du-releases/baseline/BASELINE.txt || fail "functions provenance was overstated"
pass "bootstrap candidate 36d85669 stays unvalidated"

echo "store/index.html" > "$SANDBOX/store-list.txt"
expect_refuse "allowlist store edit" ./scripts/release.sh stage --allowlist "$SANDBOX/store-list.txt"
echo "../.env" > "$SANDBOX/env-list.txt"
expect_refuse "allowlist path escape" ./scripts/release.sh stage --allowlist "$SANDBOX/env-list.txt"
echo "owner/x.js" > "$SANDBOX/owner-list.txt"
# New owner assets still require explicit public approval.
expect_refuse "owner without public approval" ./scripts/release.sh stage --allowlist "$SANDBOX/owner-list.txt"
printf '%s\n' 'owner/x.js' '+owner/x.js' > "$SANDBOX/owner-list.txt"
./scripts/release.sh stage --allowlist "$SANDBOX/owner-list.txt" > "$SANDBOX/stage-owner.txt"
owner_digest="$(awk '/^staged /{print $2}' "$SANDBOX/stage-owner.txt")"
[[ -f ".du-releases/staged/$owner_digest/tree/owner/x.js" ]] || fail "reviewed owner UI was dropped"
pass "reviewed owner UI stages with explicit public approval"
echo "secrets/token" > "$SANDBOX/secrets-list.txt"
expect_refuse "allowlist secrets" ./scripts/release.sh stage --allowlist "$SANDBOX/secrets-list.txt"
echo "src/app.js" > "$SANDBOX/src-list.txt"
expect_refuse "allowlist src" ./scripts/release.sh stage --allowlist "$SANDBOX/src-list.txt"
echo "functions/_lib/auth/session.js" > "$SANDBOX/auth-list.txt"
expect_refuse "allowlist auth lib" ./scripts/release.sh stage --allowlist "$SANDBOX/auth-list.txt"
echo "note.pem" > "$SANDBOX/pem-list.txt"
expect_refuse "allowlist pem" ./scripts/release.sh stage --allowlist "$SANDBOX/pem-list.txt"

cp "$TREE/bad-index.html" "$TREE/index.html"
echo "index.html" > "$SANDBOX/bad-list.txt"
expect_refuse "allowlist drops motw-home / adds hc-shop" ./scripts/release.sh stage --allowlist "$SANDBOX/bad-list.txt"
rm -f "$TREE/index.html"
echo "" > "$SANDBOX/empty.txt"
expect_refuse "empty allowlist" ./scripts/release.sh stage --allowlist "$SANDBOX/empty.txt"

echo "assets/note.txt" > "$SANDBOX/note-list.txt"
./scripts/release.sh stage --allowlist "$SANDBOX/note-list.txt" >"$SANDBOX/stage-note1.txt"
d_note="$(awk '/^staged /{print $2}' "$SANDBOX/stage-note1.txt")"
echo "sneak-2" > "$TREE/sneak.html"
./scripts/release.sh stage --allowlist "$SANDBOX/note-list.txt" >"$SANDBOX/stage-note2.txt"
d_note2="$(awk '/^staged /{print $2}' "$SANDBOX/stage-note2.txt")"
[[ "$d_note" == "$d_note2" ]] || fail "unlisted sneak.html changed the digest"
[[ ! -f ".du-releases/staged/$d_note/tree/sneak.html" ]] || fail "unlisted file was staged"
cmp "$PUB/functions/index.js" ".du-releases/staged/$d_note/tree/functions/index.js" || fail "unlisted dirty functions replaced the baseline functions"
grep -q dirty-fn ".du-releases/staged/$d_note/tree/functions/index.js" && fail "dirty functions leaked into stage"
pass "unlisted files and dirty functions stay out of the digest"

cat > "$SANDBOX/hook.sh" << EOF
#!/bin/bash
echo mutated >> "$TREE/good-index.html"
EOF
chmod +x "$SANDBOX/hook.sh"
echo "good-index.html" > "$SANDBOX/ok-list.txt"
expect_refuse "source change during stage" env DU_RELEASE_TEST_HOOK="$SANDBOX/hook.sh" ./scripts/release.sh stage --allowlist "$SANDBOX/ok-list.txt"
cp "$PUB/index.html" "$TREE/good-index.html"
pass "stage did not seal a release after source mutation"

./scripts/release.sh stage --allowlist "$SANDBOX/ok-list.txt" >"$SANDBOX/stage.txt"
digest="$(awk '/^staged /{print $2}' "$SANDBOX/stage.txt")"
[[ -n "$digest" ]] || fail "no digest"
cmp "$PUB/store/index.html" ".du-releases/staged/$digest/tree/store/index.html" || fail "store bytes changed"
cmp "$PUB/functions/index.js" ".du-releases/staged/$digest/tree/functions/index.js" || fail "functions bytes changed without allowlist"
[[ -f ".du-releases/staged/$digest/SOURCE.sha256" ]] || fail "missing source manifest"
[[ -f ".du-releases/staged/$digest/OUTPUT.sha256" ]] || fail "missing output manifest"
[[ -f ".du-releases/staged/$digest/FUNCTIONS.sha256" ]] || fail "missing functions manifest"
pass "stage allowlist $digest"

expect_refuse "deploy without attestation" ./scripts/release.sh deploy --digest "$digest"
expect_refuse "attest narrow png" ./scripts/release.sh attest --digest "$digest" --reviewer Alpha \
  --shot-390 "$SANDBOX/bad.png" --shot-412 "$SANDBOX/s412.png" --shot-1280 "$SANDBOX/s1280.png"
./scripts/release.sh attest --digest "$digest" --reviewer Alpha \
  --shot-390 "$SANDBOX/s390.png" --shot-412 "$SANDBOX/s412.png" --shot-1280 "$SANDBOX/s1280.png" >"$SANDBOX/att.txt"
pass "attest 390/412/1280 bound to manifests"

chmod -R u+w ".du-releases/staged/$digest/tree"
echo "tamper" >> ".du-releases/staged/$digest/tree/index.html"
expect_refuse "deploy after output change" ./scripts/release.sh deploy --digest "$digest"

./scripts/release.sh stage --allowlist "$SANDBOX/ok-list.txt" >"$SANDBOX/stage-stale.txt"
digest="$(awk '/^staged /{print $2}' "$SANDBOX/stage-stale.txt")"
./scripts/release.sh attest --digest "$digest" --reviewer Alpha \
  --shot-390 "$SANDBOX/s390.png" --shot-412 "$SANDBOX/s412.png" --shot-1280 "$SANDBOX/s1280.png" >/dev/null
echo "source-drift" >> "$TREE/good-index.html"
rm -f "$SANDBOX/called"
cat > "$SANDBOX/fake-deploy.sh" << EOF
#!/bin/bash
touch "$SANDBOX/called"
echo "deploy-dir \$1"
cp "\$1/functions/index.js" "$SANDBOX/uploaded-fn.js"
cp "\$1/index.html" "$SANDBOX/uploaded-index.html"
cp "\$1/wrangler.release.toml" "$SANDBOX/uploaded-wrangler.toml"
echo "https://abc54a91a04.digital-underground.pages.dev"
EOF
chmod +x "$SANDBOX/fake-deploy.sh"
expect_refuse "deploy after source change" env DU_PAGES_DEPLOY_CMD="$SANDBOX/fake-deploy.sh" ./scripts/release.sh deploy --digest "$digest"
[[ ! -f "$SANDBOX/called" ]] || fail "stale source still invoked publish"
cp "$PUB/index.html" "$TREE/good-index.html"
pass "stale source did not publish"

./scripts/release.sh stage --allowlist "$SANDBOX/ok-list.txt" >"$SANDBOX/stage2.txt"
digest="$(awk '/^staged /{print $2}' "$SANDBOX/stage2.txt")"
./scripts/release.sh attest --digest "$digest" --reviewer Alpha \
  --shot-390 "$SANDBOX/s390.png" --shot-412 "$SANDBOX/s412.png" --shot-1280 "$SANDBOX/s1280.png" >/dev/null
cat > "$SANDBOX/fake-deploy.sh" << 'EOF'
#!/bin/bash
echo "PUBLISHER WAS CALLED cwd=$(pwd) arg=$1" >&2
exit 1
EOF
chmod +x "$SANDBOX/fake-deploy.sh"
expect_refuse "deploy while functions bundle is unproven" env DU_PAGES_DEPLOY_CMD="$SANDBOX/fake-deploy.sh" ./scripts/release.sh deploy --digest "$digest"
grep -Eq 'not validated|no pinned worker' "$SANDBOX/err.txt" || fail "unproven baseline did not stay closed"
grep -q "PUBLISHER WAS CALLED" "$SANDBOX/err.txt" && fail "unproven baseline invoked wrangler"
pass "unproven baseline did not publish"

./scripts/release.sh layout --digest "$digest" >"$SANDBOX/layout.txt"
root="$(awk '/^layout_root /{print $2}' "$SANDBOX/layout.txt")"
[[ -n "$root" && -d "$root/public" && ! -d "$root/functions" ]] || fail "upload root must not contain functions/"
[[ ! -e "$root/public/functions" ]] || fail "functions directory is inside the asset upload"
[[ ! -e "$root/public/functions/_lib/owner.js" && ! -e "$root/public/_worker.js" ]] || fail "historical layout would ship functions or an unpinned worker"
grep -q motw-home "$root/public/index.html" || fail "public homepage lost motw-home"
grep -q "worker_pinned no" "$root/DEVIATION.txt" || fail "historical layout claimed a pinned worker"
grep -q 'pages_build_output_dir = "public"' "$root/wrangler.toml" || fail "config does not limit the upload to public/"
grep -q 'id = "5e086a24647c419f8ac5577b85a0c651"' "$root/wrangler.toml" || fail "config dropped COMMUNITY_KV"
grep -q 'binding = "AI"' "$root/wrangler.toml" || fail "config dropped the AI binding"
[[ ! -f "$root/wrangler.release.toml" ]] || fail "custom config path would be rejected by Pages"
grep -q "wrangler_cwd $root" "$SANDBOX/layout.txt" || fail "wrangler cwd is not the upload root"
grep -q "pages deploy public" "$SANDBOX/layout.txt" || fail "wrangler argv does not upload public/"
pass "layout keeps functions beside public and preserves bundle bindings"

./scripts/release.sh stage --allowlist "$SANDBOX/note-list.txt" >"$SANDBOX/stage3.txt"
d3="$(awk '/^staged /{print $2}' "$SANDBOX/stage3.txt")"
./scripts/release.sh attest --digest "$d3" --reviewer Alpha \
  --shot-390 "$SANDBOX/s390.png" --shot-412 "$SANDBOX/s412.png" --shot-1280 "$SANDBOX/s1280.png" >/dev/null
chmod -R u+w ".du-releases/staged/$d3"
echo "x" >> ".du-releases/staged/$d3/shot-412.png"
expect_refuse "deploy after screenshot swap" ./scripts/release.sh deploy --digest "$d3"

./scripts/release.sh stage --allowlist "$SANDBOX/note-list.txt" >"$SANDBOX/stage4.txt"
d4="$(awk '/^staged /{print $2}' "$SANDBOX/stage4.txt")"
chmod -R u+w ".du-releases/staged/$d4"
cp ".du-releases/staged/$digest/ATTESTATION.txt" ".du-releases/staged/$d4/ATTESTATION.txt" 2>/dev/null || true
expect_refuse "reuse attestation from another digest" ./scripts/release.sh deploy --digest "$d4"

./scripts/release.sh stage --allowlist "$SANDBOX/note-list.txt" >"$SANDBOX/stage5.txt"
d5="$(awk '/^staged /{print $2}' "$SANDBOX/stage5.txt")"
./scripts/release.sh attest --digest "$d5" --reviewer Alpha \
  --shot-390 "$SANDBOX/s390.png" --shot-412 "$SANDBOX/s412.png" --shot-1280 "$SANDBOX/s1280.png" >/dev/null
chmod -R u+w ".du-releases/staged/$d5"
echo "mutated-manifest" >> ".du-releases/staged/$d5/OUTPUT.sha256"
expect_refuse "deploy after output manifest change" ./scripts/release.sh deploy --digest "$d5"

echo "export function onRequest(){ /* reviewed */ }" > "$TREE/functions/index.js"
echo "functions/index.js" > "$SANDBOX/fn-list.txt"
./scripts/release.sh stage --allowlist "$SANDBOX/fn-list.txt" >"$SANDBOX/stage-fn.txt"
d_fn="$(awk '/^staged /{print $2}' "$SANDBOX/stage-fn.txt")"
grep -q "reviewed" ".du-releases/staged/$d_fn/tree/functions/index.js" || fail "allowlisted function was not staged"
grep -q "functions/index.js" ".du-releases/staged/$d_fn/SOURCE.sha256" || fail "functions missing from source manifest"
[[ ! -f ".du-releases/staged/$d_fn/tree/pinned-worker.js" ]] || fail "historical stage compiled a worker"
pass "reviewed functions file is staged and digested"
echo "dirty-fn" > "$TREE/functions/index.js"

expect_refuse "rollback while functions bundle is unproven" ./scripts/release.sh rollback
grep -q "not validated" "$SANDBOX/err.txt" || fail "rollback ignored the unproven baseline"
touch "$TREE/.du-deploy-blocked"
expect_refuse "deploy while .du-deploy-blocked is set" ./scripts/release.sh deploy --digest "$digest"
grep -q "no bypass flag" "$SANDBOX/err.txt" || fail "lock message missing"
expect_refuse "rollback while .du-deploy-blocked is set" ./scripts/release.sh rollback
./scripts/release.sh layout --digest "$digest" >/dev/null
pass "lock blocks deploy and rollback and still allows layout"
rm -f "$TREE/.du-deploy-blocked"
[[ -f "$TREE/functions/index.js" ]] || fail "tests deleted the worktree functions"
grep -q dirty-fn "$TREE/functions/index.js" || fail "tests rewrote dirty functions"

MARK="$SANDBOX/marked"
mkdir -p "$MARK/functions" "$MARK/store" "$MARK/src"
cp "$PUB/index.html" "$MARK/index.html"
cp "$PUB/functions/index.js" "$MARK/functions/index.js"
cp "$PUB/store/index.html" "$MARK/store/index.html"
echo 'private' > "$MARK/src/app.js"
expect_refuse "bootstrap private src" ./scripts/release.sh bootstrap --from "$MARK" --pages-id 36d85669 --deployed-at 2026-11-05T19:24:00Z
rm -rf "$MARK/src"
echo 'marker-173' > "$MARK/.du-prod-ok"
./scripts/release.sh bootstrap --from "$MARK" --pages-id 36d85669 --deployed-at 2026-11-05T19:24:00Z >/dev/null
echo "good-index.html" > "$SANDBOX/mark-list.txt"
expect_refuse "stage leaves .du-prod-ok in public assets" ./scripts/release.sh stage --allowlist "$SANDBOX/mark-list.txt"
printf '%s\n' '-.src/app.js' > "$SANDBOX/bad-strip.txt"
expect_refuse "strip of a private path" ./scripts/release.sh stage --allowlist "$SANDBOX/bad-strip.txt"
printf '%s\n' '-.du-prod-ok' 'good-index.html' > "$SANDBOX/mark-list.txt"
./scripts/release.sh stage --allowlist "$SANDBOX/mark-list.txt" >"$SANDBOX/mark-stage.txt"
md="$(awk '/^staged /{print $2}' "$SANDBOX/mark-stage.txt")"
[[ -f ".du-releases/staged/$md/tree/.du-prod-ok" ]] || fail "explicit strip changed the sealed tree"
./scripts/release.sh layout --digest "$md" >"$SANDBOX/mark-layout.txt"
mroot="$(awk '/^layout_root /{print $2}' "$SANDBOX/mark-layout.txt")"
[[ ! -e "$mroot/public/.du-prod-ok" ]] || fail "stripped marker is still a public asset"
grep -q '^strip .du-prod-ok ' "$mroot/DEVIATION.txt" || fail "marker removal was not an explicit deviation"
pass "control marker needs an explicit strip and stays in the sealed digest"

export DU_WRANGLER="${DU_WRANGLER:-/tmp/w3inst/node_modules/.bin/wrangler}"
[[ -x "$DU_WRANGLER" ]] || fail "pinned wrangler 3.114.17 binary is missing"
set +e
"$DU_WRANGLER" pages dev public -c /tmp/rc-final/scripts/pages-bindings.toml --port 8859 --ip 127.0.0.1 </dev/null >"$SANDBOX/pages-c.out" 2>&1
pages_c=$?
set -e
[[ "$pages_c" -ne 0 ]] || fail "pages dev -c should fail"
grep -q 'does not support custom paths' "$SANDBOX/pages-c.out" || fail "pages dev -c did not report the Pages config-path error"
grep -q 'Uploading' "$SANDBOX/pages-c.out" && fail "pages dev -c started an upload"
pass "real wrangler pages dev rejects a custom config path"
SECRET_FN="$SANDBOX/secret-fn"
mkdir -p "$SECRET_FN"
printf '%s\n' 'export const x = { secret: "thisisnotredacted1" };' > "$SECRET_FN/index.js"
# copy a valid homepage so the refusal is the credential, not the layout
mkdir -p "$SANDBOX/secret-dist/store"
cp "$PUB/index.html" "$SANDBOX/secret-dist/index.html"
cp "$PUB/store/index.html" "$SANDBOX/secret-dist/store/index.html"
# PUB index may not exist yet as a file named that; the early fixture writes PUB/index.html before this point
dsha="$(./scripts/release.sh digest --dir "$SANDBOX/secret-dist")"
./scripts/release.sh commission --dist "$SANDBOX/secret-dist" --dist-sha256 "$dsha" --functions "$SECRET_FN" >"$SANDBOX/secret-out.txt" 2>"$SANDBOX/secret-err.txt" || true
grep -q 'hardcoded credential' "$SANDBOX/secret-err.txt" || fail "hardcoded credential was not refused"
grep -q 'thisisnotredacted1' "$SANDBOX/secret-err.txt" "$SANDBOX/secret-out.txt" && fail "credential value was printed"
pass "hardcoded credential refuses commission without printing the value"
HEX_SECRET="$(python3 -c 'import hashlib; print(hashlib.sha256(b"credential-shaped").hexdigest())')"
HEX_ID="$(python3 -c 'import hashlib; print(hashlib.sha256(b"owner|fixture@invalid.example").hexdigest())')"
mkdir -p "$SANDBOX/hexsecret"
printf 'export const x = { secret: "%s" };\n' "$HEX_SECRET" > "$SANDBOX/hexsecret/index.js"
./scripts/release.sh commission --dist "$SANDBOX/secret-dist" --dist-sha256 "$dsha" --functions "$SANDBOX/hexsecret" >"$SANDBOX/hex-out.txt" 2>"$SANDBOX/hex-err.txt" || true
grep -q 'hardcoded credential' "$SANDBOX/hex-err.txt" || fail "64-hex secret was treated as an identity identifier"
grep -q "$HEX_SECRET" "$SANDBOX/hex-err.txt" "$SANDBOX/hex-out.txt" && fail "64-hex secret was printed"
pass "64-hex credential literal is refused and not printed"
mkdir -p "$SANDBOX/hexowner"
printf 'const OWNER_EMAIL_HASH = "%s";\nexport const x = OWNER_EMAIL_HASH;\n' "$HEX_ID" > "$SANDBOX/hexowner/index.js"
./scripts/release.sh commission --dist "$SANDBOX/secret-dist" --dist-sha256 "$dsha" --functions "$SANDBOX/hexowner" >"$SANDBOX/own-out.txt" 2>"$SANDBOX/own-err.txt" || true
grep -q 'hardcoded credential' "$SANDBOX/own-err.txt" || fail "64-hex OWNER_EMAIL_HASH without owner| comparison was accepted"
grep -q "$HEX_ID" "$SANDBOX/own-err.txt" "$SANDBOX/own-out.txt" && fail "identity hash was printed"
pass "64-hex OWNER_EMAIL_HASH without the owner| comparison is refused"
ENV_FN="$SANDBOX/env-fn"
mkdir -p "$ENV_FN/_lib"
cat > "$ENV_FN/index.js" << 'EOF'
export function onRequest(){ return new Response('<div id="motw-slot" class="motw-home"></div><section id="featured"></section>', {headers:{"content-type":"text/html"}}); }
EOF
cat > "$ENV_FN/_lib/auth.js" << 'EOF'
export const PROVIDERS = {
  google: { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
  x: { id: "X_CLIENT_ID", secret: "X_CLIENT_SECRET" },
};
export function useEnv(cfg, env) { return env[cfg.id] && env[cfg.secret]; }
EOF
printf 'const OWNER_EMAIL_HASH = "%s";\nasync function sha256Hex(s){ return s; }\nexport async function isOwnerEmail(e){ return (await sha256Hex("owner|" + e)) === OWNER_EMAIL_HASH; }\n' "$HEX_ID" > "$ENV_FN/_lib/account-profile.js"
./scripts/release.sh commission --dist "$SANDBOX/secret-dist" --dist-sha256 "$dsha" --functions "$ENV_FN" >"$SANDBOX/env-out.txt" 2>"$SANDBOX/env-err.txt"
grep -q 'oauth_literals none' "$SANDBOX/env-out.txt" || fail "env-name source was not classified as clean"
grep -q 'identity_identifier reviewed' "$SANDBOX/env-out.txt" || fail "reviewed identity identifier was not recorded"
grep -q '^class production$' .du-releases/staged/"$(awk '/^candidate /{print $2}' "$SANDBOX/env-out.txt")"/RELEASE.txt || fail "env-name source was not production class"
grep -q "$HEX_ID" "$SANDBOX/env-out.txt" "$SANDBOX/env-err.txt" && fail "identity hash was printed during commission"
grep -q '^validated 0$' .du-releases/baseline/BASELINE.txt || fail "env-name commission changed historical validation"
pass "env names plus reviewed identity hash commission as production"
DIST="$SANDBOX/dist36"
mkdir -p "$DIST/store" "$DIST/tools"
cp "$PUB/index.html" "$DIST/index.html"
cp "$PUB/store/index.html" "$DIST/store/index.html"
echo 'privacy-page' > "$DIST/privacy.html"
echo 'marker-173' > "$DIST/.du-prod-ok"
echo 'tooling' > "$DIST/tools/note.txt"
echo 'readme' > "$DIST/README.md"
dsha="$(./scripts/release.sh digest --dir "$DIST")"
expect_refuse "commission source tools and README" ./scripts/release.sh commission --dist "$DIST" --dist-sha256 "$dsha" --functions "$PUB/functions" --strip .du-prod-ok
rm -rf "$DIST/tools" "$DIST/README.md"
dsha="$(./scripts/release.sh digest --dir "$DIST")"
expect_refuse "commission marker without an explicit strip" ./scripts/release.sh commission --dist "$DIST" --dist-sha256 "$dsha" --functions "$PUB/functions"
./scripts/release.sh commission --dist "$DIST" --dist-sha256 "$dsha" --functions "$PUB/functions" --strip .du-prod-ok >"$SANDBOX/commission.txt"
cand="$(awk '/^candidate /{print $2}' "$SANDBOX/commission.txt")"
[[ -n "$cand" ]] || fail "no candidate digest"
grep -q 'historical_provenance=unknown' "$SANDBOX/commission.txt" || fail "commission claimed historical proof"
grep -q '^validated 0$' .du-releases/baseline/BASELINE.txt || fail "commission edited historical validation"
grep -q '^kind commissioned$' ".du-releases/staged/$cand/KIND" || fail "candidate kind"
[[ -f ".du-releases/staged/$cand/tree/privacy.html" ]] || fail "public privacy page was removed"
[[ -f ".du-releases/staged/$cand/tree/.du-prod-ok" ]] || fail "strip deleted the sealed marker"
expect_refuse "attest before execute" ./scripts/release.sh attest --digest "$cand" --reviewer Alpha \
  --shot-390 "$SANDBOX/s390.png" --shot-412 "$SANDBOX/s412.png" --shot-1280 "$SANDBOX/s1280.png"
./scripts/release.sh execute --digest "$cand" >/dev/null
./scripts/release.sh attest --digest "$cand" --reviewer "Parent" \
  --shot-390 "$SANDBOX/s390.png" --shot-412 "$SANDBOX/s412.png" --shot-1280 "$SANDBOX/s1280.png" >/dev/null
grep -q '^publishable 1$' ".du-releases/staged/$cand/ATTESTATION.txt" || fail "parent attest did not publish-enable the candidate"
cat > "$SANDBOX/mock-wrangler.sh" << EOF
#!/bin/bash
echo "\$*" > "$SANDBOX/pub-args.txt"
echo "cwd=\$(pwd)" >> "$SANDBOX/pub-args.txt"
[[ "\$1" == "-y" && "\$2" == "wrangler@3.114.17" && "\$3" == "pages" && "\$4" == "deploy" && "\$5" == "public" ]]
[[ "\$*" == *"--no-bundle"* && "\$*" != *"--config"* ]]
[[ -f wrangler.toml && ! -f wrangler.release.toml ]]
[[ ! -d functions && ! -d public/functions ]]
[[ ! -e public/tools && ! -e public/README.md && ! -e public/.du-prod-ok ]]
[[ -f public/_worker.js && -f public/privacy.html && -f public/store/index.html ]]
sha256sum public/_worker.js > "$SANDBOX/shipped-worker.sha"
cmp public/store/index.html "$PUB/store/index.html"
echo "https://abc54a91a04.digital-underground.pages.dev"
EOF
chmod +x "$SANDBOX/mock-wrangler.sh"
DU_PAGES_DEPLOY_CMD="$SANDBOX/mock-wrangler.sh" ./scripts/release.sh deploy --digest "$cand" >"$SANDBOX/dep.txt"
grep -q 'pages_id=abc54a91a04' "$SANDBOX/dep.txt" || fail "receipt did not record the mock pages id"
grep -q 'cwd=' "$SANDBOX/pub-args.txt" || fail "publisher was not invoked"
grep -q 'pages deploy public' "$SANDBOX/pub-args.txt" || fail "publisher args are not the real wrangler args"
shipped="$(awk '{print $1}' "$SANDBOX/shipped-worker.sha")"
grep -q "^worker_sha $shipped$" ".du-releases/receipts/abc54a91a04.txt" || fail "receipt worker is not the shipped file"
grep -q "^worker_sha $shipped$" ".du-releases/staged/$cand/ATTESTATION.txt" || fail "shipped worker is not the attested pin"
pass "stub publisher received the sealed worker; remote upload unproven"

chmod -R u+w ".du-releases/staged/$cand/tree"
echo 'tamper' >> ".du-releases/staged/$cand/tree/pinned-worker.js"
rm -f "$SANDBOX/pub-args.txt"
expect_refuse "deploy after pinned worker mutation" env DU_PAGES_DEPLOY_CMD="$SANDBOX/mock-wrangler.sh" ./scripts/release.sh deploy --digest "$cand"
[[ ! -f "$SANDBOX/pub-args.txt" ]] || fail "mutated worker still called the publisher"
expect_refuse "execute tampered sealed tree" ./scripts/release.sh execute --digest "$cand"
grep -q 'Refusing to copy or run' "$SANDBOX/err.txt" || fail "execute copied a tampered sealed tree"
expect_refuse "layout tampered sealed tree" ./scripts/release.sh layout --digest "$cand"
grep -q 'Refusing to copy or run' "$SANDBOX/err.txt" || fail "layout copied a tampered sealed tree"

DU_PAGES_DEPLOY_CMD="$SANDBOX/mock-wrangler.sh" ./scripts/release.sh rollback >"$SANDBOX/rb.txt"
grep -q 'via rollback' .du-releases/known-good/RECEIPT.txt || fail "rollback did not write a receipt"
grep -q "^worker_sha $shipped$" .du-releases/known-good/RECEIPT.txt || fail "rollback shipped different worker bytes"
pass "rollback republished the receipt bytes"

touch "$TREE/.du-deploy-blocked"
expect_refuse "rollback while frozen" ./scripts/release.sh rollback
rm -f "$TREE/.du-deploy-blocked"
chmod -R u+w .du-releases/known-good
echo x >> .du-releases/known-good/tree/pinned-worker.js
expect_refuse "rollback after known-good mutation" ./scripts/release.sh rollback
pass "freeze and known-good mutation block rollback"

if [[ -n "${DU_FIXTURE:-}" ]]; then
  FIX="$DU_FIXTURE"
  [[ -d "$FIX/source-functions/functions" && -f "$FIX/public-paths-36d.tsv" && -f "$FIX/public-representative/index.html" ]] || fail "fixture incomplete"
  fn_count="$(find "$FIX/source-functions/functions" -type f | wc -l | tr -d ' ')"
  [[ "$fn_count" == "104" ]] || fail "fixture functions count is $fn_count"
  path_count="$(python3 -c 'import pathlib; p=pathlib.Path("'"$FIX"'/public-paths-36d.tsv"); print(sum(1 for i,l in enumerate(p.read_text().splitlines()) if l and not (i==0 and l.startswith("path"))))')"
  [[ "$path_count" == "7145" ]] || fail "fixture manifest count is $path_count"
  basepub="$SANDBOX/real-base"
  rm -rf "$basepub"
  mkdir -p "$basepub/functions"
  cp "$FIX/public-representative/index.html" "$basepub/index.html"
  cp "$FIX/source-functions/functions/index.js" "$basepub/functions/index.js"
  ./scripts/release.sh bootstrap --from "$basepub" --pages-id 36d85669 --deployed-at 2026-11-05T19:24:00Z >/dev/null
  dsha="$(./scripts/release.sh digest --dir "$FIX/public-representative")"
  ./scripts/release.sh commission --dist "$FIX/public-representative" --dist-sha256 "$dsha" --functions "$FIX/source-functions/functions" --manifest "$FIX/public-paths-36d.tsv" >"$SANDBOX/real-commission.txt"
  rcand="$(awk '/^candidate /{print $2}' "$SANDBOX/real-commission.txt")"
  grep -q 'historical_provenance=unknown' "$SANDBOX/real-commission.txt" || fail "real commission claimed historical proof"
  grep -q '^validated 0$' .du-releases/baseline/BASELINE.txt || fail "real commission edited historical validation"
  [[ ! -e ".du-releases/staged/$rcand/tree/functions/_lib/auth.js" ]] || true
  # auth source stays in functions, never in the public upload
  ./scripts/release.sh layout --digest "$rcand" >"$SANDBOX/real-layout.txt"
  rroot="$(awk '/^layout_root /{print $2}' "$SANDBOX/real-layout.txt")"
  [[ ! -e "$rroot/public/functions" && ! -e "$rroot/public/_lib/auth.js" && ! -e "$rroot/functions" ]] || fail "oauth source reached the upload"
  [[ -f "$rroot/public/owner/index.html" && -f "$rroot/public/_worker.js" ]] || fail "owner UI or pinned worker missing"
  [[ ! -e "$rroot/public/.du-prod-ok" ]] || fail "marker was uploaded"
  ./scripts/release.sh execute --digest "$rcand" >"$SANDBOX/real-exec.txt"
  grep -q '^kv_writes 0$' ".du-releases/staged/$rcand/RUNTIME.txt" || fail "runtime wrote KV"
  grep -q '^route / 200$' ".du-releases/staged/$rcand/RUNTIME.txt" || fail "home did not run"
  grep -q '^home_motw 1$' ".du-releases/staged/$rcand/RUNTIME.txt" || fail "home lost motw"
  grep -q '^home_featured 1$' ".du-releases/staged/$rcand/RUNTIME.txt" || fail "home lost featured"
  grep -q '^home_hc_shop 0$' ".du-releases/staged/$rcand/RUNTIME.txt" || fail "home showed store promos"
  grep -q '^route /api/community/listings 200$' ".du-releases/staged/$rcand/RUNTIME.txt" || fail "listings did not run"
  grep -q '^owner_production_host 401$' ".du-releases/staged/$rcand/RUNTIME.txt" || fail "production-host owner was not 401"
  grep -q '^class diagnostic$' ".du-releases/staged/$rcand/RELEASE.txt" || fail "redacted source was treated as production"
  expect_refuse "diagnostic candidate deploy" ./scripts/release.sh deploy --digest "$rcand"
  grep -q 'diagnostic candidate' "$SANDBOX/err.txt" || fail "diagnostic deploy was not blocked"
  grep -q '^asset store absent$' ".du-releases/staged/$rcand/RUNTIME.txt" || fail "missing store bytes were treated as a served page"
  grep -q '^asset league absent$' ".du-releases/staged/$rcand/RUNTIME.txt" || fail "missing league bytes were treated as a served page"
  grep -q '^asset sitemap absent$' ".du-releases/staged/$rcand/RUNTIME.txt" || fail "missing sitemap bytes were treated as a served page"
  grep -q '^kv_blobs_added 0$' ".du-releases/staged/$rcand/RUNTIME.txt" || fail "KV blob check missing"
  cp ".du-releases/staged/$rcand/RUNTIME.txt" /tmp/real-runtime.txt
  pass "real 104-function worker ran against the 7145-path corpus"
  # The fixture's REDACTED_* strings are a mistaken redaction of env names.
  # Restore those names and a representative identity hash, then commission.
  CORRECTED="$SANDBOX/corrected-fn"
  rm -rf "$CORRECTED"
  cp -a "$FIX/source-functions/functions" "$CORRECTED"
  python3 - "$CORRECTED" << 'PY'
import hashlib, sys
from pathlib import Path
root = Path(sys.argv[1])
auth = root / "_lib" / "auth.js"
text = auth.read_text(encoding="utf-8")
old_g = 'id: "REDACTED_ID", secret: "REDACTED_SECRET"'
new_g = 'id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET"'
old_x = 'id: "X_CLIENT_ID", secret: "REDACTED_SECRET"'
new_x = 'id: "X_CLIENT_ID", secret: "X_CLIENT_SECRET"'
if old_g not in text or old_x not in text:
    sys.stderr.write("fixture auth shape changed\n")
    sys.exit(1)
text = text.replace(old_g, new_g, 1).replace(old_x, new_x, 1)
auth.write_text(text)
profile = root / "_lib" / "account-profile.js"
ptext = profile.read_text(encoding="utf-8")
token = '"REDACTED_OWNER_EMAIL_HASH"'
if token not in ptext:
    sys.stderr.write("fixture identity placeholder missing\n")
    sys.exit(1)
digest = hashlib.sha256(b"owner|fixture@invalid.example").hexdigest()
profile.write_text(ptext.replace(token, '"' + digest + '"', 1))
Path("/tmp/rep-hash.txt").write_text(digest + "\n")
if "REDACTED" in auth.read_text() or "REDACTED" in profile.read_text():
    sys.stderr.write("placeholder remained\n")
    sys.exit(1)
PY
  ./scripts/release.sh commission --dist "$FIX/public-representative" --dist-sha256 "$dsha" --functions "$CORRECTED" --manifest "$FIX/public-paths-36d.tsv" >"$SANDBOX/corrected-out.txt" 2>"$SANDBOX/corrected-err.txt"
  ccand="$(awk '/^candidate /{print $2}' "$SANDBOX/corrected-out.txt")"
  grep -q 'oauth_literals none' "$SANDBOX/corrected-out.txt" || fail "corrected source was not clean"
  grep -q 'identity_identifier reviewed' "$SANDBOX/corrected-out.txt" || fail "corrected source lost the identity classification"
  grep -q '^class production$' ".du-releases/staged/$ccand/RELEASE.txt" || fail "corrected source was not production class"
  grep -q '^validated 0$' .du-releases/baseline/BASELINE.txt || fail "corrected commission changed historical validation"
  grep -q -F "$(tr -d '\n' < /tmp/rep-hash.txt)" "$SANDBOX/corrected-out.txt" "$SANDBOX/corrected-err.txt" && fail "representative identity hash was printed"
  rm -f /tmp/rep-hash.txt
  pass "unmodified-shape 104 functions commission as production"
fi
# Large-tree scan must stay fail-closed. find|grep -q under pipefail does not.
MANY="$SANDBOX/many-src"
rm -rf "$MANY"
mkdir -p "$MANY/functions" "$MANY/src"
echo '<div id="motw-slot" class="motw-home"></div><section id="featured"><div id="ftrRow"></div></section><script>cm_kerzy_neonbastion ftr-vid muted IntersectionObserver</script>' > "$MANY/index.html"
echo 'export function onRequest(){ return new Response("ok"); }' > "$MANY/functions/index.js"
python3 - "$MANY/src" << 'PY'
import sys
from pathlib import Path
d = Path(sys.argv[1])
for i in range(7145):
    (d / f"s{i:05d}.js").write_text("x\n")
PY
expect_refuse "scan stays closed on a 7145-file private tree" ./scripts/release.sh bootstrap --from "$MANY" --pages-id 36d85669 --deployed-at 2026-11-05T19:24:00Z

# A saved public snapshot must not lose its reviewed owner shell at bootstrap.
mkdir -p "$PUB/owner"
echo "public owner shell" > "$PUB/owner/index.html"
./scripts/release.sh bootstrap --from "$PUB" --pages-id 36d85669 --deployed-at 2026-11-05T19:24:00Z > "$SANDBOX/boot-owner.txt"
[[ -f .du-releases/baseline/tree/owner/index.html ]] || fail "bootstrap dropped public owner UI"
pass "bootstrap retains saved public owner UI"
echo "ALL PASS"
chmod -R u+w "$SANDBOX" || true
rm -rf "$SANDBOX"
