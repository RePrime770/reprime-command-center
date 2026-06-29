#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────
# Set missing/broken Vercel env vars for reprime-command-center
#
# USAGE:
#   VERCEL_TOKEN=<pat> \
#   GROQ_API_KEY=<key> \
#   QUO_WEBHOOK_SECRETS=<secret> \
#   [INFORUPTCY_PASSWORD=<pw>] \
#   [GOOGLE_REFRESH_TOKEN_2=<token>] \
#   bash scripts/set-vercel-env.sh
#
# Get a Vercel PAT at: https://vercel.com/account/tokens
# ──────────────────────────────────────────────────────────────────

set -euo pipefail

TEAM_ID="team_EANIErXuwD7vUILkLn39Pvn0"
PROJECT_ID="prj_yqLfG6hbxQj4zyDJC4mkmwNCl2B9"
TARGETS='["production","preview","development"]'

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "❌  Set VERCEL_TOKEN first. Get one at https://vercel.com/account/tokens"
  exit 1
fi

add_env() {
  local KEY="$1" VALUE="$2"
  echo -n "  Setting $KEY … "
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}&upsert=true" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"${KEY}\",\"value\":\"${VALUE}\",\"target\":${TARGETS},\"type\":\"encrypted\"}")
  [[ "$HTTP" == "200" || "$HTTP" == "201" ]] && echo "✅" || echo "❌  HTTP $HTTP"
}

echo "🔑  Syncing env vars to Vercel…"

[[ -n "${GROQ_API_KEY:-}" ]]              && add_env "GROQ_API_KEY"           "$GROQ_API_KEY"
[[ -n "${QUO_WEBHOOK_SECRETS:-}" ]]       && add_env "QUO_WEBHOOK_SECRETS"    "$QUO_WEBHOOK_SECRETS"
[[ -n "${INFORUPTCY_PASSWORD:-}" ]]       && add_env "INFORUPTCY_PASSWORD"    "$INFORUPTCY_PASSWORD"
[[ -n "${GOOGLE_REFRESH_TOKEN_2:-}" ]]    && add_env "GOOGLE_REFRESH_TOKEN_2" "$GOOGLE_REFRESH_TOKEN_2"

echo ""
echo "Redeploy at: https://vercel.com/g-8390s-projects/reprime-command-center"
