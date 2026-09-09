#!/usr/bin/env bash

set -Eeuo pipefail

# ==========================================================
# nomi-numi-shop
# Environment / ownership preflight
# ==========================================================

MODE="${1:-phase0}"

EXPECTED_ROOT="/home/pav4o71/Projects/nomi-numi-shop"

EXPECTED_REMOTE="git@github.com:pav4o71/nomi-numi-shop.git"

BASELINE_SHA="6b70c53d8be977ee80d24b98415ab794defaf48b"
BASELINE_SUBJECT="chore: establish phase 0 foundation"
BASELINE_TRACKED_COUNT="24"

EXPECTED_NODE="v24.19.0"
EXPECTED_PNPM="11.26.0"

EXPECTED_NVMRC="24.19.0"
EXPECTED_NODE_VERSION_FILE="24.19.0"

EXPECTED_PACKAGE_NAME="nomi-numi-shop"
EXPECTED_PACKAGE_MANAGER="pnpm@11.26.0"

PROTECTED_DB_CONTAINER="beautybook3-pg"
PROTECTED_DB_PORT="5433"

OWNED_COMPOSE_PROJECTS=(
  "nomi-numi-shop-dev"
  "nomi-numi-shop-test"
)

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

is_owned_compose_project() {
  local compose_project="$1"
  local owned_project

  for owned_project in "${OWNED_COMPOSE_PROJECTS[@]}"; do
    if [[ "$compose_project" == "$owned_project" ]]; then
      return 0
    fi
  done

  return 1
}

path_is_inside_expected_root() {
  local candidate_path="$1"

  if [[ "$candidate_path" == "$EXPECTED_ROOT" ]]; then
    return 0
  fi

  if [[ "$candidate_path" == "$EXPECTED_ROOT"/* ]]; then
    return 0
  fi

  return 1
}

collect_listener_pids() {
  local reserved_port="$1"
  local ss_output
  local pid_list=()
  local pid_candidate

  ss_output="$(ss -ltnp 2>/dev/null || true)"

  while IFS= read -r pid_candidate; do
    if [[ -n "$pid_candidate" ]]; then
      pid_list+=("$pid_candidate")
    fi
  done < <(
    printf '%s\n' "$ss_output" \
      | grep -E ":${reserved_port}[[:space:]]" \
      | grep -oE 'pid=[0-9]+' \
      | cut -d= -f2 \
      | sort -u
  )

  if [[ "${#pid_list[@]}" -eq 0 ]]; then
    return 1
  fi

  printf '%s\n' "${pid_list[@]}"
  return 0
}

process_is_project_owned() {
  local process_pid="$1"
  local process_user
  local process_cwd
  local process_command
  local current_user

  current_user="$(id -un 2>/dev/null || true)"

  if [[ -z "$current_user" ]]; then
    return 1
  fi

  if ! process_user="$(ps -o user= -p "$process_pid" 2>/dev/null)"; then
    return 1
  fi

  process_user="$(printf '%s' "$process_user" | tr -d '[:space:]')"

  if [[ -z "$process_user" || "$process_user" != "$current_user" ]]; then
    return 1
  fi

  if [[ ! -r "/proc/${process_pid}/cwd" ]]; then
    return 1
  fi

  if ! process_cwd="$(readlink "/proc/${process_pid}/cwd" 2>/dev/null)"; then
    return 1
  fi

  if ! path_is_inside_expected_root "$process_cwd"; then
    return 1
  fi

  if ! process_command="$(ps -o args= -p "$process_pid" 2>/dev/null)"; then
    return 1
  fi

  if [[ -z "$process_command" ]]; then
    return 1
  fi

  if command_is_project_next_form "$process_command" "$process_pid"; then
    return 0
  fi

  return 1
}

# Token/path-aware Next.js recognition only.
# Accepts node/next CLI tokens and the exact Next.js listener title
# "next-server" / "next-server (v16.3.4)".
# Rejects nextcloud-server, next-server-old-helper, nextsomething, etc.
# Do not use a bare "next" or "next-server" substring match.
command_is_project_next_form() {
  local process_command="$1"
  local process_pid="${2:-}"
  local process_exe=""

  if printf '%s' "$process_command" | grep -Eqi '(^|[/[:space:]])(node|next)([/[:space:]]|$)'; then
    return 0
  fi

  # Exact process title used by Next.js HTTP listeners.
  if ! printf '%s' "$process_command" | grep -Eq '^[[:space:]]*next-server([[:space:]]+\([^)]*\))?[[:space:]]*$'; then
    return 1
  fi

  # Optional stronger evidence: when /proc/<pid>/exe is readable, require
  # a Node executable. Missing/unreadable exe still allows the exact
  # title form after user+cwd checks in process_is_project_owned.
  if [[ -n "$process_pid" && -r "/proc/${process_pid}/exe" ]]; then
    process_exe="$(readlink "/proc/${process_pid}/exe" 2>/dev/null || true)"
    if [[ -n "$process_exe" ]]; then
      if ! printf '%s' "$process_exe" | grep -Eqi '(^|/)node([0-9]+)?$'; then
        return 1
      fi
    fi
  fi

  return 0
}

docker_port_owner_project() {
  local reserved_port="$1"
  local container_id
  local compose_project
  local ports_field
  local matched_projects=()

  while IFS=$'\t' read -r container_id ports_field compose_project; do
    if [[ -z "$container_id" ]]; then
      continue
    fi

    if ! printf '%s' "$ports_field" | grep -Eq "(^|[^0-9])${reserved_port}->|:${reserved_port}->|:[[:digit:].]*:${reserved_port}->|::${reserved_port}->"; then
      if ! printf '%s' "$ports_field" | grep -Eq ":${reserved_port}([[:space:],]|$)"; then
        continue
      fi
    fi

    if [[ -n "$compose_project" ]] && is_owned_compose_project "$compose_project"; then
      matched_projects+=("$compose_project")
    else
      return 1
    fi
  done < <(
    docker ps \
      --format '{{.ID}}\t{{.Ports}}\t{{.Label "com.docker.compose.project"}}' \
      2>/dev/null || true
  )

  if [[ "${#matched_projects[@]}" -eq 0 ]]; then
    return 1
  fi

  printf '%s\n' "${matched_projects[0]}"
  return 0
}

check_phase1_reserved_port() {
  local reserved_port="$1"
  local listener_pids
  local listener_pid
  local owned_process_count=0
  local unproven_process_count=0
  local docker_project
  local ownership_notes=()

  # Classification is port-level, not first-PID-level:
  # A free → PASS
  # B all identifiable PIDs project-owned → PASS
  # C otherwise inspect Docker Compose ownership before failing
  # D neither proven → FAIL closed (no kill/stop/rebind)

  if ! ss -ltn 2>/dev/null | grep -Eq ":${reserved_port}[[:space:]]"; then
    pass "phase1 reserved port is free: $reserved_port"
    return
  fi

  listener_pids="$(collect_listener_pids "$reserved_port" || true)"

  if [[ -n "$listener_pids" ]]; then
    while IFS= read -r listener_pid; do
      if [[ -z "$listener_pid" ]]; then
        continue
      fi

      if process_is_project_owned "$listener_pid"; then
        owned_process_count=$((owned_process_count + 1))
        ownership_notes+=("pid ${listener_pid} under ${EXPECTED_ROOT}")
      else
        # Do not fail yet. Docker may publish this host port through
        # docker-proxy, which is not a project Node/Next process.
        unproven_process_count=$((unproven_process_count + 1))
      fi
    done <<< "$listener_pids"
  fi

  if [[ "$owned_process_count" -gt 0 && "$unproven_process_count" -eq 0 ]]; then
    pass "phase1 reserved port ${reserved_port} is occupied by project-owned process (${ownership_notes[*]})"
    return
  fi

  if docker_project="$(docker_port_owner_project "$reserved_port")"; then
    pass "phase1 reserved port ${reserved_port} is occupied by owned Compose project: ${docker_project}"
    return
  fi

  fail "phase1 reserved port ${reserved_port} is in use with unproven ownership"
}

check_phase1_hooks() {
  local hooks_path
  local hook_file=".githooks/pre-push"

  hooks_path="$(git config --local --get core.hooksPath 2>/dev/null || true)"

  if [[ "$hooks_path" == ".githooks" ]]; then
    pass "core.hooksPath is .githooks"
  else
    fail "core.hooksPath expected '.githooks', found '${hooks_path:-NONE}'"
  fi

  if [[ -f "$hook_file" ]]; then
    pass "hook file exists: $hook_file"
  else
    fail "required hook file missing: $hook_file"
    return
  fi

  if [[ -x "$hook_file" ]]; then
    pass "hook file is executable: $hook_file"
  else
    fail "hook file is not executable: $hook_file"
  fi
}

check_phase1_interrupted_git() {
  if [[ -e .git/MERGE_HEAD ]]; then
    fail "phase1 refused: merge in progress"
  fi

  if [[ -d .git/rebase-merge || -d .git/rebase-apply ]]; then
    fail "phase1 refused: rebase in progress"
  fi

  if [[ -e .git/CHERRY_PICK_HEAD ]]; then
    fail "phase1 refused: cherry-pick in progress"
  fi

  if [[ ! -e .git/MERGE_HEAD && ! -d .git/rebase-merge && ! -d .git/rebase-apply && ! -e .git/CHERRY_PICK_HEAD ]]; then
    pass "no interrupted merge/rebase/cherry-pick detected"
  fi
}

check_phase1_package_json() {
  if [[ ! -f package.json ]]; then
    info "package.json is absent; application foundation has not yet been created"
    pass "phase1 allows absent package.json before application creation"
    return
  fi

  if ! node -e '
const fs = require("fs");
const expectedName = process.argv[1];
const expectedManager = process.argv[2];
let pkg;
try {
  pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
} catch (error) {
  console.error("unreadable or invalid package.json");
  process.exit(2);
}
const failures = [];
if (pkg.name !== expectedName) {
  failures.push("name");
}
if (pkg.private !== true) {
  failures.push("private");
}
if (pkg.packageManager !== expectedManager) {
  failures.push("packageManager");
}
if (failures.length > 0) {
  console.error(failures.join(","));
  process.exit(1);
}
' "$EXPECTED_PACKAGE_NAME" "$EXPECTED_PACKAGE_MANAGER"; then
    fail "package.json exists but failed name/private/packageManager validation"
    return
  fi

  pass "package.json name/private/packageManager match Phase 1 expectations"
}

check_phase1_webshop_docker() {
  local container_name
  local compose_project
  local found_any=0

  while IFS=$'\t' read -r container_name compose_project; do
    if [[ -z "$container_name" ]]; then
      continue
    fi

    if [[ "$container_name" == nomi-numi-shop* ]] || is_owned_compose_project "$compose_project"; then
      found_any=1

      if is_owned_compose_project "$compose_project"; then
        pass "webshop-related container has owned Compose project: ${container_name} (${compose_project})"
      else
        fail "webshop-related container has unproven ownership: ${container_name} (compose project: ${compose_project:-NONE})"
      fi
    fi
  done < <(
    docker ps -a \
      --format '{{.Names}}\t{{.Label "com.docker.compose.project"}}' \
      2>/dev/null || true
  )

  if [[ "$found_any" -eq 0 ]]; then
    pass "no webshop Docker containers currently exist"
  fi
}

printf '==================================================\n'
printf ' NOMI-NUMI-SHOP PREFLIGHT\n'
printf ' Mode: %s\n' "$MODE"
printf '==================================================\n'

case "$MODE" in
  phase0|baseline-local|baseline-remote|phase1)
    ;;
  *)
    printf '\nUnsupported preflight mode: %s\n' "$MODE" >&2
    printf 'Currently supported modes: phase0, baseline-local, baseline-remote, phase1\n' >&2
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

if [[ "$MODE" == "phase1" ]]; then
  for required_command in ps readlink id; do
    require_command "$required_command"
  done
fi

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

case "$MODE" in
  phase0|baseline-local|baseline-remote)
    if [[ "$CURRENT_BRANCH" == "main" ]]; then
      pass "branch is main for mode: $MODE"
    else
      fail "expected branch main, found '${CURRENT_BRANCH:-DETACHED/UNKNOWN}'"
    fi
    ;;
  phase1)
    if [[ -z "$CURRENT_BRANCH" ]]; then
      fail "phase1 does not allow detached HEAD"
    elif [[ "$CURRENT_BRANCH" == "main" ]]; then
      fail "phase1 must not run on main"
    elif [[ "$CURRENT_BRANCH" =~ ^(feature|fix|chore|docs)/.+$ ]]; then
      pass "branch is approved for phase1: $CURRENT_BRANCH"
    else
      fail "phase1 branch must match feature/*, fix/*, chore/*, or docs/*; found '${CURRENT_BRANCH}'"
    fi
    ;;
esac

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

      ACTUAL_BASELINE_SUBJECT="$(git log -1 --pretty=%s)"

      if [[ "$ACTUAL_BASELINE_SUBJECT" == "$BASELINE_SUBJECT" ]]; then
        pass "baseline commit subject matches"
      else
        fail "unexpected baseline commit subject: '$ACTUAL_BASELINE_SUBJECT'"
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

    if [[ "$TRACKED_COUNT" == "$BASELINE_TRACKED_COUNT" ]]; then
      pass "baseline tracks exactly $BASELINE_TRACKED_COUNT foundation files"
    else
      fail "baseline expected $BASELINE_TRACKED_COUNT tracked files, found: $TRACKED_COUNT"
    fi
    ;;

  baseline-remote)
    REMOTE_COUNT="$(git remote | wc -l | tr -d '[:space:]')"

    if [[ "$REMOTE_COUNT" == "1" ]]; then
      pass "exactly one Git remote exists"
    else
      fail "baseline-remote expected exactly 1 Git remote, found: $REMOTE_COUNT"
    fi

    if git remote get-url origin >/dev/null 2>&1; then
      ORIGIN_FETCH_URL="$(git remote get-url origin)"
      ORIGIN_PUSH_URL="$(git remote get-url --push origin)"

      if [[ "$ORIGIN_FETCH_URL" == "$EXPECTED_REMOTE" ]]; then
        pass "origin fetch URL matches canonical GitHub repository"
      else
        fail "unexpected origin fetch URL: '$ORIGIN_FETCH_URL'"
      fi

      if [[ "$ORIGIN_PUSH_URL" == "$EXPECTED_REMOTE" ]]; then
        pass "origin push URL matches canonical GitHub repository"
      else
        fail "unexpected origin push URL: '$ORIGIN_PUSH_URL'"
      fi
    else
      fail "required origin remote does not exist"
    fi

    UPSTREAM_BRANCH="$(
      git rev-parse         --abbrev-ref         --symbolic-full-name         '@{u}' 2>/dev/null || true
    )"

    if [[ "$UPSTREAM_BRANCH" == "origin/main" ]]; then
      pass "main tracks origin/main"
    else
      fail "expected upstream origin/main, found '${UPSTREAM_BRANCH:-NONE}'"
    fi

    if git cat-file -e "${BASELINE_SHA}^{commit}" 2>/dev/null; then
      pass "immutable Phase 0 baseline commit exists"

      ACTUAL_BASELINE_SUBJECT="$(
        git log -1 --pretty=%s "$BASELINE_SHA"
      )"

      if [[ "$ACTUAL_BASELINE_SUBJECT" == "$BASELINE_SUBJECT" ]]; then
        pass "immutable baseline commit subject matches"
      else
        fail "immutable baseline subject mismatch: '$ACTUAL_BASELINE_SUBJECT'"
      fi

      BASELINE_FILE_COUNT="$(
        git ls-tree -r --name-only "$BASELINE_SHA"           | wc -l           | tr -d '[:space:]'
      )"

      if [[ "$BASELINE_FILE_COUNT" == "$BASELINE_TRACKED_COUNT" ]]; then
        pass "immutable baseline contains exactly $BASELINE_TRACKED_COUNT files"
      else
        fail "immutable baseline expected $BASELINE_TRACKED_COUNT files, found: $BASELINE_FILE_COUNT"
      fi

      if git merge-base --is-ancestor "$BASELINE_SHA" HEAD; then
        pass "immutable baseline is an ancestor of current HEAD"
      else
        fail "immutable baseline is not an ancestor of current HEAD"
      fi
    else
      fail "immutable Phase 0 baseline commit is missing: $BASELINE_SHA"
    fi

    LOCAL_HEAD="$(git rev-parse HEAD 2>/dev/null || true)"
    TRACKING_HEAD="$(git rev-parse origin/main 2>/dev/null || true)"

    REMOTE_MAIN_HEAD="$(
      git ls-remote origin refs/heads/main 2>/dev/null         | awk '{print $1}'         || true
    )"

    if [[ -n "$LOCAL_HEAD" && "$LOCAL_HEAD" == "$TRACKING_HEAD" ]]; then
      pass "local HEAD matches local origin/main tracking ref"
    else
      fail "local HEAD does not match origin/main"
    fi

    if [[ -n "$REMOTE_MAIN_HEAD" && "$LOCAL_HEAD" == "$REMOTE_MAIN_HEAD" ]]; then
      pass "local HEAD matches actual GitHub main"
    else
      fail "local HEAD does not match actual GitHub main"
    fi

    if [[ -n "$REMOTE_MAIN_HEAD" && "$TRACKING_HEAD" == "$REMOTE_MAIN_HEAD" ]]; then
      pass "origin/main tracking ref matches actual GitHub main"
    else
      fail "origin/main tracking ref does not match actual GitHub main"
    fi

    WORKTREE_STATE="$(git status --porcelain)"

    if [[ -z "$WORKTREE_STATE" ]]; then
      pass "baseline-remote working tree is clean"
    else
      fail "baseline-remote working tree is not clean"
    fi
    ;;

  phase1)
    REMOTE_COUNT="$(git remote | wc -l | tr -d '[:space:]')"

    if [[ "$REMOTE_COUNT" == "1" ]]; then
      pass "exactly one Git remote exists"
    else
      fail "phase1 expected exactly 1 Git remote, found: $REMOTE_COUNT"
    fi

    if git remote get-url origin >/dev/null 2>&1; then
      ORIGIN_FETCH_URL="$(git remote get-url origin)"
      ORIGIN_PUSH_URL="$(git remote get-url --push origin)"

      if [[ "$ORIGIN_FETCH_URL" == "$EXPECTED_REMOTE" ]]; then
        pass "origin fetch URL matches canonical GitHub repository"
      else
        fail "unexpected origin fetch URL: '$ORIGIN_FETCH_URL'"
      fi

      if [[ "$ORIGIN_PUSH_URL" == "$EXPECTED_REMOTE" ]]; then
        pass "origin push URL matches canonical GitHub repository"
      else
        fail "unexpected origin push URL: '$ORIGIN_PUSH_URL'"
      fi
    else
      fail "required origin remote does not exist"
    fi

    if git cat-file -e "${BASELINE_SHA}^{commit}" 2>/dev/null; then
      pass "immutable Phase 0 baseline commit exists"

      if git merge-base --is-ancestor "$BASELINE_SHA" HEAD; then
        pass "immutable Phase 0 baseline is an ancestor of HEAD"
      else
        fail "immutable Phase 0 baseline is not an ancestor of HEAD"
      fi
    else
      fail "immutable Phase 0 baseline commit is missing: $BASELINE_SHA"
    fi

    if git rev-parse --verify origin/main >/dev/null 2>&1; then
      pass "origin/main tracking ref exists"

      if git merge-base --is-ancestor origin/main HEAD; then
        pass "origin/main is an ancestor of HEAD"
      else
        fail "origin/main is not an ancestor of HEAD"
      fi
    else
      fail "origin/main tracking ref is missing"
    fi

    check_phase1_interrupted_git

    WORKTREE_STATE="$(git status --porcelain)"

    if [[ -z "$WORKTREE_STATE" ]]; then
      pass "working tree is clean"
    else
      info "working tree is dirty during active development; phase1 does not fail for that alone"
    fi
    ;;
esac

if [[ "$MODE" == "phase1" ]]; then
  section "HOOK SAFETY"
  check_phase1_hooks
fi

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

case "$MODE" in
  phase0|baseline-local|baseline-remote)
    section "PHASE 0 RESERVED PORTS"

    for reserved_port in "${RESERVED_PORTS[@]}"; do
      check_phase0_port_free "$reserved_port"
    done
    ;;
  phase1)
    section "PHASE 1 RESERVED PORTS"

    for reserved_port in "${RESERVED_PORTS[@]}"; do
      check_phase1_reserved_port "$reserved_port"
    done
    ;;
esac

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

case "$MODE" in
  phase0|baseline-local|baseline-remote)
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
    ;;
  phase1)
    section "PHASE 1 APPLICATION STATE"
    check_phase1_package_json
    ;;
esac

case "$MODE" in
  phase0|baseline-local|baseline-remote)
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
    ;;
  phase1)
    section "WEBSHOP DOCKER OWNERSHIP"
    check_phase1_webshop_docker
    ;;
esac

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
    baseline-remote)
      printf 'Remote Phase 0 foundation is synchronized, protected, and clean.\n'
      ;;
    phase1)
      printf 'Phase 1 feature-branch development context is consistent and protected.\n'
      ;;
  esac

  exit 0
fi

printf '\nPREFLIGHT FAILED\n' >&2
printf '%s check(s) failed.\n' "$FAILURES" >&2
printf 'Do not continue implementation until the failures are understood.\n' >&2

exit 1
