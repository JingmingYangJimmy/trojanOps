#!/usr/bin/env bash
# pnpm check: typecheck, lint, test, then the invariant greps (I2, I5, I9) and the design greps
# (.claude/agents/ui-designer.md "Not this").
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
step() { echo "› $*"; }
violation() { echo "✗ $1"; echo "$2" | sed 's/^/    /'; fail=1; }

step typecheck && pnpm -s typecheck || fail=1
step lint && pnpm -s lint || fail=1
step test && pnpm -s test || fail=1

step "invariant and design greps"
g() { grep -rnE "$@" 2>/dev/null || true; }

# I2: the owner URL never reaches app code.
hits=$(g 'DATABASE_OWNER_URL' src)
[ -n "$hits" ] && violation "I2: DATABASE_OWNER_URL is for scripts/ and drizzle.config.ts only" "$hits"

# I5: vendor model SDKs only under src/lib/connectors/llm/.
hits=$(g "from ['\"](@anthropic-ai|openai|@google/genai|@google/generative-ai|@mistralai|cohere-ai|ollama|voyageai)" src db scripts | grep -vE '^(src/lib/connectors/llm/|scripts/check\.sh:)' || true)
[ -n "$hits" ] && violation "I5: vendor SDKs may be imported only under src/lib/connectors/llm/" "$hits"

# I9: time comes from clock.now().
hits=$(g 'new Date\(\)|Date\.now\(' src db/seed scripts | grep -vE '^(src/lib/clock\.ts|scripts/check\.sh):' || true)
[ -n "$hits" ] && violation "I9: use now() from src/lib/clock.ts instead of new Date() or Date.now()" "$hits"

# Design: banned patterns.
hits=$(g 'bg-gradient|backdrop-blur|Sparkles|WandSparkles|shadow-(sm|md|lg|xl|2xl)\b' src)
[ -n "$hits" ] && violation "Design: gradients, blur, sparkle icons and default shadows are banned (use shadow-overlay on overlays)" "$hits"

hits=$(g 'rounded-full' src | grep -vE '^src/components/ui/(avatar|switch|radio-group)\.tsx:' || true)
[ -n "$hits" ] && violation "Design: rounded-full only in ui/avatar, ui/switch and ui/radio-group" "$hits"

# Design: colors come from tokens in globals.css.
hits=$(g '#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b' --include='*.ts' --include='*.tsx' --include='*.css' src/components src/app | grep -v '^src/app/globals.css:' || true)
[ -n "$hits" ] && violation "Design: no raw hex outside src/app/globals.css; use a token" "$hits"

if [ "$fail" -ne 0 ]; then echo "pnpm check failed"; exit 1; fi
echo "pnpm check passed"
