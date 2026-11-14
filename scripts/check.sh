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
hits=$(g 'new Date\(\)|Date\.now\(|performance\.now\(|defaultNow\(' src db/seed scripts | grep -vE '^(src/lib/clock\.ts|scripts/check\.sh):' || true)
[ -n "$hits" ] && violation "I9: use now() from src/lib/clock.ts instead of new Date(), Date.now(), performance.now() or defaultNow()" "$hits"

# I5: only the gateway calls the runtime.
hits=$(g "from ['\"](@/lib/runtime|\.\./runtime|\./runtime)" src | grep -vE '^src/lib/(gateway|runtime)/' || true)
[ -n "$hits" ] && violation "I5: only src/lib/gateway/ may import the runtime; run agents through runAgent()" "$hits"

# I8: audit() in src/lib/gateway/audit.ts is the only writer of audit_events and ai_usage.
hits=$(g '\.insert\((auditEvents|aiUsage)\)' src | grep -vE '^src/lib/gateway/' || true)
[ -n "$hits" ] && violation "I8: write audit_events and ai_usage only from src/lib/gateway/" "$hits"

# Design: banned patterns (shadow-overlay is the only shadow, on overlays).
hits=$( { g '(^|[^-a-z])shadow(["'"'"' `]|-(2xs|xs|sm|md|lg|xl|2xl|inner|\[))' --include='*.tsx' --include='*.css' src;
          g 'drop-shadow|bg-gradient|backdrop-blur|<(Sparkles|WandSparkles|Wand|Wand2|Bot|BotMessageSquare)[ />]' src; } | grep -v '^src/app/globals.css:.*shadow-overlay' || true)
[ -n "$hits" ] && violation "Design: gradients, blur, shadows other than shadow-overlay, and sparkle/wand/bot icons are banned" "$hits"

hits=$(g 'rounded-full' src | grep -vE '^src/components/ui/(avatar|switch|radio-group)\.tsx:' || true)
[ -n "$hits" ] && violation "Design: rounded-full only in ui/avatar, ui/switch and ui/radio-group" "$hits"

# Design: colors come from tokens in globals.css.
palette='slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
hits=$(g "#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|\b(rgba?|hsla?|oklch|oklab)\(|-($palette)-[0-9]{2,3}\b" --include='*.ts' --include='*.tsx' --include='*.css' src | grep -v '^src/app/globals.css:' || true)
[ -n "$hits" ] && violation "Design: no raw colors or Tailwind palette colors outside src/app/globals.css; use a token" "$hits"

if [ "$fail" -ne 0 ]; then echo "pnpm check failed"; exit 1; fi
echo "pnpm check passed"
