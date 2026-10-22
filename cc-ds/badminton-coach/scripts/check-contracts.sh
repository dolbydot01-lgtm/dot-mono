#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

(cd apps/api && uv run python -m app.contracts.export --out "$tmpdir" >/dev/null)
npx json2ts \
  -i "$tmpdir/analysis-result.schema.json" \
  -o "$tmpdir/analysis-result.ts" >/dev/null

status=0
for pair in \
  "contracts/analysis-result.schema.json:$tmpdir/analysis-result.schema.json" \
  "contracts/report-draft.schema.json:$tmpdir/report-draft.schema.json" \
  "apps/web/src/lib/generated/analysis-result.ts:$tmpdir/analysis-result.ts"; do
  expected="${pair%%:*}"
  actual="${pair##*:}"
  if ! diff -u "$expected" "$actual"; then
    status=1
  fi
done

if [ "$status" -ne 0 ]; then
  echo "Contract drift detected. Run npm run contracts to regenerate." >&2
  exit 1
fi

echo "Contracts are up to date."
