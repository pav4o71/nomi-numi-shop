#!/usr/bin/env bash

set -Eeuo pipefail

# ==========================================================
# nomi-numi-shop
# Guarded local Drizzle tooling helper (Phase 1E)
# ==========================================================
#
# Usage:
#   scripts/drizzle-local.sh generate
#   scripts/drizzle-local.sh check
#   scripts/drizzle-local.sh migrate <dev|test>
#
# Fixed allowlist only. No push/drop/reset/studio/query.
# Credentials are never sourced/eval'd and never placed on argv.
# Migration SQL uses --network container:<exact-id> + 127.0.0.1:5432.

EXPECTED_ROOT="/home/pav4o71/Projects/nomi-numi-shop"
DRIZZLE_CONFIG="${EXPECTED_ROOT}/drizzle.config.ts"
SCHEMA_FILE="${EXPECTED_ROOT}/src/db/schema/index.ts"
MIGRATIONS_DIR="${EXPECTED_ROOT}/drizzle"
MIGRATE_RUNNER="${EXPECTED_ROOT}/scripts/drizzle-migrate.mjs"
PATH_SAFETY="${EXPECTED_ROOT}/scripts/drizzle-path-safety.mjs"
PROTECTED_HOST_PORT="5433"
OWNED_PROJECT_LABEL="nomi-numi-shop"
COMPOSE_SERVICE_NAME="postgres"
EXPECTED_COMPOSE_VOLUME="postgres_data"
EXPECTED_COMPOSE_NETWORK="postgres_net"
EXPECTED_POSTGRES_IMAGE="postgres:16.15-bookworm"
EXPECTED_PGDATA_DEST="/var/lib/postgresql/data"
MIGRATE_NODE_IMAGE="node:24.19.0-bookworm-slim"

ACTION="${1:-}"
ENV_ID="${2:-}"
EXTRA_ARG="${3:-}"

usage() {
  cat <<'EOF' >&2
Usage:
  scripts/drizzle-local.sh generate
  scripts/drizzle-local.sh check
  scripts/drizzle-local.sh migrate <dev|test>

Actions:
  generate  Create SQL migrations from the canonical schema (no DB)
  check     Validate committed migration consistency (no DB)
  migrate   Apply committed migrations to DEV or TEST only

Forbidden in this helper:
  push, drop, reset, studio, query, sql, shell
EOF
}

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

info() {
  printf '%s\n' "$1" >&2
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

validate_cli_arguments() {
  if [[ -z "$ACTION" ]]; then
    usage
    fail "action is required"
  fi

  case "$ACTION" in
    generate | check)
      if [[ -n "$ENV_ID" || -n "$EXTRA_ARG" || "$#" -ne 1 ]]; then
        usage
        fail "'${ACTION}' accepts no additional arguments"
      fi
      ;;
    migrate)
      if [[ "$#" -ne 2 || -n "$EXTRA_ARG" ]]; then
        usage
        fail "migrate requires exactly one environment argument: dev|test"
      fi
      case "$ENV_ID" in
        dev | test) ;;
        *)
          usage
          fail "unsupported environment '${ENV_ID}' (only 'dev' or 'test')"
          ;;
      esac
      ;;
    *)
      usage
      fail "unsupported action '${ACTION}'"
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
      EXPECTED_VOLUME="${COMPOSE_PROJECT}_postgres_data"
      EXPECTED_NETWORK="${COMPOSE_PROJECT}_postgres_net"
      ;;
    test)
      COMPOSE_PROJECT="nomi-numi-shop-test"
      HOST_PORT="55433"
      DATABASE_NAME="nomi_numi_shop_test"
      EXPECTED_USER="nomi_numi_test"
      EXPECTED_CONTAINER="${COMPOSE_PROJECT}-${COMPOSE_SERVICE_NAME}-1"
      EXPECTED_VOLUME="${COMPOSE_PROJECT}_postgres_data"
      EXPECTED_NETWORK="${COMPOSE_PROJECT}_postgres_net"
      ;;
    *)
      usage
      fail "unsupported environment '${ENV_ID:-}' (only 'dev' or 'test')"
      ;;
  esac

  if [[ "$HOST_PORT" == "$PROTECTED_HOST_PORT" ]]; then
    fail "refusing protected host port ${PROTECTED_HOST_PORT}"
  fi
}

validate_tooling_paths() {
  node "$PATH_SAFETY" tooling
}

validate_migrations_tree() {
  node "$PATH_SAFETY" migrations
}

container_label() {
  local container_name="$1"
  local label_key="$2"

  docker inspect \
    --format "{{index .Config.Labels \"${label_key}\"}}" \
    "$container_name" 2>/dev/null || true
}

volume_label() {
  local volume_name="$1"
  local label_key="$2"

  docker volume inspect \
    --format "{{index .Labels \"${label_key}\"}}" \
    "$volume_name" 2>/dev/null || true
}

network_label() {
  local network_name="$1"
  local label_key="$2"

  docker network inspect \
    --format "{{index .Labels \"${label_key}\"}}" \
    "$network_name" 2>/dev/null || true
}

assert_owned_volume_name() {
  local volume_name="$1"
  local project_label
  local compose_volume_label
  local owned_project
  local owned_environment

  if ! docker volume inspect "$volume_name" >/dev/null 2>&1; then
    fail "expected volume '${volume_name}' is absent; refusing migrate"
  fi

  project_label="$(volume_label "$volume_name" "com.docker.compose.project")"
  compose_volume_label="$(volume_label "$volume_name" "com.docker.compose.volume")"
  owned_project="$(volume_label "$volume_name" "com.nomimumi.project")"
  owned_environment="$(volume_label "$volume_name" "com.nomimumi.environment")"

  if [[ "$project_label" != "$COMPOSE_PROJECT" \
    || "$compose_volume_label" != "$EXPECTED_COMPOSE_VOLUME" \
    || "$owned_project" != "$OWNED_PROJECT_LABEL" \
    || "$owned_environment" != "$ENV_ID" ]]; then
    fail "volume '${volume_name}' failed ownership proof; refusing migrate"
  fi
}

assert_owned_network_name() {
  local network_name="$1"
  local project_label
  local compose_network_label
  local owned_project
  local owned_environment

  if ! docker network inspect "$network_name" >/dev/null 2>&1; then
    fail "expected network '${network_name}' is absent; refusing migrate"
  fi

  project_label="$(network_label "$network_name" "com.docker.compose.project")"
  compose_network_label="$(network_label "$network_name" "com.docker.compose.network")"
  owned_project="$(network_label "$network_name" "com.nomimumi.project")"
  owned_environment="$(network_label "$network_name" "com.nomimumi.environment")"

  if [[ "$project_label" != "$COMPOSE_PROJECT" \
    || "$compose_network_label" != "$EXPECTED_COMPOSE_NETWORK" \
    || "$owned_project" != "$OWNED_PROJECT_LABEL" \
    || "$owned_environment" != "$ENV_ID" ]]; then
    fail "network '${network_name}' failed ownership proof; refusing migrate"
  fi
}

verify_exact_postgres_container() {
  local project_label
  local service_label
  local owned_project
  local owned_environment
  local running
  local health
  local config_image
  local image_id
  local expected_image_id
  local networks
  local network_count
  local mounts_ok
  local ports_json
  local expected_ports_json

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
    fail "container '${EXPECTED_CONTAINER}' failed ownership labels; refusing migrate"
  fi

  running="$(
    docker inspect --format '{{.State.Running}}' "$EXPECTED_CONTAINER" 2>/dev/null || true
  )"
  health="$(
    docker inspect \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}NONE{{end}}' \
      "$EXPECTED_CONTAINER" 2>/dev/null || true
  )"

  if [[ "$running" != "true" ]]; then
    fail "PostgreSQL container '${EXPECTED_CONTAINER}' is not running; start it with pnpm db:${ENV_ID}:up"
  fi

  if [[ "$health" != "healthy" ]]; then
    fail "PostgreSQL container '${EXPECTED_CONTAINER}' is not healthy (status: ${health:-NONE})"
  fi

  config_image="$(
    docker inspect --format '{{.Config.Image}}' "$EXPECTED_CONTAINER" 2>/dev/null || true
  )"
  image_id="$(
    docker inspect --format '{{.Image}}' "$EXPECTED_CONTAINER" 2>/dev/null || true
  )"
  expected_image_id="$(
    docker image inspect --format '{{.Id}}' "$EXPECTED_POSTGRES_IMAGE" 2>/dev/null || true
  )"

  if [[ "$config_image" != "$EXPECTED_POSTGRES_IMAGE" ]]; then
    fail "container image name must be '${EXPECTED_POSTGRES_IMAGE}' (found '${config_image:-NONE}')"
  fi

  if [[ -z "$expected_image_id" ]]; then
    fail "expected PostgreSQL image '${EXPECTED_POSTGRES_IMAGE}' is not present locally"
  fi

  if [[ "$image_id" != "$expected_image_id" ]]; then
    fail "container image ID does not match '${EXPECTED_POSTGRES_IMAGE}'"
  fi

  assert_owned_volume_name "$EXPECTED_VOLUME"
  assert_owned_network_name "$EXPECTED_NETWORK"

  networks="$(
    docker inspect \
      --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' \
      "$EXPECTED_CONTAINER" 2>/dev/null || true
  )"
  network_count="$(printf '%s\n' "$networks" | sed '/^$/d' | wc -l | tr -d '[:space:]')"

  if [[ "$network_count" -ne 1 ]]; then
    fail "container '${EXPECTED_CONTAINER}' must attach to exactly one network (found ${network_count})"
  fi

  if [[ "$(printf '%s\n' "$networks" | sed '/^$/d')" != "$EXPECTED_NETWORK" ]]; then
    fail "container '${EXPECTED_CONTAINER}' is not attached solely to '${EXPECTED_NETWORK}'"
  fi

  mounts_ok="$(
    docker inspect --format '{{json .Mounts}}' "$EXPECTED_CONTAINER" \
      | node -e '
        const fs = require("fs");
        const expectedVolume = process.argv[1];
        const expectedDest = process.argv[2];
        const mounts = JSON.parse(fs.readFileSync(0, "utf8"));
        const match = mounts.find((mount) =>
          mount.Type === "volume"
          && mount.Name === expectedVolume
          && mount.Destination === expectedDest
        );
        process.stdout.write(match ? "yes" : "no");
      ' "$EXPECTED_VOLUME" "$EXPECTED_PGDATA_DEST"
  )"

  if [[ "$mounts_ok" != "yes" ]]; then
    fail "container '${EXPECTED_CONTAINER}' missing expected data volume mount at ${EXPECTED_PGDATA_DEST}"
  fi

  ports_json="$(
    docker inspect --format '{{json .NetworkSettings.Ports}}' "$EXPECTED_CONTAINER" 2>/dev/null || true
  )"
  ports_ok="$(
    printf '%s' "$ports_json" | node -e '
      const fs = require("fs");
      const hostPort = process.argv[1];
      const ports = JSON.parse(fs.readFileSync(0, "utf8"));
      const keys = Object.keys(ports || {});
      const bindings = ports && ports["5432/tcp"];
      const ok =
        keys.length === 1
        && keys[0] === "5432/tcp"
        && Array.isArray(bindings)
        && bindings.length === 1
        && bindings[0].HostIp === "127.0.0.1"
        && String(bindings[0].HostPort) === String(hostPort);
      process.stdout.write(ok ? "yes" : "no");
    ' "$HOST_PORT"
  )"

  if [[ "$ports_ok" != "yes" ]]; then
    fail "container '${EXPECTED_CONTAINER}' host port binding must be exactly 127.0.0.1:${HOST_PORT}->5432/tcp"
  fi

  if ! ss -ltn | grep -E "127\\.0\\.0\\.1:${HOST_PORT}[[:space:]]" >/dev/null 2>&1; then
    fail "expected loopback listener 127.0.0.1:${HOST_PORT} is absent"
  fi

  VERIFIED_CONTAINER_ID="$(
    docker inspect --format '{{.Id}}' "$EXPECTED_CONTAINER" 2>/dev/null || true
  )"

  if [[ -z "$VERIFIED_CONTAINER_ID" || ! "$VERIFIED_CONTAINER_ID" =~ ^[0-9a-f]{64}$ ]]; then
    fail "failed to capture immutable container ID for '${EXPECTED_CONTAINER}'"
  fi
}

run_generate() {
  validate_tooling_paths
  validate_migrations_tree

  info "Generating migrations from ${SCHEMA_FILE} into ${MIGRATIONS_DIR} ..."
  node "${EXPECTED_ROOT}/node_modules/drizzle-kit/bin.cjs" generate --config="$DRIZZLE_CONFIG"

  validate_migrations_tree
}

run_check() {
  validate_tooling_paths
  validate_migrations_tree

  info "Checking committed migration consistency ..."
  node "${EXPECTED_ROOT}/node_modules/drizzle-kit/bin.cjs" check --config="$DRIZZLE_CONFIG"
}

run_migrate() {
  resolve_environment
  validate_tooling_paths
  validate_migrations_tree

  if [[ ! -f "$MIGRATE_RUNNER" || -L "$MIGRATE_RUNNER" ]]; then
    fail "migrate runner missing or is a symlink: ${MIGRATE_RUNNER}"
  fi

  if [[ ! -d "${EXPECTED_ROOT}/node_modules/drizzle-orm" || ! -d "${EXPECTED_ROOT}/node_modules/postgres" ]]; then
    fail "required Node dependencies missing; run pnpm install --frozen-lockfile"
  fi

  verify_exact_postgres_container

  info "Migrating ${ENV_ID} (${DATABASE_NAME})"
  info "Verified PostgreSQL container ${EXPECTED_CONTAINER} id=${VERIFIED_CONTAINER_ID}"
  info "Phase 1D host publication checked: 127.0.0.1:${HOST_PORT}->5432/tcp"
  info "Migration runner network namespace: container:${VERIFIED_CONTAINER_ID}"
  info "SQL transport inside namespace: 127.0.0.1:5432"

  # Share the exact verified PostgreSQL container network namespace.
  # No Compose DNS alias. Password never appears on argv.
  # Do not forward host PG*/DATABASE_URL into the disposable runner.
  # Transport is fixed inside the runner to 127.0.0.1:5432.
  docker run --rm \
    --network "container:${VERIFIED_CONTAINER_ID}" \
    --volume "${EXPECTED_ROOT}:${EXPECTED_ROOT}:ro" \
    --workdir "$EXPECTED_ROOT" \
    --user "$(id -u):$(id -g)" \
    --env HOME=/tmp \
    "$MIGRATE_NODE_IMAGE" \
    node "$MIGRATE_RUNNER" "$ENV_ID"
}

require_repo_root
validate_cli_arguments "$@"

case "$ACTION" in
  generate)
    run_generate
    ;;
  check)
    run_check
    ;;
  migrate)
    run_migrate
    ;;
esac
