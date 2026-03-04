#!/bin/bash
# ============================================================
# Test Store Creation with YOUR Photos
#
# Usage:
#   # With local image files:
#   ./scripts/test-with-photos.sh "My Store" fashion photo1.jpg photo2.jpg photo3.jpg
#
#   # With URLs:
#   ./scripts/test-with-photos.sh "My Store" fashion https://example.com/img1.jpg https://example.com/img2.jpg
#
#   # Mix of both:
#   ./scripts/test-with-photos.sh "My Store" jewellery ./ring.jpg https://example.com/necklace.jpg
#
# Verticals: fashion, jewellery, beauty, home_decor, food, electronics, pets
#
# Optional env vars:
#   AUDIENCE="women 25-40"
#   VIBE="modern-luxury"
#   HINTS="Handmade silver jewellery from Jaipur"
# ============================================================

set -e

API_URL="${API_URL:-http://localhost:3001}"

if [ $# -lt 3 ]; then
  echo "Usage: $0 <store-name> <vertical> <image1> [image2] [image3] ..."
  echo ""
  echo "Examples:"
  echo "  $0 'Priya Jewels' jewellery ring.jpg necklace.jpg bracelet.jpg"
  echo "  $0 'Glow Beauty' beauty https://example.com/serum.jpg ./cream.jpg"
  echo ""
  echo "Verticals: fashion, jewellery, beauty, home_decor, food, electronics, pets"
  exit 1
fi

NAME="$1"
VERTICAL="$2"
shift 2

AUDIENCE="${AUDIENCE:-}"
VIBE="${VIBE:-}"
HINTS="${HINTS:-}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Creating Store: $NAME ($VERTICAL)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check API
if ! curl -sf "$API_URL/health" > /dev/null 2>&1; then
  echo "ERROR: API not reachable at $API_URL"
  echo "Start it with: cd packages/api && pnpm dev"
  exit 1
fi

# Build image array — convert local files to base64, keep URLs as-is
IMAGES="["
FIRST=true
for IMG in "$@"; do
  if [ "$FIRST" = true ]; then FIRST=false; else IMAGES="$IMAGES,"; fi

  if [ -f "$IMG" ]; then
    # Local file → base64
    echo "  📷 Encoding: $IMG ($(du -h "$IMG" | cut -f1))"
    MIME=$(file --brief --mime-type "$IMG")
    B64=$(base64 < "$IMG" | tr -d '\n')
    IMAGES="$IMAGES\"data:$MIME;base64,$B64\""
  elif [[ "$IMG" == http* ]]; then
    # URL → pass through
    echo "  🔗 URL: $IMG"
    IMAGES="$IMAGES\"$IMG\""
  else
    echo "  ⚠️  Skipping (not found): $IMG"
    continue
  fi
done
IMAGES="$IMAGES]"

PHOTO_COUNT=$(echo "$IMAGES" | grep -o '"data:\|"http' | wc -l | tr -d ' ')
echo ""
echo "  Total photos: $PHOTO_COUNT"
echo ""

if [ "$PHOTO_COUNT" -eq 0 ]; then
  echo "ERROR: No valid images provided"
  exit 1
fi

# Build seller context
CONTEXT="{}"
if [ -n "$AUDIENCE" ] || [ -n "$VIBE" ]; then
  CONTEXT="{"
  [ -n "$AUDIENCE" ] && CONTEXT="$CONTEXT\"audience\":\"$AUDIENCE\""
  if [ -n "$VIBE" ]; then
    [ -n "$AUDIENCE" ] && CONTEXT="$CONTEXT,"
    CONTEXT="$CONTEXT\"brandVibe\":\"$VIBE\""
  fi
  CONTEXT="$CONTEXT}"
fi

echo "[1/1] Running full pipeline (photos → AI design → store)..."
echo "  This takes 30-90s depending on image count and AI provider."
echo ""

RESPONSE=$(curl -sf "$API_URL/trpc/store.devFullPipeline" \
  -H "Content-Type: application/json" \
  --max-time 180 \
  -d "$(cat <<ENDJSON
{
  "json": {
    "name": "$NAME",
    "vertical": "$VERTICAL",
    "description": "$HINTS",
    "productImages": $IMAGES,
    "sellerContext": $CONTEXT,
    "sellerHints": "$HINTS",
    "pipelineMode": "draft"
  }
}
ENDJSON
)")

if [ $? -ne 0 ] || [ -z "$RESPONSE" ]; then
  echo "ERROR: Pipeline call failed"
  echo "Check API logs: tail -50 /tmp/api.log"
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
SECTIONS=$(echo "$RESPONSE" | python3 -c "$PARSE; secs=r['store']['storeConfig']['sections']['homepage']; print(len(secs))" 2>/dev/null || echo "?")
PALETTE=$(echo "$RESPONSE" | python3 -c "$PARSE; p=r['store']['storeConfig']['design']['palette']; print(f'primary={p[\"primary\"]} bg={p[\"background\"]} text={p[\"text\"]}')" 2>/dev/null || echo "?")
FONTS=$(echo "$RESPONSE" | python3 -c "$PARSE; f=r['store']['storeConfig']['design']['fonts']; print(f'{f[\"display\"]} / {f[\"body\"]}')" 2>/dev/null || echo "?")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  RESULT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Store:      $NAME"
echo "Slug:       $SLUG"
echo "Archetype:  $ARCHETYPE"
echo ""
echo "Hero:       $TAGLINE"
echo "Subtext:    $SUBTEXT"
echo "Bio:        $BIO"
echo ""
echo "Palette:    $PALETTE"
echo "Fonts:      $FONTS"
echo "Sections:   $SECTIONS"
echo ""
echo "Photos:     $USABLE usable out of $PHOTO_COUNT, score $SCORE/10"
echo "Feedback:   $MSG"
echo ""
echo "Timing:     ${TOTAL_MS}ms total (design AI: ${DESIGN_MS}ms)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  View your store:"
echo "  http://localhost:3000/$SLUG"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Save response
echo "$RESPONSE" | python3 -m json.tool > /tmp/tatparya-pipeline-result.json 2>/dev/null || true
echo "Full response: /tmp/tatparya-pipeline-result.json"
