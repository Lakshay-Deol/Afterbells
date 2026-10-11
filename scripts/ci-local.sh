#!/usr/bin/env bash
# ci-local.sh — run every check CI runs, locally, in order.
# Usage: ./scripts/ci-local.sh [--skip-contracts] [--contracts-preflight] [--stage NAME]
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

usage() {
  cat <<'EOF'
Usage: ./scripts/ci-local.sh [--skip-contracts] [--contracts-preflight] [--stage NAME]

Run the same non-destructive checks as CI. With no --stage, all stages run.

Stages: install, web, api, demo, e2e, contracts, keeper, docs
Options:
  --skip-contracts  Skip Foundry checks during a full run
  --contracts-preflight  Check Foundry and forge-std, then exit without compiling
  --stage NAME      Run one named stage (repeatable)
  --help            Show this help
EOF
}

skip_contracts=false
contracts_preflight=false
declare -a requested_stages=()
while (($#)); do
  case "$1" in
    --skip-contracts) skip_contracts=true ;;
    --contracts-preflight) contracts_preflight=true ;;
    --stage)
      [[ $# -ge 2 ]] || { printf 'error: --stage requires a value\n' >&2; exit 2; }
      requested_stages+=("$2")
      shift
      ;;
    --help|-h) usage; exit 0 ;;
    *) printf 'error: unknown argument: %s\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

check_contract_prerequisites() {
  command -v forge >/dev/null || {
    printf 'error: forge is required; install Foundry using the official installer\n' >&2
    return 127
  }
  [[ -f packages/contracts/lib/forge-std/src/Test.sol ]] || {
    printf 'error: forge-std is not initialized; run git submodule update --init --recursive\n' >&2
    return 1
  }
  printf 'ok: forge %s\n' "$(forge --version | head -n 1)"
  printf 'ok: forge-std submodule initialized\n'
}

if [[ "$contracts_preflight" == true ]]; then
  check_contract_prerequisites
  exit 0
fi

task_uv_cache="${TMPDIR:-/tmp}/afterbells-uv-cache"
mkdir -p "$task_uv_cache"
export UV_CACHE_DIR="${UV_CACHE_DIR:-$task_uv_cache}"

wants() {
  local candidate="$1"
  ((${#requested_stages[@]} == 0)) && return 0
  local selected
  for selected in "${requested_stages[@]}"; do
    [[ "$selected" == "$candidate" ]] && return 0
  done
  return 1
}

valid_stage() {
  case "$1" in install|web|api|demo|e2e|contracts|keeper|docs) return 0 ;; *) return 1 ;; esac
}

for selected in "${requested_stages[@]}"; do
  valid_stage "$selected" || { printf 'error: unknown stage: %s\n' "$selected" >&2; exit 2; }
done

if wants install; then
  step "pnpm install (frozen)"
  pnpm install --frozen-lockfile
fi

if wants web; then
  step "web: typecheck"
  pnpm --filter @afterbells/web typecheck

  step "web: lint (eslint)"
  pnpm --filter @afterbells/web lint
  pnpm --filter @afterbells/web format:check

  step "web: tests (vitest)"
  pnpm --filter @afterbells/web test
fi

if wants api; then
  step "api: ruff"
  (cd services/api && uv run ruff check .)
  (cd services/api && uv run ruff format --check .)

  step "api: mypy"
  (cd services/api && uv run mypy -p afterbells)

  step "api: pytest"
  (cd services/api && uv run pytest -q)
fi

if wants demo; then
  step "judge demo and MCP (MCP round trip is included in pytest)"
  pnpm demo
fi

if wants e2e; then
  step "production build and browser E2E"
  pnpm --filter @afterbells/web exec playwright install chromium
  pnpm test:e2e
fi

if wants contracts && [[ "$skip_contracts" != true ]]; then
  step "contracts: forge test"
  check_contract_prerequisites
  (cd packages/contracts && forge test)
fi

if wants keeper; then
  step "keeper: standalone install, build and delivery tests"
  (cd services/keeper/agent && pnpm install --frozen-lockfile && pnpm test)
fi

if wants docs; then
  step "documentation links"
  python3 scripts/check-doc-links.py
fi

step "ALL CHECKS PASSED"
