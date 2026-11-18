#!/usr/bin/env bash
# Turns on Cloudflare's flood protection for pulseform.org (box.pulseform.org included). Run it once; it's safe to re-run.
#
#   CF_SHIELD_TOKEN=... bash tools/cloudflare-shield.sh            # rate-limit rule + Bot Fight Mode
#   CF_SHIELD_TOKEN=... bash tools/cloudflare-shield.sh --attack   # also turn on Under Attack Mode (visitors get a short check)
#   CF_SHIELD_TOKEN=... bash tools/cloudflare-shield.sh --calm     # turn Under Attack Mode back off
#
# The token needs, for the pulseform.org zone: Zone WAF: Edit, Zone Settings: Edit, Bot Management: Edit (or Zone: Edit).
# Create it at dash.cloudflare.com > My Profile > API Tokens. Requests Cloudflare blocks here never reach the Worker,
# so they don't count toward the Workers daily request limit.
#
# Note: the rate-limit rule REPLACES the zone's rate-limiting rules (the free plan allows exactly one).
set -euo pipefail
ZONE_NAME="${ZONE_NAME:-pulseform.org}"
TOKEN="${CF_SHIELD_TOKEN:?set CF_SHIELD_TOKEN to a Cloudflare API token (see the top of this script)}"
API=https://api.cloudflare.com/client/v4
cf() { curl -sS -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' "$@"; }
ok() { python3 -c 'import sys,json; d=json.load(sys.stdin); print("  ok" if d.get("success") else "  FAILED: " + "; ".join(e.get("message","") for e in d.get("errors",[])))'; }

ZONE=$(cf "$API/zones?name=$ZONE_NAME" | python3 -c 'import sys,json; r=json.load(sys.stdin).get("result") or []; print(r[0]["id"] if r else "")')
[ -n "$ZONE" ] || { echo "Zone $ZONE_NAME not found for this token."; exit 1; }
echo "Zone $ZONE_NAME"

echo "1. Rate limit: one IP sending more than 100 requests in 10 seconds is blocked (free-plan sized rule)"
cf -X PUT "$API/zones/$ZONE/rulesets/phases/http_ratelimit/entrypoint" --data '{
  "rules": [{
    "description": "Flood guard: >100 requests / 10 s from one IP",
    "expression": "(http.host eq \"box.pulseform.org\") or (http.host eq \"pulseform.org\") or (http.host eq \"www.pulseform.org\")",
    "action": "block",
    "ratelimit": { "characteristics": ["ip.src", "cf.colo.id"], "period": 10, "requests_per_period": 100, "mitigation_timeout": 10 }
  }]
}' | ok

echo "2. Bot Fight Mode (challenges known bad bots before they reach the site)"
cf -X PUT "$API/zones/$ZONE/bot_management" --data '{"fight_mode": true}' | ok

case "${1:-}" in
  --attack) echo "3. Under Attack Mode ON (turn off later with --calm)"; cf -X PATCH "$API/zones/$ZONE/settings/security_level" --data '{"value":"under_attack"}' | ok ;;
  --calm)   echo "3. Under Attack Mode OFF"; cf -X PATCH "$API/zones/$ZONE/settings/security_level" --data '{"value":"medium"}' | ok ;;
esac
echo "Done. Watch it work at dash.cloudflare.com > $ZONE_NAME > Security > Events."
