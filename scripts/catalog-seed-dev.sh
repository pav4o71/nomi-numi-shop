#!/usr/bin/env bash

set -Eeuo pipefail

# ==========================================================
# nomi-numi-shop
# Guarded DEV-only catalog fixture seed (Phase 3C)
# ==========================================================
#
# Usage:
#   scripts/catalog-seed-dev.sh --confirm SEED-NOMI-DEV-CATALOG
#   pnpm catalog:seed:dev -- --confirm SEED-NOMI-DEV-CATALOG
#
# Seeds deterministic DEV catalog fixtures only.
# No TEST/production selector. No arbitrary database target flags.

EXPECTED_ROOT="/home/pav4o71/Projects/nomi-numi-shop"
SEED_CLI="${EXPECTED_ROOT}/src/catalog/fixtures/seed-dev-cli.ts"
PROTECTED_HOST_PORT="5433"
OWNED_PROJECT_LABEL="nomi-numi-shop"
COMPOSE_SERVICE_NAME="postgres"
CONFIRMATION_TOKEN="SEED-NOMI-DEV-CATALOG"

COMPOSE_PROJECT="nomi-numi-shop-dev"
HOST_PORT="55432"
DATABASE_NAME="nomi_numi_shop_dev"
EXPECTED_USER="nomi_numi_dev"
EXPECTED_CONTAINER="${COMPOSE_PROJECT}-${COMPOSE_SERVICE_NAME}-1"
CREDENTIAL_FILE="${EXPECTED_ROOT}/var/docker/dev.env"

CONFIRM=""

usage() {
  cat <<'EOF' >&2
Usage:
  scripts/catalog-seed-dev.sh --confirm SEED-NOMI-DEV-CATALOG
  pnpm catalog:seed:dev -- --confirm SEED-NOMI-DEV-CATALOG

Seeds deterministic DEV catalog fixtures into the project-owned DEV database.

This command:
  - requires the exact confirmation token
  - targets DEV only (no --env / host / port / database selector)
  - never uses protected host port 5433
  - refuses production-like environments
  - runs a complete read-only fixture preflight before any writes
  - never truncates, resets, or deletes unrelated DEV rows
EOF
}

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

require_repo_root() {
  local actual_root
  local actual_pwd

  actual_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  actual_pwd="$(pwd -P)"

  if [[ "$actual_root" != "$EXPECTED_ROOT" ]]; then
    fail "Git root must be ${EXPECTED_ROOT} (found: ${actual_root:-NONE})"
  fi

  if [[ "$actual_pwd" != "$EXPECTED_ROOT" ]]; then
    fail "Run this helper from ${EXPECTED_ROOT} (cwd: ${actual_pwd})"
  fi
}

refuse_production_like_environment() {
  if [[ "${NODE_ENV:-}" == "production" ]]; then
    fail "refusing production-like environment (NODE_ENV=production)"
  fi
  if [[ "${VERCEL:-}" == "1" ]]; then
    fail "refusing production-like environment (VERCEL=1)"
  fi
  if [[ "${VERCEL_ENV:-}" == "production" ]]; then
    fail "refusing production-like environment (VERCEL_ENV=production)"
  fi
}

parse_arguments() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --)
        # pnpm may forward the argument separator; ignore it.
        shift
        ;;
      --confirm)
        [[ $# -ge 2 ]] || fail "confirmation token missing; refusing DEV catalog seed"
        CONFIRM="$2"
        shift 2
        ;;
      --env | --host | --port | --database | --user | --url)
        usage
        fail "forbidden target-selection argument '$1'; DEV catalog seed has a fixed DEV target"
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *)
        usage
        fail "unexpected argument '$1'; refusing DEV catalog seed"
        ;;
    esac
  done

  if [[ -z "$CONFIRM" ]]; then
    usage
    fail "usage: --confirm ${CONFIRMATION_TOKEN}"
  fi

  if [[ "$CONFIRM" != "$CONFIRMATION_TOKEN" ]]; then
    fail "confirmation token mismatch; refusing DEV catalog seed"
  fi
}

container_label() {
  local container_name="$1"
  local label_key="$2"

  docker inspect \
    --format "{{index .Config.Labels \"${label_key}\"}}" \
    "$container_name" 2>/dev/null || true
}

verify_owned_dev_postgres_container() {
  local project_label
  local service_label
  local owned_project
  local owned_environment
  local running
  local ports_json

  if [[ "$HOST_PORT" == "$PROTECTED_HOST_PORT" ]]; then
    fail "refusing protected host port ${PROTECTED_HOST_PORT}"
  fi

  if ! docker inspect "$EXPECTED_CONTAINER" >/dev/null 2>&1; then
    fail "expected container '${EXPECTED_CONTAINER}' is absent; start it with pnpm db:dev:up first"
  fi

  project_label="$(container_label "$EXPECTED_CONTAINER" "com.docker.compose.project")"
  service_label="$(container_label "$EXPECTED_CONTAINER" "com.docker.compose.service")"
  owned_project="$(container_label "$EXPECTED_CONTAINER" "com.nomimumi.project")"
  owned_environment="$(container_label "$EXPECTED_CONTAINER" "com.nomimumi.environment")"

  if [[ "$project_label" != "$COMPOSE_PROJECT" \
    || "$service_label" != "$COMPOSE_SERVICE_NAME" \
    || "$owned_project" != "$OWNED_PROJECT_LABEL" \
    || "$owned_environment" != "dev" ]]; then
    fail "container '${EXPECTED_CONTAINER}' failed ownership labels; refusing DEV catalog seed"
  fi

  running="$(
    docker inspect --format '{{.State.Running}}' "$EXPECTED_CONTAINER" 2>/dev/null || true
  )"
  if [[ "$running" != "true" ]]; then
    fail "PostgreSQL container '${EXPECTED_CONTAINER}' is not running; start it with pnpm db:dev:up"
  fi

  ports_json="$(docker inspect --format '{{json .NetworkSettings.Ports}}' "$EXPECTED_CONTAINER")"
  if [[ "$ports_json" != *"\"5432/tcp\":"* || "$ports_json" != *"\"HostPort\":\"${HOST_PORT}\""* ]]; then
    fail "container '${EXPECTED_CONTAINER}' is not bound to expected host port ${HOST_PORT}"
  fi

  if [[ "$ports_json" == *"\"HostPort\":\"${PROTECTED_HOST_PORT}\""* ]]; then
    fail "refusing protected host port ${PROTECTED_HOST_PORT}"
  fi

  if [[ ! -f "$CREDENTIAL_FILE" ]]; then
    fail "credentials file missing: ${CREDENTIAL_FILE}"
  fi
}

require_repo_root
refuse_production_like_environment
parse_arguments "$@"
verify_owned_dev_postgres_container

if [[ ! -f "$SEED_CLI" ]]; then
  fail "seed CLI missing: ${SEED_CLI}"
fi

if ! command -v pnpm >/dev/null 2>&1; then
  fail "pnpm is required to run the TypeScript DEV catalog seed CLI"
fi

# Clear ambient transport overrides before invoking the TypeScript runner.
env -u DATABASE_URL -u POSTGRES_HOST -u PGHOST -u PGPORT -u PGDATABASE -u PGUSER -u PGPASSWORD \
  -u NOMI_DRIZZLE_CONNECT_HOST -u NOMI_DRIZZLE_CONNECT_PORT \
  pnpm exec tsx "$SEED_CLI" --confirm "$CONFIRM"
