#!/bin/zsh
# Regenerates the low-res texture tier consumed by the progressive loader
# in src/textures.ts: every map in public/textures gets a 1/8-width copy
# under public/textures/low/ with the same filename (SOL-42).
#
# Run after adding or replacing a texture: ./scripts/make-low-tier.sh
set -euo pipefail
cd "$(dirname "$0")/../public/textures"
mkdir -p low
for f in *.jpg *.png; do
  width=$(sips -g pixelWidth "$f" | awk '/pixelWidth/ {print $2}')
  sips --resampleWidth $((width / 8)) -s formatOptions 60 "$f" --out "low/$f" >/dev/null
  printf '%s → low/%s (%s)\n' "$f" "$f" "$(du -h "low/$f" | cut -f1)"
done
