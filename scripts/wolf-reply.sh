#!/usr/bin/env bash
# Usage: scripts/wolf-reply.sh <key> "<text>" [new|in-progress|done]
# Appends a reply from Kimberly to a Wolf fix request in COMMUNITY_KV (remote), optionally setting status.
set -euo pipefail
NS=5e086a24647c419f8ac5577b85a0c651
key="${1:?key required}"; text="${2:?text required}"; status="${3:-}"
[[ "$key" == wolf:fix:* ]] || { echo "key must start with wolf:fix:" >&2; exit 1; }
[[ -z "$status" || "$status" =~ ^(new|in-progress|done)$ ]] || { echo "status must be new|in-progress|done" >&2; exit 1; }
cd "$(dirname "$0")/.."
W="npx -y wrangler@3"
cur=$($W kv key get "$key" --namespace-id "$NS" --text 2>/dev/null) || { echo "key not found" >&2; exit 1; }
new=$(KEYJSON="$cur" TEXT="$text" STATUS="$status" node -e '
const o=JSON.parse(process.env.KEYJSON); o.replies=Array.isArray(o.replies)?o.replies:[];
o.replies.push({text:process.env.TEXT,ts:new Date().toISOString(),from:"Kimberly"});
if(process.env.STATUS)o.status=process.env.STATUS; process.stdout.write(JSON.stringify(o));')
$W kv key put "$key" "$new" --namespace-id "$NS" >/dev/null
echo "$new"
