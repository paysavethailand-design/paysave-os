#!/usr/bin/env bash
set -euo pipefail

SERVICE="paysave_stage5_5_1_hostinger_api_token"
ACCOUNT="paysave-production"
API_URL="https://developers.hostinger.com/api/hosting/v1/orders?per_page=1"

printf 'Rotated Hostinger API token (input hidden): '
IFS= read -r -s TOKEN
printf '\n'

if [[ -z "$TOKEN" ]]; then
  echo 'Token is empty; nothing was stored.' >&2
  exit 1
fi

HTTP_STATUS="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
  --proto '=https' --tlsv1.2 --max-time 30 \
  --header "Authorization: Bearer ${TOKEN}" \
  --header 'Accept: application/json' \
  "$API_URL")"

if [[ "$HTTP_STATUS" != "200" ]]; then
  unset TOKEN
  echo "Hostinger read-only token validation failed with HTTP ${HTTP_STATUS}; nothing was stored." >&2
  exit 1
fi

security add-generic-password -U -a "$ACCOUNT" -s "$SERVICE" -w "$TOKEN" >/dev/null
unset TOKEN

echo "Validated and stored Hostinger API token in macOS Keychain service: ${SERVICE}"
