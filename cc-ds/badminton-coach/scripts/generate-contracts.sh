#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
(cd apps/api && uv run python -m app.contracts.export)
npx json2ts \
  -i contracts/analysis-result.schema.json \
  -o apps/web/src/lib/generated/analysis-result.ts
