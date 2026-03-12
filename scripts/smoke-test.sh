#!/usr/bin/env bash
#
# Smoke test for eigi CLI.
#
# Requires:
#   - The CLI to be built (npm run build)
#   - An API key set (eigi config set-key <KEY>) or EIGI_API_KEY env var
#   - A running backend (set EIGI_BASE_URL if not https://api.eigi.ai)
#
# Usage:
#   npm run test:smoke
#   # or directly:
#   ./scripts/smoke-test.sh
#
# Test with local backend:
#   EIGI_BASE_URL=http://localhost:4000 npm run test:smoke
#

set -uo pipefail

CLI="node dist/main.js"
PASS=0
FAIL=0
ERRORS=""

green() { printf '\033[32m%s\033[0m\n' "$1"; }
red()   { printf '\033[31m%s\033[0m\n' "$1"; }
dim()   { printf '\033[2m%s\033[0m\n' "$1"; }

run_test() {
  local name="$1"
  shift
  printf "  %-45s " "$name"
  if output=$("$@" 2>&1); then
    green "PASS"
    PASS=$((PASS + 1))
  else
    red "FAIL"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  ✗ $name\n    Command: $*\n    Output: $(echo "$output" | head -3)\n"
  fi
}

echo ""
echo "═══════════════════════════════════════════════"
echo "  eigi CLI — Smoke Tests"
echo "═══════════════════════════════════════════════"
echo ""

# ─── Phase 1: CLI basics (no server needed) ───
echo "▸ CLI Basics"
run_test "help"                    $CLI --help
run_test "version"                 $CLI --version
run_test "agents help"             $CLI agents --help
run_test "prompts help"            $CLI prompts --help
run_test "chat help"               $CLI chat --help
run_test "calls help"              $CLI calls --help
run_test "conversations help"      $CLI conversations --help
run_test "providers help"          $CLI providers --help
run_test "voices help"             $CLI voices --help
run_test "config help"             $CLI config --help
run_test "config show"             $CLI config show
echo ""

# ─── Phase 2: API calls (server required) ───
echo "▸ API Commands (requires running server + API key)"
dim "  Skipping if no API key is set..."

API_KEY="${EIGI_API_KEY:-$($CLI config show 2>/dev/null | grep -o 'vk_[^ ]*' || true)}"
if [[ -z "$API_KEY" ]]; then
  dim "  No API key found. Skipping API tests."
  dim "  Set EIGI_API_KEY or run: eigi config set-key <KEY>"
else
  echo ""
  run_test "providers list --json"         $CLI providers list --json
  run_test "agents list --json"            $CLI agents list --json
  run_test "prompts list --json"           $CLI prompts list --json
  run_test "conversations list --json"     $CLI conversations list --json
  run_test "mobile-numbers --json"         $CLI mobile-numbers --json
  run_test "voices list --json"            $CLI voices list --provider CARTESIA --json

  # ─── Phase 3: CRUD lifecycle ───
  echo ""
  echo "▸ CRUD Lifecycle"

  # Create agent
  AGENT_JSON=$($CLI agents create \
    --name "smoke-test-agent" \
    --type INBOUND \
    --stt-provider DEEPGRAM --stt-model nova-2 --stt-language en \
    --llm-provider OPENAI --llm-model gpt-4o \
    --tts-provider CARTESIA --tts-model sonic-2 --tts-language en --tts-voice-id a0e99841-438c-4a64-b679-ae501e7d6091 \
    --prompt-content "You are a smoke test agent." \
    --json 2>&1) || true
  AGENT_ID=$(echo "$AGENT_JSON" | grep -o '"id" *: *"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/' || true)

  if [[ -n "$AGENT_ID" ]]; then
    run_test "agent created"               echo "$AGENT_ID"
    run_test "agents get"                  $CLI agents get "$AGENT_ID" --json
    run_test "agents update"               $CLI agents update "$AGENT_ID" --name "smoke-test-updated" --json
    run_test "chat send"                   $CLI chat send --agent-id "$AGENT_ID" --message "ping" --no-stream --json
    run_test "chat first-message"          $CLI chat first-message "$AGENT_ID" --json
    run_test "chat sessions list"          $CLI chat sessions list --json
    run_test "agents delete"               $CLI agents delete "$AGENT_ID" -y --json
  else
    red "  ✗ Could not create test agent — skipping CRUD tests"
    FAIL=$((FAIL + 1))
  fi

  # Create + delete prompt
  PROMPT_JSON=$($CLI prompts create --name "smoke-test-prompt" --content "Test prompt content" --json 2>&1) || true
  P_NAME=$(echo "$PROMPT_JSON" | grep -o '"prompt_name" *: *"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/' || true)

  if [[ -n "$P_NAME" ]]; then
    run_test "prompt created"              echo "$P_NAME"
    run_test "prompts get"                 $CLI prompts get "$P_NAME" --json
    run_test "prompts versions"            $CLI prompts versions "$P_NAME" --json
    run_test "prompts update"              $CLI prompts update "$P_NAME" --content "Updated content" --json
    run_test "prompts delete"              $CLI prompts delete "$P_NAME" -y --json
  else
    red "  ✗ Could not create test prompt — skipping prompt CRUD tests"
    FAIL=$((FAIL + 1))
  fi
fi

# ─── Summary ───
echo ""
echo "═══════════════════════════════════════════════"
printf "  Results: "
green "$PASS passed"
if [[ $FAIL -gt 0 ]]; then
  printf "           "
  red "$FAIL failed"
  echo ""
  printf "$ERRORS"
fi
echo ""
echo "═══════════════════════════════════════════════"

exit $FAIL
