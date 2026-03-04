#!/bin/bash
# ============================================================
# Full Pipeline Test: Photos → Store → Pipeline → Design
#
# Prerequisites:
#   1. API server running:  cd packages/api && pnpm dev
#   2. Supabase running:    supabase start (or cloud)
#   3. AI keys in .env.local (OPENAI_API_KEY or ANTHROPIC_API_KEY)
#
# Usage:
#   ./scripts/test-full-pipeline.sh [vertical]
#
# Examples:
#   ./scripts/test-full-pipeline.sh fashion
#   ./scripts/test-full-pipeline.sh jewellery
#   ./scripts/test-full-pipeline.sh beauty
# ============================================================

set -e

API_URL="${API_URL:-http://localhost:3001}"
VERTICAL="${1:-fashion}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Full Pipeline Test — $VERTICAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Sample product images per vertical (Unsplash)
case "$VERTICAL" in
  jewellery)
    NAME="Priya Jewels"
    HINTS="Traditional Indian gold jewellery for weddings and festivals"
    AUDIENCE="brides-to-be, women 25-45"
    VIBE="luxury-traditional"
    IMAGES='[
      "https://picsum.photos/seed/jewel1/800/1000",
      "https://picsum.photos/seed/jewel2/800/1000",
      "https://picsum.photos/seed/jewel3/800/1000"
    ]'
    ;;
  beauty)
    NAME="Glow Botanics"
    HINTS="Ayurvedic skincare and beauty products, natural ingredients"
    AUDIENCE="women 20-35, skincare enthusiasts"
    VIBE="clean-natural"
    IMAGES='[
      "https://picsum.photos/seed/beauty1/800/1000",
      "https://picsum.photos/seed/beauty2/800/1000",
      "https://picsum.photos/seed/beauty3/800/1000"
    ]'
    ;;
  home_decor)
    NAME="Kashi Crafts"
    HINTS="Handcrafted home decor from Varanasi artisans"
    AUDIENCE="homeowners, interior design lovers"
    VIBE="artisanal-warm"
    IMAGES='[
      "https://picsum.photos/seed/decor1/800/1000",
      "https://picsum.photos/seed/decor2/800/1000",
      "https://picsum.photos/seed/decor3/800/1000"
    ]'
    ;;
  *)
    # Default: fashion
    NAME="Sitara Fashion"
    HINTS="Designer sarees and ethnic wear for modern Indian women"
    AUDIENCE="women 22-40, working professionals"
    VIBE="modern-ethnic"
    IMAGES='[
      "https://picsum.photos/seed/saree1/800/1000",
      "https://picsum.photos/seed/saree2/800/1000",
      "https://picsum.photos/seed/saree3/800/1000"
    ]'
    ;;
esac

echo ""
echo "Store: $NAME ($VERTICAL)"
echo "Images: $(echo "$IMAGES" | grep -c 'http') photos"
echo ""

# Check if API is reachable
if ! curl -sf "$API_URL/health" > /dev/null 2>&1; then
  echo "ERROR: API not reachable at $API_URL"
  echo "Start it with: cd packages/api && pnpm dev"
  exit 1
fi

echo "[1/1] Running full pipeline (this may take 30-60s)..."
echo ""

RESPONSE=$(curl -sf "$API_URL/trpc/store.devFullPipeline" \
  -H "Content-Type: application/json" \
  -d "$(cat <<EOF
{
  "json": {
    "name": "$NAME",
    "vertical": "$VERTICAL",
    "description": "$HINTS",
    "productImages": $IMAGES,
    "sellerContext": {
      "audience": "$AUDIENCE",
      "brandVibe": "$VIBE"
    },
    "sellerHints": "$HINTS",
    "pipelineMode": "draft"
  }
}
EOF
)")

if [ $? -ne 0 ] || [ -z "$RESPONSE" ]; then
  echo "ERROR: Pipeline call failed"
  exit 1
fi

# Parse response — tRPC v11 wraps in result.data.json
PARSE="import sys,json; d=json.load(sys.stdin)['result']['data']; r=d.get('json',d)"
STORE_ID=$(echo "$RESPONSE" | python3 -c "$PARSE; print(r['store']['id'])" 2>/dev/null || echo "?")
SLUG=$(echo "$RESPONSE" | python3 -c "$PARSE; print(r['store']['slug'])" 2>/dev/null || echo "?")
TAGLINE=$(echo "$RESPONSE" | python3 -c "$PARSE; print(r['design']['heroTagline'])" 2>/dev/null || echo "?")
SUBTEXT=$(echo "$RESPONSE" | python3 -c "$PARSE; print(r['design']['heroSubtext'])" 2>/dev/null || echo "?")
BIO=$(echo "$RESPONSE" | python3 -c "$PARSE; print(r['design']['storeBio'])" 2>/dev/null || echo "?")
ARCHETYPE=$(echo "$RESPONSE" | python3 -c "$PARSE; print(r['design'].get('archetypeId','?'))" 2>/dev/null || echo "?")
TOTAL_MS=$(echo "$RESPONSE" | python3 -c "$PARSE; print(r['timing']['totalMs'])" 2>/dev/null || echo "?")
DESIGN_MS=$(echo "$RESPONSE" | python3 -c "$PARSE; print(r['timing']['designMs'])" 2>/dev/null || echo "?")
USABLE=$(echo "$RESPONSE" | python3 -c "$PARSE; print(r['pipeline']['usablePhotos'])" 2>/dev/null || echo "?")
SCORE=$(echo "$RESPONSE" | python3 -c "$PARSE; print(r['pipeline']['overallScore'])" 2>/dev/null || echo "?")
MSG=$(echo "$RESPONSE" | python3 -c "$PARSE; print(r['pipeline']['message'])" 2>/dev/null || echo "?")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  RESULT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Store ID:   $STORE_ID"
echo "Slug:       $SLUG"
echo "Archetype:  $ARCHETYPE"
echo ""
echo "Hero:       $TAGLINE"
echo "Subtext:    $SUBTEXT"
echo "Bio:        $BIO"
echo ""
echo "Pipeline:   $USABLE usable photos, score $SCORE/10"
echo "Message:    $MSG"
echo ""
echo "Timing:     ${TOTAL_MS}ms total (design: ${DESIGN_MS}ms)"
echo ""
echo "Storefront: http://localhost:3000/$SLUG"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Save full response for debugging
echo "$RESPONSE" | python3 -m json.tool > /tmp/tatparya-pipeline-result.json 2>/dev/null || true
echo "Full response saved to: /tmp/tatparya-pipeline-result.json"
