#!/usr/bin/env bash

set -Eeuo pipefail

# ==========================================================
# nomi-numi-shop
# Guarded DEV/TEST-only first-admin bootstrap (Phase 2C4)
# ==========================================================
#
# Usage:
#   scripts/auth-first-admin-bootstrap.sh \
#     --env <dev|test> --email <email> --confirm PROMOTE-FIRST-NOMI-ADMIN
#   pnpm auth:bootstrap-first-admin -- \
#     --env <dev|test> --email <email> --confirm PROMOTE-FIRST-NOMI-ADMIN
#
# Promotes an existing verified customer to admin only while zero admins
# exist. No HTTP surface. Production targets are refused.

EXPECTED_ROOT="/home/pav4o71/Projects/nomi-numi-shop"
BOOTSTRAP_RUNNER="${EXPECTED_ROOT}/scripts/auth-first-admin-bootstrap.mjs"
PROTECTED_HOST_PORT="5433"
OWNED_PROJECT_LABEL="nomi-numi-shop"
COMPOSE_SERVICE_NAME="postgres"
CONFIRMATION_TOKEN="PROMOTE-FIRST-NOMI-ADMIN"

ENV_ID=""
EMAIL=""
CONFIRM=""

usage() {
  cat <<'EOF' >&2
Usage:
  scripts/auth-first-admin-bootstrap.sh \
    --env <dev|test> --email <email> --confirm PROMOTE-FIRST-NOMI-ADMIN
  pnpm auth:bootstrap-first-admin -- \
    --env <dev|test> --email <email> --confirm PROMOTE-FIRST-NOMI-ADMIN

Promotes one existing verified customer to admin only while zero admins exist.

This command:
  - requires the exact confirmation token
  - targets DEV or TEST only
  - never uses protected host port 5433
  - refuses production-like environments
  - performs a race-safe zero-admin check + promotion
  - does not expose an HTTP or self-promotion path
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
      --env)
        [[ $# -ge 2 ]] || fail "usage: --env <dev|test> --email <email> --confirm PROMOTE-FIRST-NOMI-ADMIN"
        ENV_ID="$2"
        shift 2
        ;;
      --email)
        [[ $# -ge 2 ]] || fail "usage: --env <dev|test> --email <email> --confirm PROMOTE-FIRST-NOMI-ADMIN"
        EMAIL="$2"
        shift 2
        ;;
      --confirm)
        [[ $# -ge 2 ]] || fail "confirmation token missing; refusing first-admin bootstrap"
        CONFIRM="$2"
        shift 2
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *)
        usage
        fail "unexpected argument '$1'; refusing first-admin bootstrap"
        ;;
    esac
  done

  if [[ -z "$ENV_ID" || -z "$EMAIL" || -z "$CONFIRM" ]]; then
    usage
    fail "usage: --env <dev|test> --email <email> --confirm PROMOTE-FIRST-NOMI-ADMIN"
  fi

  if [[ "$CONFIRM" != "$CONFIRMATION_TOKEN" ]]; then
    fail "confirmation token mismatch; refusing first-admin bootstrap"
  fi

  case "$ENV_ID" in
    dev | test) ;;
    *)
      usage
      fail "unsupported environment '${ENV_ID}' (only 'dev' or 'test')"
      ;;
  esac
}

resolve_environment() {
  case "$ENV_ID" in
    dev)
      COMPOSE_PROJECT="nomi-numi-shop-dev"
      HOST_PORT="55432"
      DATABASE_NAME="nomi_numi_shop_dev"
      EXPECTED_USER="nomi_numi_dev"
      EXPECTED_CONTAINER="${COMPOSE_PROJECT}-${COMPOSE_SERVICE_NAME}-1"
      CREDENTIAL_FILE="${EXPECTED_ROOT}/var/docker/dev.env"
      ;;
    test)
      COMPOSE_PROJECT="nomi-numi-shop-test"
      HOST_PORT="55433"
      DATABASE_NAME="nomi_numi_shop_test"
      EXPECTED_USER="nomi_numi_test"
      EXPECTED_CONTAINER="${COMPOSE_PROJECT}-${COMPOSE_SERVICE_NAME}-1"
      CREDENTIAL_FILE="${EXPECTED_ROOT}/var/docker/test.env"
      ;;
    *)
      fail "unsupported environment '${ENV_ID:-}' (only 'dev' or 'test')"
      ;;
  esac

  if [[ "$HOST_PORT" == "$PROTECTED_HOST_PORT" ]]; then
    fail "refusing protected host port ${PROTECTED_HOST_PORT}"
  fi
}

container_label() {
  local container_name="$1"
  local label_key="$2"

  docker inspect \
    --format "{{index .Config.Labels \"${label_key}\"}}" \
    "$container_name" 2>/dev/null || true
}

verify_owned_postgres_container() {
  local project_label
  local service_label
  local owned_project
  local owned_environment
  local running
  local ports_json

  if ! docker inspect "$EXPECTED_CONTAINER" >/dev/null 2>&1; then
    fail "expected container '${EXPECTED_CONTAINER}' is absent; start it with pnpm db:${ENV_ID}:up first"
  fi

  project_label="$(container_label "$EXPECTED_CONTAINER" "com.docker.compose.project")"
  service_label="$(container_label "$EXPECTED_CONTAINER" "com.docker.compose.service")"
  owned_project="$(container_label "$EXPECTED_CONTAINER" "com.nomimumi.project")"
  owned_environment="$(container_label "$EXPECTED_CONTAINER" "com.nomimumi.environment")"

  if [[ "$project_label" != "$COMPOSE_PROJECT" \
    || "$service_label" != "$COMPOSE_SERVICE_NAME" \
    || "$owned_project" != "$OWNED_PROJECT_LABEL" \
    || "$owned_environment" != "$ENV_ID" ]]; then
    fail "container '${EXPECTED_CONTAINER}' failed ownership labels; refusing first-admin bootstrap"
  fi

  running="$(
    docker inspect --format '{{.State.Running}}' "$EXPECTED_CONTAINER" 2>/dev/null || true
  )"
  if [[ "$running" != "true" ]]; then
    fail "PostgreSQL container '${EXPECTED_CONTAINER}' is not running; start it with pnpm db:${ENV_ID}:up"
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
resolve_environment
verify_owned_postgres_container

if [[ ! -f "$BOOTSTRAP_RUNNER" ]]; then
  fail "bootstrap runner missing: ${BOOTSTRAP_RUNNER}"
fi

# Clear ambient transport overrides before invoking the Node runner.
env -u DATABASE_URL -u POSTGRES_HOST -u PGHOST -u PGPORT -u PGDATABASE -u PGUSER -u PGPASSWORD \
  -u NOMI_DRIZZLE_CONNECT_HOST -u NOMI_DRIZZLE_CONNECT_PORT \
  node "$BOOTSTRAP_RUNNER" --env "$ENV_ID" --email "$EMAIL" --confirm "$CONFIRM"
