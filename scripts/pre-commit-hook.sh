#!/bin/sh

CURRENT_HASH_FILE="./EXPECTED_HASH"
CURRENT_HASH=$(git rev-parse HEAD)
EXISTING_HASH=$(cat "$CURRENT_HASH_FILE" 2>/dev/null || echo "")

if [ "$CURRENT_HASH" = "$EXISTING_HASH" ]; then
  echo "✅ EXPECTED_HASH is already up to date."
  exit 0
fi

echo "⚙️  Writing current commit hash to CURRENT_HASH..."
echo "$CURRENT_HASH" > "$CURRENT_HASH_FILE"
git add "$CURRENT_HASH_FILE"