#!/usr/bin/env bash
# Fail-closed production release. Does not publish the dirty working tree.
# Known-good public snapshot (including functions/) + explicit allowlist
# -> sealed output digest -> reviewer attestation bound to that digest
# Publish layout, measured on wrangler 3.114.17:
#   upload-root/functions   compiled from the process cwd, not uploaded
#   upload-root/public      the only directory passed to pages deploy
# Wrangler is started in upload-root. It is not started in /tmp.
# Source and output manifests are recorded and checked again at deploy.
# A Pages receipt is written only after wrangler prints a deployment id.
# Deploy and rollback stay closed while .du-deploy-blocked exists, and while
# the baseline functions compiled bundle is unproven. There is no bypass flag.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd -P)"
REL="$ROOT/.du-releases"
BASE="$REL/baseline"
KNOWN="$REL/known-good"

die() { echo "REFUSED: $*" >&2; exit 2; }

guard_tree() {
  local base
  base="$(basename "$ROOT")"
  [[ "$base" == "du-good" ]] || die "only /workspace/du-good may release (this tree is $ROOT)."
  [[ -f "$ROOT/.du-prod-ok" ]] || die "missing .du-prod-ok."
}

guard_publish() {
  guard_tree
  if [[ -f "$ROOT/.du-deploy-blocked" ]]; then
    die ".du-deploy-blocked is present. Deploy and rollback are locked. The unlock is to remove that file yourself. There is no bypass flag."
  fi
}

# Wrangler 3.114.17 is the measured compiler. npx is pinned to that version.
# DU_WRANGLER may point at that same binary for an offline test.
WRANGLER_PIN="3.114.17"
BINDINGS_SHA="9ada0c822df2d48dcff0bfe465be1c2a1cc366aeb07806b620919b2c7673aeb0"

run_wrangler() {
  if [[ -n "${DU_WRANGLER:-}" ]]; then
    "$DU_WRANGLER" "$@"
  else
    npx -y "wrangler@${WRANGLER_PIN}" "$@"
  fi
}

require_wrangler_pin() {
  local got
  got="$(run_wrangler --version | tr -d '[:space:]')"
  [[ "$got" == "$WRANGLER_PIN" ]] || die "wrangler version is $got. This pipeline is pinned to $WRANGLER_PIN."
  [[ "$(file_sha "$ROOT/scripts/pages-bindings.toml")" == "$BINDINGS_SHA" ]] || die "scripts/pages-bindings.toml does not match the pinned binding config."
}

# Homepage shell rules. Footer PlanetView signup is not hc-shop and is allowed.
assert_homepage() {
  local index="$1"
  [[ -f "$index" ]] || die "missing homepage index.html at $index"
  python3 - "$index" << 'PY'
import re, sys
from pathlib import Path
text = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
def bad(msg):
    sys.stderr.write("REFUSED: " + msg + "\n")
    sys.exit(1)
if not re.search(r'<div[^>]*id="motw-slot"[^>]*class="[^"]*\bmotw-home\b', text) and \
   not re.search(r'<div[^>]*class="[^"]*\bmotw-home\b[^"]*"[^>]*id="motw-slot"', text):
    bad("homepage #motw-slot must include class motw-home")
if "hc-shop" in text or "hc-pill" in text:
    bad("homepage must not contain hero store promos (hc-shop/hc-pill)")
if 'id="featured"' not in text or 'id="ftrRow"' not in text:
    bad("homepage Featured section (#featured/#ftrRow) is missing")
if 'ftr-promo' not in text or 'this-spot-could-be-yours-wide.webp' not in text or 'this-spot-could-be-yours-16x9.webp' not in text:
    bad("Featured must retain the Maker Pro promo artwork")
if 'Get Maker Pro' not in text or '/store/p/maker-pro/' not in text:
    bad("Featured promo must retain its Get Maker Pro CTA")
if re.search(r"var\s+PICKS\s*=\s*\[\s*['\"]cm_kerzy_neonbastion", text):
    bad("Rival Lanes must not return as the Featured pick")
print("layout-ok", sys.argv[1])
PY
}

assert_store_unchanged() {
  local staged="$1"
  if [[ ! -d "$BASE/tree/store" && ! -d "$staged/store" ]]; then
    return 0
  fi
  if [[ ! -d "$BASE/tree/store" && -d "$staged/store" ]]; then
    die "store/ appeared but the known-good baseline has no store/. Refusing."
  fi
  if [[ -d "$BASE/tree/store" && ! -d "$staged/store" ]]; then
    die "store/ is missing from this candidate. Refusing to drop the store."
  fi
  local bh sh
  bh="$(hash_tree "$BASE/tree/store")"
  sh="$(hash_tree "$staged/store")"
  [[ "$bh" == "$sh" ]] || die "store/ differs from the known-good baseline. Store edits are not part of a homepage release."
}

forbidden_path() {
  local p="$1"
  [[ "$p" == /* ]] && return 0
  [[ "$p" == *..* ]] && return 0
  [[ "$p" == .env* || "$p" == */.env* ]] && return 0
  [[ "$p" == secrets || "$p" == secrets/* || "$p" == */secrets/* ]] && return 0
  [[ "$p" == src || "$p" == src/* || "$p" == .git || "$p" == .git/* ]] && return 0
  # Reviewed static owner UI may be explicitly staged; credential guards still apply.
  [[ "$p" == node_modules || "$p" == node_modules/* ]] && return 0
  [[ "$p" == functions/_lib/owner || "$p" == functions/_lib/owner/* || "$p" == functions/_lib/owner.js ]] && return 0
  [[ "$p" == functions/_lib/auth || "$p" == functions/_lib/auth/* || "$p" == functions/_lib/auth.js ]] && return 0
  [[ "$p" == *apikeys* ]] && return 0
  [[ "$p" == *.pem || "$p" == *.key || "$p" == *.keystore || "$p" == *SECRET* ]] && return 0
  [[ "$p" == store || "$p" == store/* ]] && return 0
  return 1
}

scan_tree_secrets() {
  local dir="$1" hit
  # Walk in-process. find|grep -q under pipefail returns 141 and can fail open.
  hit="$(python3 - "$dir" << 'PY'
import os, sys
root = sys.argv[1]
bad = []
for dp, dns, fns in os.walk(root):
    base = os.path.basename(dp)
    if base in {".git", "node_modules", "secrets", "src"} or base.startswith(".env"):
        bad.append(os.path.relpath(dp, root))
    for name in fns:
        low = name.lower()
        rel = os.path.relpath(os.path.join(dp, name), root)
        if low.endswith((".pem", ".keystore")) or low.startswith(".env") or "secret" in low:
            bad.append(rel)
if bad:
    sys.stdout.write(bad[0])
PY
)"
  [[ -z "$hit" ]] || die "tree contains a credential or private source path ($hit)."
}

hash_tree() {
  local dir="$1"
  (cd "$dir" && find . -type f ! -name 'RELEASE-*' ! -name 'ATTESTATION.txt' -print0 | sort -z | xargs -0 -r sha256sum)
}

digest_of() {
  local dir="$1"
  hash_tree "$dir" | sha256sum | awk '{print $1}'
}

file_sha() {
  sha256sum "$1" | awk '{print $1}'
}

require_functions() {
  local dir="$1" n
  [[ -d "$dir/functions" ]] || die "missing functions/ in $dir. Refusing so publish cannot attach a different functions bundle."
  n="$(python3 - "$dir/functions" << 'PY'
import os, sys
n = 0
for dp, dns, fns in os.walk(sys.argv[1]):
    n += len(fns)
print(n)
PY
)"
  [[ "${n:-0}" -gt 0 ]] || die "functions/ is empty in $dir."
}

functions_digest_of() {
  hash_tree "$1/functions" | sha256sum | awk '{print $1}'
}

normalize_pages_id() {
  local id="$1" hex
  hex="$(printf '%s' "$id" | tr -d '-' | tr 'A-F' 'a-f')"
  [[ "$hex" =~ ^[0-9a-f]+$ ]] || die "--pages-id must be a Cloudflare Pages deployment id, not a git SHA."
  if [[ ${#hex} -eq 40 ]]; then
    die "--pages-id looks like a 40-hex git SHA. Pass the Pages deployment id (8-char alias or UUID)."
  fi
  if [[ ${#hex} -lt 8 || ${#hex} -gt 32 ]]; then
    die "--pages-id must be the Pages deployment id (8-char alias or UUID)."
  fi
  printf '%s\n' "$(printf '%s' "$id" | tr 'A-F' 'a-f')"
}

clean_allow_line() {
  local line="$1"
  line="${line%%#*}"
  printf '%s' "$line" | tr -d '[:space:]'
}

write_source_manifest() {
  local allow="$1" out="$2" line
  : > "$out"
  while IFS= read -r line || [[ -n "${line:-}" ]]; do
    line="$(clean_allow_line "$line")"
    [[ -z "$line" ]] && continue
    [[ "$line" == -* || "$line" == +* ]] && continue
    (cd "$ROOT" && sha256sum -- "$line") >> "$out"
  done < "$allow"
}

# Strip lines are only the control markers that must not become public assets.
# Any other deletion is refused. Markers are removed from the upload's public
# directory only. The sealed tree digest still contains them.
assert_strip_path() {
  case "$1" in
    .du-prod-ok|.du-deploy-blocked|.du-releases) ;;
    *) die "refusing to delete $1. The only explicit public strips are .du-prod-ok, .du-deploy-blocked, and .du-releases." ;;
  esac
}

stage_base() {
  if [[ -f "$REL/candidate/KIND" ]] && grep -q '^kind commissioned$' "$REL/candidate/KIND" && [[ -d "$REL/candidate/tree" ]]; then
    printf '%s\n' "$REL/candidate/tree"
  else
    printf '%s\n' "$BASE/tree"
  fi
}

# One wrangler 3.114.17 compile. The outfile embeds random identifiers, so a
# second build is not the same bytes. Keep this exact module and ship it.
pin_worker() {
  local funcdir="$1" out="$2" work
  require_wrangler_pin
  [[ -d "$funcdir" ]] || die "no functions directory to compile."
  work="$(mktemp -d)"
  mkdir -p "$work/functions"
  cp -a "$funcdir"/. "$work/functions/"
  (cd "$work" && run_wrangler pages functions build functions --outfile "$work/raw.js" --compatibility-date 2024-09-23 >/dev/null)
  python3 - "$work/raw.js" "$out" << 'PY'
import sys
from pathlib import Path
raw = Path(sys.argv[1]).read_bytes()
boundary = raw.split(b"\r\n", 1)[0]
body = None
for chunk in raw.split(boundary):
    if b"\r\n\r\n" not in chunk:
        continue
    part = chunk.split(b"\r\n\r\n", 1)[1].strip(b"\r\n-")
    if part.startswith(b"var "):
        body = part
        break
if body is None:
    sys.stderr.write("REFUSED: wrangler outfile has no worker module\n")
    sys.exit(1)
Path(sys.argv[2]).write_bytes(body)
PY
  rm -rf "$work"
}

# OAuth id/secret fields in auth.js hold env names, not secret values.
# OWNER_EMAIL_HASH is a reviewed identity identifier only in its exact form.
# Anything else that looks like a credential is refused. Values are not printed.
flag_oauth_literals() {
  local funcdir="$1"
  python3 - "$funcdir" << 'PY'
import re, sys
from pathlib import Path
root = Path(sys.argv[1])
ENV_NAMES = {"GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "X_CLIENT_ID", "X_CLIENT_SECRET"}
value_re = re.compile(
    r'''(?ix)\b(client_secret|api_key|apikey|password|OWNER_EMAIL_HASH|secret)\s*[:=]\s*["']([^"'\s]{8,200})["']'''
)
token_re = re.compile(r"GOCSPX-[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]+PRIVATE KEY-----")
owner_compare_re = re.compile(r'''sha256(?:Hex)?\(\s*["']owner\|["']\s*\+''')
redacted = 0
hard = 0
identity = 0
for path in root.rglob("*"):
    if not path.is_file() or path.suffix.lower() not in {".js", ".mjs", ".ts", ".json"}:
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    if token_re.search(text):
        hard += 1
        continue
    for match in value_re.finditer(text):
        key, val = match.group(1), match.group(2)
        if val.startswith("REDACTED"):
            redacted += 1
            continue
        if val in ENV_NAMES:
            continue
        if key == "OWNER_EMAIL_HASH" and re.fullmatch(r"[0-9a-fA-F]{64}", val) and owner_compare_re.search(text):
            identity += 1
            continue
        hard += 1
if hard:
    sys.stderr.write("REFUSED: functions source has %s hardcoded credential literal(s). Values are not printed.\n" % hard)
    sys.exit(2)
sys.stdout.write("oauth_literals %s\n" % ("redacted-placeholders" if redacted else "none"))
if identity:
    sys.stdout.write("identity_identifier reviewed\n")
PY
}

reject_source_exposure() {
  local public_dir="$1" allow="$2" corpus="${3:-}" hit
  hit="$(python3 - "$public_dir" "$allow" "$corpus" << 'PY'
import os, sys
public, allow_path, corpus_path = sys.argv[1:]
allowed = set()
if allow_path and os.path.isfile(allow_path):
    allowed = {ln.strip() for ln in open(allow_path, encoding="utf-8") if ln.strip()}
corpus = set()
if corpus_path and os.path.isfile(corpus_path) and os.path.getsize(corpus_path):
    for i, ln in enumerate(open(corpus_path, encoding="utf-8")):
        if i == 0 and ln.startswith("path\t"):
            continue
        corpus.add(ln.split("\t", 1)[0].strip())
source_roots = ("scripts/", "docs/", "workers/", "src/", "secrets/")
names = {"wrangler.toml", "dev.log", "README", "README.md"}
for dp, dns, fns in os.walk(public):
    for name in fns:
        rel = os.path.relpath(os.path.join(dp, name), public).replace(os.sep, "/")
        low = name.lower()
        if low.endswith((".pem", ".keystore")) or low.startswith(".env") or "secret" in low:
            sys.stdout.write(rel)
            raise SystemExit
        if rel.startswith("functions/") or rel.endswith("/_lib/auth.js") or rel.endswith("/_lib/owner.js"):
            sys.stdout.write(rel)
            raise SystemExit
        if rel in names or rel.startswith(source_roots):
            if rel not in allowed:
                sys.stdout.write(rel)
                raise SystemExit
        if rel.startswith("tools/") or rel.startswith("owner/"):
            if rel in corpus or rel in allowed:
                continue
            sys.stdout.write(rel)
            raise SystemExit
PY
)"
  [[ -z "$hit" ]] || die "user-facing package contains source path $hit. tools/ and owner/ pages already in the sealed public manifest stay. New paths and credential files do not."
}

prepare_upload() {
  local tree="$1" dest="$2" strips="$3" allow="$4" corpus="${5:-}" m hit
  [[ -f "$ROOT/scripts/pages-bindings.toml" ]] || die "missing scripts/pages-bindings.toml"
  rm -rf "$dest"
  mkdir -p "$dest/public"
  cp -a "$tree"/. "$dest/public/"
  chmod -R u+w "$dest"
  rm -rf "$dest/public/functions"
  if [[ -f "$dest/public/pinned-worker.js" ]]; then
    cp "$dest/public/pinned-worker.js" "$dest/public/_worker.js"
    rm -f "$dest/public/pinned-worker.js"
  fi
  : > "$dest/DEVIATION.txt"
  {
    echo "asset_root public"
    echo "functions_uploaded 0"
    echo "wrangler_cwd upload-root"
    echo "wrangler_argv pages deploy public --no-bundle"
    if [[ -f "$dest/public/_worker.js" ]]; then
      echo "worker_pinned yes"
      echo "worker_sha $(file_sha "$dest/public/_worker.js")"
    else
      echo "worker_pinned no"
    fi
  } >> "$dest/DEVIATION.txt"
  if [[ -f "$strips" ]]; then
    while IFS= read -r m || [[ -n "${m:-}" ]]; do
      [[ -z "$m" ]] && continue
      assert_strip_path "$m"
      [[ -e "$tree/$m" ]] || die "explicit strip $m is not in the sealed tree."
      if [[ -e "$dest/public/$m" ]]; then
        echo "strip $m $(sha256sum "$tree/$m" | awk '{print $1}')" >> "$dest/DEVIATION.txt"
        rm -rf "$dest/public/$m"
      else
        die "explicit strip $m was not a public asset."
      fi
    done < "$strips"
  fi
  hit="$(python3 - "$dest/public" << 'PY'
import os, sys
root = sys.argv[1]
for dp, dns, fns in os.walk(root):
    for name in list(dns) + fns:
        if name in {".du-prod-ok", ".du-deploy-blocked", ".du-releases"}:
            sys.stdout.write(os.path.relpath(os.path.join(dp, name), root))
            raise SystemExit
PY
)"
  [[ -z "$hit" ]] || die "control marker remains in public assets ($hit). Add an explicit reviewed strip, for example -.du-prod-ok."
  reject_source_exposure "$dest/public" "$allow" "$corpus"
  [[ ! -d "$dest/functions" ]] || die "upload root must not contain functions/. The pinned worker is the shipped code."
  cp "$ROOT/scripts/pages-bindings.toml" "$dest/wrangler.toml"
  grep -q 'id = "5e086a24647c419f8ac5577b85a0c651"' "$dest/wrangler.toml" || die "pages bindings file lost COMMUNITY_KV."
  grep -q 'binding = "DOWNLOADS_KV"' "$dest/wrangler.toml" || die "pages bindings file lost DOWNLOADS_KV."
  grep -q 'id = "28ce144531b14fb28d48977050e2a8ec"' "$dest/wrangler.toml" || die "pages bindings file lost du-product-files id."
  grep -q 'binding = "AI"' "$dest/wrangler.toml" || die "pages bindings file lost the AI binding."
  grep -q 'pages_build_output_dir = "public"' "$dest/wrangler.toml" || die "pages bindings file must upload public/ only."
}

verify_source_manifest() {
  local file="$1" sum path now
  [[ -f "$file" ]] || die "missing source manifest."
  [[ -s "$file" ]] || return 0
  while read -r sum path; do
    [[ -n "$sum" ]] || continue
    [[ -f "$ROOT/$path" ]] || die "allowlisted source missing after stage: $path"
    now="$(cd "$ROOT" && sha256sum -- "$path" | awk '{print $1}')"
    [[ "$now" == "$sum" ]] || die "source changed after stage: $path"
  done < "$file"
}

require_sealed_tree() {
  local digest="$1" now
  [[ -d "$REL/staged/$digest/tree" ]] || die "no sealed tree for $digest."
  now="$(digest_of "$REL/staged/$digest/tree")"
  [[ "$now" == "$digest" ]] || die "sealed tree no longer matches $digest. Refusing to copy or run it."
  [[ -f "$REL/staged/$digest/OUTPUT.sha256" ]] || die "sealed tree $digest has no output manifest. Refusing to copy or run it."
  verify_output_manifest "$REL/staged/$digest/tree" "$REL/staged/$digest/OUTPUT.sha256" "$digest"
}

verify_output_manifest() {
  local tree="$1" manifest="$2" digest="$3" now listed fresh
  now="$(digest_of "$tree")"
  [[ "$now" == "$digest" ]] || die "output tree does not match digest ($now != $digest)."
  [[ -f "$manifest" ]] || die "missing output manifest."
  listed="$(file_sha "$manifest")"
  [[ "$listed" == "$digest" ]] || die "output manifest is not bound to digest $digest (manifest sha $listed)."
  fresh="$(mktemp)"
  hash_tree "$tree" > "$fresh"
  if ! cmp -s "$fresh" "$manifest"; then
    rm -f "$fresh"
    die "output manifest does not match the staged tree."
  fi
  rm -f "$fresh"
}

seal() {
  chmod -R a-w "$1" || true
}

png_size() {
  python3 - "$1" << 'PY'
import struct, sys
p = sys.argv[1]
with open(p, "rb") as f:
    sig = f.read(8)
    if sig != b"\x89PNG\r\n\x1a\n":
        sys.exit("not a png")
    length = struct.unpack(">I", f.read(4))[0]
    ctype = f.read(4)
    if ctype != b"IHDR" or length < 8:
        sys.exit("bad ihdr")
    w, h = struct.unpack(">II", f.read(8))
print(w, h)
PY
}

read_meta_field() {
  local key="$1" f line
  for f in "$KNOWN/RECEIPT.txt" "$KNOWN/DEPLOYED.txt" "$KNOWN/BASELINE.txt"; do
    [[ -f "$f" ]] || continue
    line="$(awk -v k="$key" '$1==k {print $2; exit}' "$f")"
    if [[ -n "$line" ]]; then
      printf '%s\n' "$line"
      return 0
    fi
  done
  return 1
}

cmd="${1:-}"
shift || true

case "$cmd" in
  bootstrap)
    guard_tree
    from=""; pages_id=""; deployed_at=""; note="bootstrap"
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --from) from="$2"; shift 2 ;;
        --pages-id) pages_id="$2"; shift 2 ;;
        --deployed-at) deployed_at="$2"; shift 2 ;;
        --note) note="$2"; shift 2 ;;
        *) die "unknown bootstrap arg: $1" ;;
      esac
    done
    [[ -n "$from" && -d "$from" ]] || die "bootstrap --from must be a directory of a known-good public deploy, not the dirty worktree."
    from="$(cd "$from" && pwd -P)"
    [[ "$from" != "$ROOT" ]] || die "refusing to bless the du-good worktree. Pass the saved upload of one Pages deployment."
    [[ ! -f "$from/scripts/build-public.sh" ]] || die "refusing: --from contains the deploy script (source tree)."
    [[ ! -f "$from/.du-deploy-blocked" ]] || die "refusing: --from contains .du-deploy-blocked. That lock belongs on the worktree, not in a public snapshot."
    [[ -n "$pages_id" ]] || die "bootstrap requires --pages-id (Cloudflare Pages deployment id, not a git SHA)."
    pages_id="$(normalize_pages_id "$pages_id")"
    [[ -n "$deployed_at" ]] || die "bootstrap requires --deployed-at (ISO time of that Pages deployment)."
    [[ -f "$from/index.html" ]] || die "--from has no index.html"
    require_functions "$from"
    scan_tree_secrets "$from"
    assert_homepage "$from/index.html"
    if [[ -d "$BASE" ]]; then
      chmod -R u+w "$BASE" || true
      mkdir -p "$REL/baseline-previous"
      mv "$BASE" "$REL/baseline-previous/$(date -u +%Y%m%dT%H%M%SZ)"
    fi
    mkdir -p "$BASE/tree"
    cp -a "$from"/. "$BASE/tree/"
    # Drop paths that must never ship. Do not modify --from itself.
    rm -rf "$BASE/tree/.git" "$BASE/tree/src" "$BASE/tree/secrets" \
      "$BASE/tree/.du-releases" "$BASE/tree/node_modules" "$BASE/tree/.wrangler" "$BASE/tree/.dev.vars"
    scan_tree_secrets "$BASE/tree"
    assert_homepage "$BASE/tree/index.html"
    require_functions "$BASE/tree"
    d="$(digest_of "$BASE/tree")"
    fd="$(functions_digest_of "$BASE/tree")"
    hash_tree "$BASE/tree" > "$BASE/PUBLIC.sha256"
    cp "$BASE/PUBLIC.sha256" "$BASE/OUTPUT.sha256"
    {
      echo "adopted_pages_id $pages_id"
      echo "pages_id $pages_id"
      echo "deployed_at $deployed_at"
      echo "digest $d"
      echo "output_manifest $(file_sha "$BASE/OUTPUT.sha256")"
      echo "functions_digest $fd"
      echo "functions_included 1"
      echo "functions_compiled_bundle preserved 0"
      echo "functions_provenance unverified-source"
      echo "validated 0"
      echo "note $note"
      echo "bootstrapped_at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
      echo "source_root_not_blessed 1"
    } > "$BASE/BASELINE.txt"
    seal "$BASE"
    echo "baseline $d pages_id=$pages_id functions_digest=$fd validated=0 functions_compiled_bundle=preserved-0"
    ;;
  stage)
    guard_tree
    [[ -d "$BASE/tree" ]] || die "no baseline. Bootstrap a known-good public snapshot first. Do not stage the dirty tree."
    allow=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --allowlist) allow="$2"; shift 2 ;;
        *) die "unknown stage arg: $1" ;;
      esac
    done
    [[ -n "$allow" && -f "$allow" ]] || die "stage requires --allowlist FILE (reviewed paths, one per line)."
    if ! grep -v '^[[:space:]]*#' "$allow" | grep -v '^[[:space:]]*$' | grep -q .; then
      die "allowlist is empty. Name the reviewed files. Refusing to republish an unlabeled tree."
    fi
    work="$(mktemp -d)"
    trap 'chmod -R u+w "$work" 2>/dev/null || true; rm -rf "$work"' EXIT
    : > "$work/strips.txt"
    : > "$work/allow-public.txt"
    if [[ "$(stage_base)" == "$REL/candidate/tree" && -f "$REL/candidate/ALLOW-PUBLIC.txt" ]]; then
      cp "$REL/candidate/ALLOW-PUBLIC.txt" "$work/allow-public.txt"
    fi
    write_source_manifest "$allow" "$work/source-before.sha256"
    mkdir -p "$work/tree"
    cp -a "$(stage_base)"/. "$work/tree/"
    chmod -R u+w "$work/tree"
    while IFS= read -r line || [[ -n "${line:-}" ]]; do
      line="$(clean_allow_line "$line")"
      [[ -z "$line" ]] && continue
      if [[ "$line" == -* ]]; then
        assert_strip_path "${line#-}"
        echo "${line#-}" >> "$work/strips.txt"
        continue
      fi
      if [[ "$line" == +* ]]; then
        echo "${line#+}" >> "$work/allow-public.txt"
        continue
      fi
      if forbidden_path "$line"; then
        die "allowlist path not permitted: $line"
      fi
      [[ -f "$ROOT/$line" ]] || die "allowlist file missing in worktree: $line"
      mkdir -p "$work/tree/$(dirname "$line")"
      cp -a "$ROOT/$line" "$work/tree/$line"
    done < "$allow"
    if [[ -n "${DU_RELEASE_TEST_HOOK:-}" ]]; then
      [[ -x "${DU_RELEASE_TEST_HOOK}" ]] || die "DU_RELEASE_TEST_HOOK is not an executable file."
      "${DU_RELEASE_TEST_HOOK}" || die "DU_RELEASE_TEST_HOOK failed."
    fi
    write_source_manifest "$allow" "$work/source-after.sha256"
    cmp -s "$work/source-before.sha256" "$work/source-after.sha256" || die "source changed during stage. No release sealed."
    scan_tree_secrets "$work/tree"
    assert_homepage "$work/tree/index.html"
    assert_store_unchanged "$work/tree"
    require_functions "$work/tree"
    if [[ "$(stage_base)" == "$REL/candidate/tree" ]] && grep -q '^functions/' "$allow"; then
      pin_worker "$work/tree/functions" "$work/tree/pinned-worker.js"
    fi
    prepare_upload "$work/tree" "$work/upload" "$work/strips.txt" "$work/allow-public.txt" "${REL}/candidate/CORPUS.tsv"
    d="$(digest_of "$work/tree")"
    fd="$(functions_digest_of "$work/tree")"
    dest="$REL/staged/$d"
    if [[ -d "$dest" ]]; then
      chmod -R u+w "$dest" || true
      rm -rf "$dest"
    fi
    mkdir -p "$dest/tree"
    cp -a "$work/tree"/. "$dest/tree/"
    cp "$work/source-after.sha256" "$dest/SOURCE.sha256"
    hash_tree "$dest/tree" > "$dest/PUBLIC.sha256"
    cp "$dest/PUBLIC.sha256" "$dest/OUTPUT.sha256"
    hash_tree "$dest/tree/functions" > "$dest/FUNCTIONS.sha256"
    cp "$work/strips.txt" "$dest/STRIPS.txt"
    cp "$work/allow-public.txt" "$dest/ALLOW-PUBLIC.txt"
    if [[ -f "$REL/candidate/CORPUS.tsv" && "$(stage_base)" == "$REL/candidate/tree" ]]; then
      cp "$REL/candidate/CORPUS.tsv" "$dest/CORPUS.tsv"
    fi
    cp "$work/upload/DEVIATION.txt" "$dest/DEVIATION.txt"
    if [[ "$(stage_base)" == "$REL/candidate/tree" ]]; then
      echo "kind commissioned" > "$dest/KIND"
    else
      echo "kind historical" > "$dest/KIND"
    fi
    {
      echo "digest $d"
      echo "baseline $(awk '/^digest /{print $2}' "$BASE/BASELINE.txt")"
      echo "staged_at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
      echo "allowlist $(file_sha "$allow")"
      echo "source_manifest $(file_sha "$dest/SOURCE.sha256")"
      echo "output_manifest $(file_sha "$dest/OUTPUT.sha256")"
      echo "functions_digest $fd"
      echo "strips $(file_sha "$dest/STRIPS.txt")"
      echo "deviation $(file_sha "$dest/DEVIATION.txt")"
      echo "kind $(awk '{print $2}' "$dest/KIND")"
    } > "$dest/RELEASE.txt"
    if [[ "$(stage_base)" == "$REL/candidate/tree" ]]; then
      chmod -R u+w "$REL/candidate" 2>/dev/null || true
      rm -rf "$REL/candidate"
      mkdir -p "$REL/candidate"
      cp -a "$dest/tree" "$REL/candidate/tree"
      cp "$dest/STRIPS.txt" "$dest/ALLOW-PUBLIC.txt" "$dest/KIND" "$REL/candidate/"
      [[ -f "$dest/CORPUS.tsv" ]] && cp "$dest/CORPUS.tsv" "$REL/candidate/CORPUS.tsv"
    fi
    echo "$d" > "$dest/DIGEST"
    seal "$dest"
    trap - EXIT
    chmod -R u+w "$work" 2>/dev/null || true
    rm -rf "$work"
    echo "staged $d functions_digest=$fd"
    ;;
  attest)
    guard_tree
    digest=""; reviewer=""; s390=""; s412=""; s1280=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --digest) digest="$2"; shift 2 ;;
        --reviewer) reviewer="$2"; shift 2 ;;
        --shot-390) s390="$2"; shift 2 ;;
        --shot-412) s412="$2"; shift 2 ;;
        --shot-1280) s1280="$2"; shift 2 ;;
        *) die "unknown attest arg: $1" ;;
      esac
    done
    [[ -n "$digest" && -d "$REL/staged/$digest/tree" ]] || die "unknown staged digest."
    [[ -n "$reviewer" ]] || die "attest requires --reviewer."
    [[ -f "$s390" && -f "$s412" && -f "$s1280" ]] || die "attest requires --shot-390 --shot-412 --shot-1280 (PNG files)."
    read -r w390 h390 < <(png_size "$s390") || die "390 shot is not a PNG"
    read -r w412 h412 < <(png_size "$s412") || die "412 shot is not a PNG"
    read -r w1280 h1280 < <(png_size "$s1280") || die "1280 shot is not a PNG"
    [[ "$w390" == "390" && "$h390" -ge 700 ]] || die "390 shot IHDR is ${w390}x${h390}, want width 390 and height >= 700"
    [[ "$w412" == "412" && "$h412" -ge 700 ]] || die "412 shot IHDR is ${w412}x${h412}, want width 412 and height >= 700"
    [[ "$w1280" == "1280" && "$h1280" -ge 700 ]] || die "1280 shot IHDR is ${w1280}x${h1280}, want width 1280 and height >= 700"
    now="$(digest_of "$REL/staged/$digest/tree")"
    [[ "$now" == "$digest" ]] || die "staged tree no longer matches $digest (now $now). Attestation refused."
    att="$REL/staged/$digest/ATTESTATION.txt"
    chmod -R u+w "$REL/staged/$digest"
    {
      echo "digest $digest"
      echo "reviewer $reviewer"
      echo "attested_at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
      echo "shot 390 $(file_sha "$s390") $w390 $h390"
      echo "shot 412 $(file_sha "$s412") $w412 $h412"
      echo "shot 1280 $(file_sha "$s1280") $w1280 $h1280"
      echo "output_manifest $(file_sha "$REL/staged/$digest/OUTPUT.sha256")"
      echo "source_manifest $(file_sha "$REL/staged/$digest/SOURCE.sha256")"
      echo "strips $(file_sha "$REL/staged/$digest/STRIPS.txt")"
      echo "deviation $(file_sha "$REL/staged/$digest/DEVIATION.txt")"
      kind="$(awk '{print $2}' "$REL/staged/$digest/KIND")"
      worker_sha=""
      publishable=0
      if [[ "$kind" == "commissioned" ]]; then
        [[ -f "$REL/staged/$digest/RUNTIME.txt" ]] || die "run release.sh execute --digest $digest before attest. The worker has to be run, not only syntax-checked."
        [[ -f "$REL/staged/$digest/tree/pinned-worker.js" ]] || die "commissioned candidate has no pinned worker."
        worker_sha="$(file_sha "$REL/staged/$digest/tree/pinned-worker.js")"
        grep -q "^worker_sha $worker_sha$" "$REL/staged/$digest/RUNTIME.txt" || die "runtime record does not match the pinned worker. Execute again."
        grep -q '^kv_writes 0$' "$REL/staged/$digest/RUNTIME.txt" || die "runtime performed a KV write. Refusing to attest."
        class_name="$(awk '/^class /{print $2}' "$REL/staged/$digest/RELEASE.txt")"
        if [[ "$class_name" == "diagnostic" ]]; then
          publishable=0
        else
          publishable=1
        fi
        echo "class ${class_name:-production}"
      fi
      echo "kind $kind"
      echo "worker_sha $worker_sha"
      echo "publishable $publishable"
    } > "$att"
    cp -a "$s390" "$REL/staged/$digest/shot-390.png"
    cp -a "$s412" "$REL/staged/$digest/shot-412.png"
    cp -a "$s1280" "$REL/staged/$digest/shot-1280.png"
    seal "$REL/staged/$digest"
    echo "attested $digest"
    ;;
  digest)
    dir=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --dir) dir="$2"; shift 2 ;;
        *) die "unknown digest arg: $1" ;;
      esac
    done
    [[ -n "$dir" && -d "$dir" ]] || die "digest requires --dir."
    digest_of "$dir"
    ;;
  commission)
    guard_tree
    [[ -d "$BASE/tree" ]] || die "bootstrap the historical candidate first. Commission does not turn that record into a validated release."
    grep -q '^validated 0$' "$BASE/BASELINE.txt" || die "refusing to edit historical validation state."
    dist=""; dist_sha=""; funcs=""; manifest=""
    strips="$(mktemp)"
    allow="$(mktemp)"
    : > "$strips"
    : > "$allow"
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --dist) dist="$2"; shift 2 ;;
        --dist-sha256) dist_sha="$2"; shift 2 ;;
        --functions) funcs="$2"; shift 2 ;;
        --strip) assert_strip_path "$2"; echo "$2" >> "$strips"; shift 2 ;;
        --allow-public) echo "$2" >> "$allow"; shift 2 ;;
        --manifest) manifest="$2"; shift 2 ;;
        *) die "unknown commission arg: $1" ;;
      esac
    done
    [[ -n "$dist" && -d "$dist" ]] || die "commission requires --dist, the hash-proven public directory."
    [[ -n "$dist_sha" ]] || die "commission requires --dist-sha256. Recompute it with release.sh digest --dir. Do not invent the 36d85669 bundle hash."
    [[ -n "$funcs" && -d "$funcs" ]] || die "commission requires --functions, the preserved pre-publish Functions source."
    [[ ! -d "$dist/functions" ]] || die "--dist must be the public files only. Pass Functions with --functions."
    got="$(digest_of "$dist")"
    [[ "$got" == "$dist_sha" ]] || die "dist sha256 is $got, not $dist_sha."
    work="$(mktemp -d)"
    if [[ -n "$manifest" ]]; then
      python3 - "$dist" "$manifest" "$work/CORPUS.tsv" << 'PY'
import hashlib, os, sys
from pathlib import Path
dist, manifest, out = sys.argv[1:]
rows = {}
for i, line in enumerate(open(manifest, encoding="utf-8")):
    line = line.rstrip("\n")
    if not line or (i == 0 and line.startswith("path\t")):
        continue
    path, size, sha = line.split("\t")
    rows[path] = (int(size), sha)
if len(rows) < 1000:
    sys.stderr.write("REFUSED: public manifest is too small to be the locked corpus\n")
    sys.exit(1)
present = 0
for dp, dns, fns in os.walk(dist):
    for name in fns:
        rel = os.path.relpath(os.path.join(dp, name), dist).replace(os.sep, "/")
        if rel not in rows:
            sys.stderr.write("REFUSED: %s is not in the sealed public manifest\n" % rel)
            sys.exit(1)
        data = Path(os.path.join(dp, name)).read_bytes()
        if len(data) != rows[rel][0] or hashlib.sha256(data).hexdigest() != rows[rel][1]:
            sys.stderr.write("REFUSED: %s does not match the manifest size or sha256\n" % rel)
            sys.exit(1)
        present += 1
Path(out).write_text(open(manifest, encoding="utf-8").read())
tools = sum(1 for p in rows if p.startswith("tools/"))
owner = sum(1 for p in rows if p.startswith("owner/"))
sys.stdout.write("manifest_paths %s tools %s owner %s present %s\n" % (len(rows), tools, owner, present))
PY
    fi
    mkdir -p "$work/tree"
    cp -a "$dist"/. "$work/tree/"
    rm -rf "$work/tree/functions"
    mkdir -p "$work/tree/functions"
    cp -a "$funcs"/. "$work/tree/functions/"
    scan_tree_secrets "$work/tree"
    assert_homepage "$work/tree/index.html"
    assert_store_unchanged "$work/tree"
    require_functions "$work/tree"
    oauth_line="$(flag_oauth_literals "$work/tree/functions")"
    printf '%s\n' "$oauth_line"
    if [[ "$oauth_line" == *redacted-placeholders* ]]; then
      candidate_class=diagnostic
    else
      candidate_class=production
    fi
    pin_worker "$work/tree/functions" "$work/tree/pinned-worker.js"
    node --check "$work/tree/pinned-worker.js" || die "pinned worker failed node --check."
    prepare_upload "$work/tree" "$work/upload" "$strips" "$allow" "${manifest:+$work/CORPUS.tsv}"
    d="$(digest_of "$work/tree")"
    dest="$REL/staged/$d"
    if [[ -d "$dest" ]]; then
      chmod -R u+w "$dest" || true
      rm -rf "$dest"
    fi
    mkdir -p "$dest/tree"
    cp -a "$work/tree"/. "$dest/tree/"
    cp "$strips" "$dest/STRIPS.txt"
    cp "$allow" "$dest/ALLOW-PUBLIC.txt"
    if [[ -f "$work/CORPUS.tsv" ]]; then
      cp "$work/CORPUS.tsv" "$dest/CORPUS.tsv"
    fi
    cp "$work/upload/DEVIATION.txt" "$dest/DEVIATION.txt"
    hash_tree "$dest/tree" > "$dest/OUTPUT.sha256"
    hash_tree "$dest/tree/functions" > "$dest/FUNCTIONS.sha256"
    : > "$dest/SOURCE.sha256"
    echo "kind commissioned" > "$dest/KIND"
    {
      echo "digest $d"
      echo "kind commissioned"
      echo "historical_provenance unknown"
      echo "historical_validated 0"
      echo "dist_sha256 $dist_sha"
      echo "bindings_sha $BINDINGS_SHA"
      echo "wrangler $WRANGLER_PIN"
      echo "class ${candidate_class}"
      echo "worker_sha $(file_sha "$dest/tree/pinned-worker.js")"
      echo "functions_digest $(functions_digest_of "$dest/tree")"
      echo "strips $(file_sha "$dest/STRIPS.txt")"
      echo "deviation $(file_sha "$dest/DEVIATION.txt")"
      echo "commissioned_at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    } > "$dest/RELEASE.txt"
    echo "$d" > "$dest/DIGEST"
    chmod -R u+w "$REL/candidate" 2>/dev/null || true
    rm -rf "$REL/candidate"
    mkdir -p "$REL/candidate"
    cp -a "$dest/tree" "$REL/candidate/tree"
    cp "$dest/STRIPS.txt" "$dest/ALLOW-PUBLIC.txt" "$dest/KIND" "$REL/candidate/"
    if [[ -f "$dest/CORPUS.tsv" ]]; then
      cp "$dest/CORPUS.tsv" "$REL/candidate/CORPUS.tsv"
    fi
    seal "$dest"
    # known-good publish copies the corpus too
    :
    rm -rf "$work" "$strips" "$allow"
    echo "candidate $d worker_sha=$(file_sha "$dest/tree/pinned-worker.js") historical_provenance=unknown"
    ;;
  execute)
    guard_tree
    digest=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --digest) digest="$2"; shift 2 ;;
        *) die "unknown execute arg: $1" ;;
      esac
    done
    [[ -n "$digest" && -f "$REL/staged/$digest/KIND" ]] || die "execute requires a commissioned digest."
    grep -q '^kind commissioned$' "$REL/staged/$digest/KIND" || die "refusing to execute a historical baseline. Commission a new candidate."
    [[ -f "$REL/staged/$digest/tree/pinned-worker.js" ]] || die "pinned worker missing."
    require_sealed_tree "$digest"
    node --check "$REL/staged/$digest/tree/pinned-worker.js"
    chmod -R u+w "$REL/staged/$digest"
    upload="$(mktemp -d)"
    prepare_upload "$REL/staged/$digest/tree" "$upload" "$REL/staged/$digest/STRIPS.txt" "$REL/staged/$digest/ALLOW-PUBLIC.txt" "$REL/staged/$digest/CORPUS.tsv"
    [[ -f "$upload/wrangler.toml" ]] || die "pages dev requires wrangler.toml in the upload directory."
    [[ ! -f "$upload/wrangler.release.toml" ]] || die "custom config filename wrangler.release.toml is rejected by Pages."
    port="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"
    log="$(mktemp)"
    (cd "$upload" && run_wrangler pages dev public --port "$port" --ip 127.0.0.1 >"$log" 2>&1) &
    pid=$!
    stop_dev() { kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; }
    ready=0
    for _ in $(seq 1 50); do
      code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "http://127.0.0.1:${port}/" || true)"
      if [[ "$code" != "000" ]]; then ready=1; break; fi
      sleep 0.25
    done
    if [[ "$ready" != 1 ]]; then
      stop_dev
      die "wrangler pages dev did not start."
    fi
    blob_count() { find "$upload/.wrangler/state" -path '*/kv/*/blobs/*' -type f 2>/dev/null | wc -l | tr -d ' '; }
    before="$(blob_count)"
    body="$(mktemp)"
    code_of() { curl -s -o "$body" -D "$body.hdr" -w '%{http_code}' --max-time 8 "$@"; }
    home="$(code_of "http://127.0.0.1:${port}/")"
    [[ "$home" == "200" ]] || { stop_dev; die "runtime / returned $home, required 200"; }
    if ! grep -q 'motw-home' "$body" || ! grep -q 'id="featured"' "$body" || grep -q 'hc-shop' "$body"; then
      stop_dev
      die "runtime / did not serve the approved homepage markers."
    fi
    listings="$(code_of "http://127.0.0.1:${port}/api/community/listings")"
    if [[ -f "$REL/staged/$digest/tree/functions/api/community/listings.js" && "$listings" != "200" ]]; then
      stop_dev
      die "runtime /api/community/listings returned $listings, required 200."
    fi
    owner_loop="$(code_of "http://127.0.0.1:${port}/owner/")"
    owner_host="$(code_of -H 'Host: digitalundergroundstore.com' -H 'X-Forwarded-Proto: https' "http://127.0.0.1:${port}/owner/")"
    if [[ -f "$REL/staged/$digest/tree/functions/_middleware.js" ]] && grep -q 'isOwnerShell' "$REL/staged/$digest/tree/functions/_middleware.js"; then
      [[ "$owner_host" == "401" ]] || { stop_dev; die "production-host /owner/ returned $owner_host, required 401. Loopback status ${owner_loop} is not the auth proof."; }
    fi
    assets="$(mktemp)"
    asset_line() {
      local name="$1" urlpath="$2" file="$3" got
      if [[ -f "$file" ]]; then
        got="$(code_of "http://127.0.0.1:${port}${urlpath}")"
        [[ "$got" == "200" ]] || { stop_dev; die "runtime ${urlpath} returned ${got}, required 200."; }
        printf 'asset %s 200\n' "$name"
      else
        printf 'asset %s absent\n' "$name"
      fi
    }
    asset_line store /store/ "$upload/public/store/index.html" > "$assets"
    asset_line league /league/ "$upload/public/league/index.html" >> "$assets"
    asset_line sitemap /sitemap.xml "$upload/public/sitemap.xml" >> "$assets"
    asset_line tool /tools/mead-batch-calculator/ "$upload/public/tools/mead-batch-calculator/index.html" >> "$assets"
    after="$(blob_count)"
    stop_dev
    if grep -q 'Uploading\|Deployment complete' "$log"; then
      die "pages dev attempted a deployment."
    fi
    [[ "$after" == "$before" ]] || die "runtime added KV blobs (${before} -> ${after})."
    {
      echo "worker_sha $(file_sha "$REL/staged/$digest/tree/pinned-worker.js")"
      echo "kv_writes 0"
      echo "kv_blobs_added 0"
      echo "runtime pages-dev"
      echo "route / ${home}"
      echo "home_motw 1"
      echo "home_featured 1"
      echo "home_hc_shop 0"
      echo "route /api/community/listings ${listings}"
      echo "owner_loopback ${owner_loop}"
      echo "owner_production_host ${owner_host}"
      cat "$assets"
    } > "$REL/staged/$digest/RUNTIME.txt"
    rm -f "$body" "$body.hdr" "$assets" "$log"
    rm -rf "$upload"
    seal "$REL/staged/$digest"
    echo "executed $digest"
    echo "runtime $(grep -E '^(route |owner_production_host |asset )' "$REL/staged/$digest/RUNTIME.txt" | tr '\n' ' ')"
    ;;
  layout)
    guard_tree
    digest=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --digest) digest="$2"; shift 2 ;;
        *) die "unknown layout arg: $1" ;;
      esac
    done
    [[ -n "$digest" && -d "$REL/staged/$digest/tree" ]] || die "layout requires --digest of a staged release."
    require_sealed_tree "$digest"
    upload="$(mktemp -d)"
    prepare_upload "$REL/staged/$digest/tree" "$upload" "$REL/staged/$digest/STRIPS.txt" "$REL/staged/$digest/ALLOW-PUBLIC.txt" "$REL/staged/$digest/CORPUS.tsv"
    echo "layout_root $upload"
    echo "functions_dir $upload/functions"
    echo "asset_dir $upload/public"
    echo "wrangler_cwd $upload"
    echo "wrangler_argv pages deploy public --no-bundle --project-name digital-underground --branch main --commit-dirty=true"
    ;;
  deploy|rollback)
    guard_tree
    if [[ -f "$ROOT/.du-deploy-blocked" ]]; then
      die ".du-deploy-blocked is present. Deploy and rollback are locked. The unlock is to remove that file yourself. There is no bypass flag."
    fi
    digest=""
    src_manifest=""
    if [[ "$cmd" == "rollback" ]]; then
      guard_publish
      [[ -f "$KNOWN/DIGEST" ]] || die "not validated. No published candidate to roll back."
      digest="$(cat "$KNOWN/DIGEST")"
      [[ -d "$KNOWN/tree" ]] || die "known-good tree missing."
      [[ -f "$KNOWN/OUTPUT.sha256" ]] || die "known-good output manifest missing."
      verify_output_manifest "$KNOWN/tree" "$KNOWN/OUTPUT.sha256" "$digest"
      fd_meta="$(read_meta_field functions_digest)" || die "known-good has no functions_digest."
      fd_now="$(functions_digest_of "$KNOWN/tree")"
      [[ "$fd_now" == "$fd_meta" ]] || die "known-good functions digest drifted ($fd_now != $fd_meta)."
      tree="$KNOWN/tree"
      if [[ -f "$KNOWN/SOURCE.sha256" ]]; then
        src_manifest="$KNOWN/SOURCE.sha256"
      fi
    else
      while [[ $# -gt 0 ]]; do
        case "$1" in
          --digest) digest="$2"; shift 2 ;;
          *) die "unknown deploy arg: $1" ;;
        esac
      done
      [[ -n "$digest" && -d "$REL/staged/$digest/tree" ]] || die "deploy requires --digest of a staged release."
      if [[ -f "$REL/staged/$digest/RELEASE.txt" ]] && grep -q '^class diagnostic$' "$REL/staged/$digest/RELEASE.txt"; then
        die "diagnostic candidate cannot be published. Redacted placeholders are not a working login."
      fi
      if [[ -f "$REL/staged/$digest/tree/pinned-worker.js" ]] && grep -q 'REDACTED_' "$REL/staged/$digest/tree/pinned-worker.js"; then
        die "diagnostic candidate cannot be published. Redacted placeholders are not a working login."
      fi
      [[ -f "$REL/staged/$digest/ATTESTATION.txt" ]] || die "no attestation for $digest. Screenshots at 390/412/1280 are required."
      grep -q "^digest $digest$" "$REL/staged/$digest/ATTESTATION.txt" || die "attestation is for a different digest."
      verify_output_manifest "$REL/staged/$digest/tree" "$REL/staged/$digest/OUTPUT.sha256" "$digest"
      verify_source_manifest "$REL/staged/$digest/SOURCE.sha256"
      om_now="$(file_sha "$REL/staged/$digest/OUTPUT.sha256")"
      sm_now="$(file_sha "$REL/staged/$digest/SOURCE.sha256")"
      grep -q "^output_manifest $om_now$" "$REL/staged/$digest/ATTESTATION.txt" || die "attestation output manifest is stale."
      grep -q "^source_manifest $sm_now$" "$REL/staged/$digest/ATTESTATION.txt" || die "attestation source manifest is stale."
      python3 - "$REL/staged/$digest" << 'PY'
import hashlib, sys
from pathlib import Path
d = Path(sys.argv[1])
text = (d/"ATTESTATION.txt").read_text()
want = {}
for line in text.splitlines():
    parts = line.split()
    if parts and parts[0] == "shot":
        want[parts[1]] = parts[2]
for label, name in (("390","shot-390.png"),("412","shot-412.png"),("1280","shot-1280.png")):
    h = hashlib.sha256((d/name).read_bytes()).hexdigest()
    if want.get(label) != h:
        sys.exit("REFUSED: %s screenshot no longer matches attestation" % label)
print("shots-ok")
PY
      fd_meta="$(awk '/^functions_digest /{print $2}' "$REL/staged/$digest/RELEASE.txt")"
      fd_now="$(functions_digest_of "$REL/staged/$digest/tree")"
      [[ -n "$fd_meta" && "$fd_now" == "$fd_meta" ]] || die "functions digest drifted ($fd_now != $fd_meta)."
      assert_homepage "$REL/staged/$digest/tree/index.html"
      assert_store_unchanged "$REL/staged/$digest/tree"
      tree="$REL/staged/$digest/tree"
      src_manifest="$REL/staged/$digest/SOURCE.sha256"
    fi
    require_functions "$tree"
    scan_tree_secrets "$tree"
    guard_publish
    if [[ "$cmd" == "deploy" ]]; then
      grep -q "^strips $(file_sha "$REL/staged/$digest/STRIPS.txt")$" "$REL/staged/$digest/ATTESTATION.txt" || die "strip list changed after attestation."
      grep -q "^deviation $(file_sha "$REL/staged/$digest/DEVIATION.txt")$" "$REL/staged/$digest/ATTESTATION.txt" || die "public deviation changed after attestation."
      [[ -f "$tree/pinned-worker.js" ]] || die "no pinned worker to ship."
      if grep -q '^class diagnostic$' "$REL/staged/$digest/RELEASE.txt" || grep -q 'REDACTED_' "$tree/pinned-worker.js"; then
        die "diagnostic candidate cannot be published. Redacted placeholders are not a working login."
      fi
      grep -q '^publishable 1$' "$REL/staged/$digest/ATTESTATION.txt" || die "candidate is not validated for publish. A diagnostic or historical candidate cannot be a production release."
      grep -q "^worker_sha $(file_sha "$tree/pinned-worker.js")$" "$REL/staged/$digest/ATTESTATION.txt" || die "pinned worker changed after attestation. Refusing to publish different bytes."
      grep -q '^class production$' "$REL/staged/$digest/RELEASE.txt" || die "diagnostic candidate cannot be published. Redacted placeholders are not a working login."
    fi
    fd_now="$(functions_digest_of "$tree")"
    snap="$(mktemp -d)"
    cp -a "$tree"/. "$snap/"
    chmod -R u+w "$snap"
    saved_source=""
    if [[ -n "$src_manifest" && -f "$src_manifest" ]]; then
      saved_source="$(mktemp)"
      cp "$src_manifest" "$saved_source"
    fi
    saved_output="$(mktemp)"
    if [[ "$cmd" == "rollback" ]]; then
      cp "$KNOWN/OUTPUT.sha256" "$saved_output"
    else
      cp "$REL/staged/$digest/OUTPUT.sha256" "$saved_output"
    fi
    upload="$(mktemp -d)"
    saved_strips="$(mktemp)"
    saved_allow="$(mktemp)"
    saved_corpus="$(mktemp)"
    if [[ "$cmd" == "rollback" ]]; then
      cp "$KNOWN/STRIPS.txt" "$saved_strips"
      cp "$KNOWN/ALLOW-PUBLIC.txt" "$saved_allow"
      [[ -f "$KNOWN/CORPUS.tsv" ]] && cp "$KNOWN/CORPUS.tsv" "$saved_corpus"
    else
      cp "$REL/staged/$digest/STRIPS.txt" "$saved_strips"
      cp "$REL/staged/$digest/ALLOW-PUBLIC.txt" "$saved_allow"
      [[ -f "$REL/staged/$digest/CORPUS.tsv" ]] && cp "$REL/staged/$digest/CORPUS.tsv" "$saved_corpus"
    fi
    prepare_upload "$snap" "$upload" "$saved_strips" "$saved_allow" "$saved_corpus"
    log="$REL/deploy-log.txt"
    mkdir -p "$REL/receipts"
    # One call boundary for a real publish and for a mock.
    # DU_PAGES_DEPLOY_CMD replaces the npx binary only. The arguments stay.
    # --no-bundle ships public/_worker.js unchanged. This cwd has no functions/.
    if [[ -n "${DU_PAGES_DEPLOY_CMD:-}" ]]; then
      wrangler_cmd="$DU_PAGES_DEPLOY_CMD"
    else
      wrangler_cmd="npx"
    fi
    # Pages 3.114.17 rejects --config / -c. The file must be named wrangler.toml.
    out="$(cd "$upload" && "$wrangler_cmd" -y "wrangler@${WRANGLER_PIN}" pages deploy public --no-bundle --project-name digital-underground --branch main --commit-dirty=true 2>&1)" || { echo "$out" >&2; die "deploy command failed"; }
    echo "$out"
    pages_id="$(printf '%s\n' "$out" | python3 -c 'import re,sys; t=sys.stdin.read(); m=re.search(r"https://([0-9a-f]{8,})\.digital-underground\.pages\.dev", t); print(m.group(1) if m else "")')"
    [[ -n "$pages_id" ]] || die "wrangler finished without a Pages deployment id. Not recording success."
    pages_id="$(normalize_pages_id "$pages_id")"
    when="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    om="$(file_sha "$saved_output")"
    if [[ -n "$saved_source" ]]; then
      sm="$(file_sha "$saved_source")"
    else
      sm="none"
    fi
    [[ "$om" == "$digest" ]] || die "refusing to record a receipt whose output manifest is not the digest."
    {
      echo "pages_id $pages_id"
      echo "digest $digest"
      echo "output_manifest $om"
      echo "source_manifest $sm"
      echo "functions_digest $fd_now"
      echo "worker_sha $(file_sha "$upload/public/_worker.js")"
      echo "deployed_at $when"
      echo "via $cmd"
    } > "$REL/receipts/$pages_id.txt"
    echo "$when $cmd digest=$digest pages_id=$pages_id output_manifest=$om source_manifest=$sm functions_digest=$fd_now" >> "$log"
    if [[ -d "$KNOWN" ]]; then
      chmod -R u+w "$KNOWN" || true
      rm -rf "$KNOWN"
    fi
    mkdir -p "$KNOWN/tree"
    cp -a "$snap"/. "$KNOWN/tree/"
    echo "$digest" > "$KNOWN/DIGEST"
    cp "$saved_output" "$KNOWN/OUTPUT.sha256"
    cp "$saved_output" "$KNOWN/PUBLIC.sha256"
    if [[ -n "$saved_source" ]]; then
      cp "$saved_source" "$KNOWN/SOURCE.sha256"
    fi
    cp "$saved_strips" "$KNOWN/STRIPS.txt"
    cp "$saved_allow" "$KNOWN/ALLOW-PUBLIC.txt"
    [[ -s "$saved_corpus" ]] && cp "$saved_corpus" "$KNOWN/CORPUS.tsv"
    cp "$REL/receipts/$pages_id.txt" "$KNOWN/RECEIPT.txt"
    {
      echo "digest $digest"
      echo "pages_id $pages_id"
      echo "deployed_at $when"
      echo "via $cmd"
      echo "output_manifest $om"
      echo "source_manifest $sm"
      echo "functions_digest $fd_now"
    } > "$KNOWN/DEPLOYED.txt"
    seal "$KNOWN"
    chmod -R u+w "$upload" "$snap" 2>/dev/null || true
    rm -rf "$upload" "$snap" "$upload.strips"
    rm -f "$saved_output" "$saved_strips" "$saved_allow" "$saved_corpus"
    [[ -n "$saved_source" ]] && rm -f "$saved_source"
    echo "published pages_id=$pages_id digest=$digest output_manifest=$om source_manifest=$sm functions_digest=$fd_now"
    ;;
  *)
    echo "usage: release.sh bootstrap|digest|commission|stage|execute|layout|attest|deploy|rollback" >&2
    exit 2
    ;;
esac
