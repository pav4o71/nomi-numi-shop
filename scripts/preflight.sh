#!/usr/bin/env bash

set -Eeuo pipefail

# ==========================================================
# nomi-numi-shop
# Environment / ownership preflight
# ==========================================================

MODE="${1:-phase0}"

EXPECTED_ROOT="/home/pav4o71/Projects/nomi-numi-shop"

EXPECTED_NODE="v24.19.0"
EXPECTED_PNPM="11.26.0"

EXPECTED_NVMRC="24.19.0"
EXPECTED_NODE_VERSION_FILE="24.19.0"

PROTECTED_DB_CONTAINER="beautybook3-pg"
PROTECTED_DB_PORT="5433"

RESERVED_PORTS=(
  3100
  3101
  55432
  55433
  11025
  18025
)

REQUIRED_RULES=(
  ".cursor/rules/00-project-boundary.mdc"
  ".cursor/rules/10-git-workflow.mdc"
  ".cursor/rules/20-docker-safety.mdc"
  ".cursor/rules/30-database-safety.mdc"
  ".cursor/rules/40-security-secrets.mdc"
  ".cursor/rules/50-testing-quality.mdc"
)

FAILURES=0

pass() {
  printf 'PASS: %s\n' "$1"
}

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  FAILURES=$((FAILURES + 1))
}

info() {
  printf 'INFO: %s\n' "$1"
}

section() {
  printf '\n=== %s ===\n' "$1"
}

require_command() {
  local command_name="$1"

  if command -v "$command_name" >/dev/null 2>&1; then
    pass "command available: $command_name"
  else
    fail "required command missing: $command_name"
  fi
}

check_exact_file_value() {
  local target_file="$1"
  local expected_value="$2"

  if [[ ! -f "$target_file" ]]; then
    fail "required file missing: $target_file"
    return
  fi

  local actual_value
  actual_value="$(tr -d '\r\n' < "$target_file")"

  if [[ "$actual_value" == "$expected_value" ]]; then
    pass "$target_file = $expected_value"
  else
    fail "$target_file expected '$expected_value' but found '$actual_value'"
  fi
}

check_phase0_port_free() {
  local reserved_port="$1"

  if ss -ltn 2>/dev/null | grep -Eq ":${reserved_port}[[:space:]]"; then
    fail "phase0 reserved port is already in use: $reserved_port"
  else
    pass "phase0 reserved port is free: $reserved_port"
  fi
}

printf '==================================================\n'
printf ' NOMI-NUMI-SHOP PREFLIGHT\n'
printf ' Mode: %s\n' "$MODE"
printf '==================================================\n'

case "$MODE" in
  phase0|baseline-local)
    ;;
  *)
    printf '\nUnsupported preflight mode: %s\n' "$MODE" >&2
    printf 'Currently supported modes: phase0, baseline-local\n' >&2
    exit 2
    ;;
esac

section "COMMANDS"

for required_command in \
  bash \
  git \
  node \
  npm \
  corepack \
  pnpm \
  docker \
  ss \
  grep \
  find
do
  require_command "$required_command"
done

if ! command -v git >/dev/null 2>&1; then
  printf '\nPreflight cannot continue without Git.\n' >&2
  exit 1
fi

section "PROJECT IDENTITY"

ACTUAL_GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"

if [[ "$ACTUAL_GIT_ROOT" == "$EXPECTED_ROOT" ]]; then
  pass "Git root matches canonical webshop root"
else
  fail "Git root mismatch: expected '$EXPECTED_ROOT', found '${ACTUAL_GIT_ROOT:-NONE}'"
fi

ACTUAL_PWD="$(pwd -P)"

if [[ "$ACTUAL_PWD" == "$EXPECTED_ROOT" ]]; then
  pass "current working directory is canonical project root"
else
  fail "run preflight from '$EXPECTED_ROOT'; current directory is '$ACTUAL_PWD'"
fi

# Identity failures are terminal. Continuing from the wrong repository or
# working directory would make all relative checks misleading and could
# allow later commands to operate on the wrong project.
if [[ "$ACTUAL_GIT_ROOT" != "$EXPECTED_ROOT" || "$ACTUAL_PWD" != "$EXPECTED_ROOT" ]]; then
  printf '\nPREFLIGHT FAILED\n' >&2
  printf 'Repository identity check failed.\n' >&2
  printf 'Run this command only from:\n%s\n' "$EXPECTED_ROOT" >&2
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current 2>/dev/null || true)"

if [[ "$CURRENT_BRANCH" == "main" ]]; then
  pass "branch is main for mode: $MODE"
else
  fail "expected branch main, found '${CURRENT_BRANCH:-DETACHED/UNKNOWN}'"
fi

section "GIT STATE"

REMOTE_OUTPUT="$(git remote 2>/dev/null || true)"

case "$MODE" in
  phase0)
    if git rev-parse --verify HEAD >/dev/null 2>&1; then
      fail "phase0 bootstrap expected no commits"
    else
      pass "repository still has no commits"
    fi

    if [[ -z "$REMOTE_OUTPUT" ]]; then
      pass "repository still has no Git remotes"
    else
      fail "phase0 bootstrap expected no remotes; found: $REMOTE_OUTPUT"
    fi
    ;;

  baseline-local)
    if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
      fail "baseline-local requires the foundation commit"
    else
      COMMIT_COUNT="$(git rev-list --count HEAD)"

      if [[ "$COMMIT_COUNT" == "1" ]]; then
        pass "repository contains exactly one baseline commit"
      else
        fail "baseline-local expected exactly 1 commit, found: $COMMIT_COUNT"
      fi

      BASELINE_SUBJECT="$(git log -1 --pretty=%s)"

      if [[ "$BASELINE_SUBJECT" == "chore: establish phase 0 foundation" ]]; then
        pass "baseline commit subject matches"
      else
        fail "unexpected baseline commit subject: '$BASELINE_SUBJECT'"
      fi
    fi

    if [[ -z "$REMOTE_OUTPUT" ]]; then
      pass "baseline-local still has no Git remotes"
    else
      fail "baseline-local expected no remotes; found: $REMOTE_OUTPUT"
    fi

    WORKTREE_STATE="$(git status --porcelain)"

    if [[ -z "$WORKTREE_STATE" ]]; then
      pass "baseline-local working tree is clean"
    else
      fail "baseline-local working tree is not clean"
    fi

    TRACKED_COUNT="$(git ls-files | wc -l | tr -d '[:space:]')"

    if [[ "$TRACKED_COUNT" == "24" ]]; then
      pass "baseline tracks exactly 24 foundation files"
    else
      fail "baseline expected 24 tracked files, found: $TRACKED_COUNT"
    fi
    ;;
esac

section "RUNTIME"

ACTUAL_NODE="$(node --version 2>/dev/null || true)"

if [[ "$ACTUAL_NODE" == "$EXPECTED_NODE" ]]; then
  pass "Node version = $EXPECTED_NODE"
else
  fail "Node expected '$EXPECTED_NODE', found '${ACTUAL_NODE:-MISSING}'"
fi

ACTUAL_PNPM="$(pnpm --version 2>/dev/null || true)"

if [[ "$ACTUAL_PNPM" == "$EXPECTED_PNPM" ]]; then
  pass "pnpm version = $EXPECTED_PNPM"
else
  fail "pnpm expected '$EXPECTED_PNPM', found '${ACTUAL_PNPM:-MISSING}'"
fi

check_exact_file_value ".nvmrc" "$EXPECTED_NVMRC"
check_exact_file_value ".node-version" "$EXPECTED_NODE_VERSION_FILE"

section "DOCKER TOOLING"

if docker info >/dev/null 2>&1; then
  pass "Docker daemon is reachable"
else
  fail "Docker daemon is not reachable"
fi

if docker compose version >/dev/null 2>&1; then
  pass "Docker Compose v2 command works"
else
  fail "docker compose command is unavailable"
fi

section "PROTECTED EXTERNAL RESOURCE"

if docker inspect "$PROTECTED_DB_CONTAINER" >/dev/null 2>&1; then
  pass "protected container exists: $PROTECTED_DB_CONTAINER"

  PROTECTED_PORT_MAPPING="$(
    docker port "$PROTECTED_DB_CONTAINER" 5432/tcp 2>/dev/null || true
  )"

  if printf '%s\n' "$PROTECTED_PORT_MAPPING" | grep -Fq ":${PROTECTED_DB_PORT}"; then
    pass "protected container still maps PostgreSQL through host port $PROTECTED_DB_PORT"
  else
    info "protected container exists but its current port mapping differs from the recorded baseline"
  fi
else
  info "protected container '$PROTECTED_DB_CONTAINER' is currently absent; it remains protected if it reappears"
fi

section "PHASE 0 RESERVED PORTS"

for reserved_port in "${RESERVED_PORTS[@]}"; do
  check_phase0_port_free "$reserved_port"
done

section "SAFETY DOCUMENTS"

for required_file in \
  ".gitignore" \
  ".cursorignore" \
  "AGENTS.md" \
  "docs/PROTECTED_RESOURCES.md" \
  ".cursor/BUGBOT.md"
do
  if [[ -f "$required_file" ]]; then
    pass "required safety file exists: $required_file"
  else
    fail "required safety file missing: $required_file"
  fi
done

for required_rule in "${REQUIRED_RULES[@]}"; do
  if [[ -f "$required_rule" ]]; then
    pass "Cursor rule exists: $required_rule"
  else
    fail "Cursor rule missing: $required_rule"
  fi
done

section "CRITICAL RULE CONTENT"

if grep -Fq "Unknown resources are protected resources." AGENTS.md; then
  pass "AGENTS.md contains unknown-resource protection"
else
  fail "AGENTS.md missing unknown-resource protection"
fi

if grep -Fq "beautybook3-pg" docs/PROTECTED_RESOURCES.md; then
  pass "protected-resource registry contains beautybook3-pg"
else
  fail "protected-resource registry missing beautybook3-pg"
fi

if grep -Fq 'alwaysApply: true' .cursor/rules/00-project-boundary.mdc; then
  pass "mandatory Cursor boundary is always-on"
else
  fail "mandatory Cursor boundary is not always-on"
fi

section "IGNORE SAFETY"

for ignored_candidate in \
  ".env.local" \
  "data/private/preflight-test.txt" \
  "backups/preflight-test.sql" \
  "node_modules/preflight-test.txt" \
  ".next/preflight-test.txt"
do
  if git check-ignore -q "$ignored_candidate"; then
    pass "Git ignore protects: $ignored_candidate"
  else
    fail "Git ignore does not protect: $ignored_candidate"
  fi
done

if git check-ignore -q ".env.example"; then
  fail ".env.example must remain trackable"
else
  pass ".env.example remains trackable"
fi

section "PHASE 0 APPLICATION STATE"

for forbidden_artifact in \
  "package.json" \
  "pnpm-lock.yaml" \
  "compose.yaml" \
  "docker-compose.yml" \
  "src" \
  "app" \
  "public" \
  "drizzle"
do
  if [[ -e "$forbidden_artifact" ]]; then
    fail "application artifact exists before Phase 1: $forbidden_artifact"
  else
    pass "application artifact absent as expected: $forbidden_artifact"
  fi
done

section "WEBSHOP DOCKER OWNERSHIP"

WEBSHOP_DOCKER_RESOURCES="$(
  docker ps -a \
    --format '{{.Names}}' 2>/dev/null \
    | grep -E '^nomi-numi-shop' \
    || true
)"

if [[ -z "$WEBSHOP_DOCKER_RESOURCES" ]]; then
  pass "no webshop Docker containers exist during Phase 0"
else
  fail "unexpected webshop Docker containers already exist: $WEBSHOP_DOCKER_RESOURCES"
fi

section "FINAL RESULT"

if [[ "$FAILURES" -eq 0 ]]; then
  printf '\nPREFLIGHT PASSED\n'

  case "$MODE" in
    phase0)
      printf 'Phase 0 bootstrap environment is consistent with the locked baseline.\n'
      ;;
    baseline-local)
      printf 'Local committed foundation baseline is consistent and clean.\n'
      ;;
  esac

  exit 0
fi

printf '\nPREFLIGHT FAILED\n' >&2
printf '%s check(s) failed.\n' "$FAILURES" >&2
printf 'Do not continue implementation until the failures are understood.\n' >&2

exit 1
