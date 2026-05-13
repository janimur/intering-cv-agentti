#!/usr/bin/env bash
set -uo pipefail

BASE="${BASE:-http://localhost}"
PASS=0
FAIL=0

# Värit
GREEN="\033[0;32m"
RED="\033[0;31m"
RESET="\033[0m"

check() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}✓${RESET} $name"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}✗${RESET} $name (odotettu: $expected, saatu: $actual)"
    FAIL=$((FAIL+1))
  fi
}

check_contains() {
  local name="$1"
  local needle="$2"
  local haystack="$3"
  if echo "$haystack" | grep -q "$needle"; then
    echo -e "  ${GREEN}✓${RESET} $name"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}✗${RESET} $name (ei sisältänyt: $needle)"
    FAIL=$((FAIL+1))
  fi
}

echo "→ Tarkistetaan Docker Compose -palvelut..."
COMPOSE_PS=$(docker compose ps 2>/dev/null || echo "")
if echo "$COMPOSE_PS" | grep -q "backend" && echo "$COMPOSE_PS" | grep -q "caddy"; then
  # Tarkista että molemmat ovat "Up"-tilassa
  BACKEND_UP=$(echo "$COMPOSE_PS" | grep "backend" | grep -i "up\|running" | wc -l | tr -d ' ')
  CADDY_UP=$(echo "$COMPOSE_PS" | grep "caddy" | grep -i "up\|running" | wc -l | tr -d ' ')
  if [ "$BACKEND_UP" -gt 0 ] && [ "$CADDY_UP" -gt 0 ]; then
    echo -e "  ${GREEN}✓${RESET} backend ja caddy ajossa"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}✗${RESET} palvelut ei ole Up-tilassa (backend=$BACKEND_UP, caddy=$CADDY_UP)"
    FAIL=$((FAIL+1))
  fi
else
  echo -e "  ${RED}✗${RESET} Docker Compose -palveluja ei löydy (aja: docker compose up -d)"
  FAIL=$((FAIL+1))
fi

echo ""
echo "→ Tarkistetaan HTTP-endpointit..."

# 1. GET / → 200 ja HTML
RESP_ROOT=$(curl -s -o /tmp/smoke_root.txt -w "%{http_code}" "${BASE}/")
BODY_ROOT=$(cat /tmp/smoke_root.txt)
check "GET / → 200" "200" "$RESP_ROOT"
check_contains "GET / sisältää HTML" "<html" "$BODY_ROOT"

# 2. GET /api/gdpr → 200 ja content-kenttä
RESP_GDPR=$(curl -s -o /tmp/smoke_gdpr.txt -w "%{http_code}" "${BASE}/api/gdpr")
BODY_GDPR=$(cat /tmp/smoke_gdpr.txt)
check "GET /api/gdpr → 200" "200" "$RESP_GDPR"
check_contains "GET /api/gdpr sisältää 'content'" '"content"' "$BODY_GDPR"

# 3. GET /api/metrics → 200 ja total_runs-kenttä
RESP_METRICS=$(curl -s -o /tmp/smoke_metrics.txt -w "%{http_code}" "${BASE}/api/metrics")
BODY_METRICS=$(cat /tmp/smoke_metrics.txt)
check "GET /api/metrics → 200" "200" "$RESP_METRICS"
check_contains "GET /api/metrics sisältää 'total_runs'" '"total_runs"' "$BODY_METRICS"

# 4. POST /api/upload ilman tiedostoa → 422
RESP_UPLOAD=$(curl -s -o /tmp/smoke_upload.txt -w "%{http_code}" -X POST "${BASE}/api/upload")
check "POST /api/upload ilman tiedostoa → 422" "422" "$RESP_UPLOAD"

# 5. GET /api/admin/prompts ilman tokenia → 401 tai 503
RESP_ADMIN=$(curl -s -o /tmp/smoke_admin.txt -w "%{http_code}" "${BASE}/api/admin/prompts")
if [ "$RESP_ADMIN" = "401" ] || [ "$RESP_ADMIN" = "503" ]; then
  echo -e "  ${GREEN}✓${RESET} GET /api/admin/prompts ilman tokenia → $RESP_ADMIN"
  PASS=$((PASS+1))
else
  echo -e "  ${RED}✗${RESET} GET /api/admin/prompts ilman tokenia (odotettu: 401 tai 503, saatu: $RESP_ADMIN)"
  FAIL=$((FAIL+1))
fi

# Yhteenveto
echo ""
echo "────────────────────────────"
TOTAL=$((PASS+FAIL))
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}Kaikki tarkistukset OK: $PASS/$TOTAL${RESET}"
  exit 0
else
  echo -e "${RED}Epäonnistuneita tarkistuksia: $FAIL/$TOTAL${RESET}"
  exit 1
fi
