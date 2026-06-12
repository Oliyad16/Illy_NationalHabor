#!/usr/bin/env bash
# Push the Toast credentials from .env.local into Vercel PRODUCTION.
#
# Values are read from .env.local and piped straight into `vercel env add`,
# so secrets never appear in your shell history or any transcript.
# Whitespace is trimmed (the Toast client secret has been pasted with a
# trailing space before, which breaks auth).
#
# Run from the project root:   bash scripts/push-toast-env.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "ERROR: .env.local not found in $(pwd)" >&2
  exit 1
fi

# Only these are needed for the revenue dashboard + ordering.
VARS=(
  TOAST_API_HOST
  TOAST_CLIENT_ID
  TOAST_CLIENT_SECRET
  TOAST_RESTAURANT_GUID
  TOAST_DINING_OPTION_GUID
)

# Read a KEY=value line from .env.local, strip surrounding quotes + whitespace.
read_env() {
  local key="$1"
  grep -E "^${key}=" .env.local | head -1 | cut -d= -f2- \
    | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//; s/^"//; s/"$//; s/^'\''//; s/'\''$//'
}

for key in "${VARS[@]}"; do
  val="$(read_env "$key" || true)"
  if [ -z "${val:-}" ]; then
    echo "⚠️  $key is empty in .env.local — skipping"
    continue
  fi
  # Remove first if it already exists (ignore failure), then add fresh.
  npx vercel env rm "$key" production --yes >/dev/null 2>&1 || true
  printf '%s' "$val" | npx vercel env add "$key" production >/dev/null
  echo "✅ set $key (production)"
done

echo
echo "Done. Now redeploy so the new variables take effect:"
echo "    npx vercel --prod"
