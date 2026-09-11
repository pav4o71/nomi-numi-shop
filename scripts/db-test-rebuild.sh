#!/usr/bin/env bash

set -Eeuo pipefail

# ==========================================================
# nomi-numi-shop
# Guarded TEST-only database rebuild (Phase 1F)
# ==========================================================
#
# Usage:
#   scripts/db-test-rebuild.sh --confirm RESET-NOMI-TEST-DATABASE
#   pnpm db:test:rebuild -- --confirm RESET-NOMI-TEST-DATABASE
#
# TEST identity is fixed by this helper. There is no environment
# selector. DEV, production, arbitrary databases, hosts, ports, and
# container IDs cannot be selected.
#
# Destructive SQL is limited to DROP/CREATE of nomi_numi_shop_test.
# Active sessions cause refusal. Connections are not terminated.
# Docker resources are not removed.

EXPECTED_ROOT="/home/pav4o71/Projects/nomi-numi-shop"
PATH_SAFETY="${EXPECTED_ROOT}/scripts/drizzle-path-safety.mjs"
MIGRATE_HELPER="${EXPECTED_ROOT}/scripts/drizzle-local.sh"
REBUILD_RUNNER="${EXPECTED_ROOT}/scripts/db-test-rebuild.mjs"
CREDENTIAL_FILE="${EXPECTED_ROOT}/var/docker/test.env"
PROTECTED_HOST_PORT="5433"
OWNED_PROJECT_LABEL="nomi-numi-shop"
COMPOSE_SERVICE_NAME="postgres"
EXPECTED_COMPOSE_VOLUME="postgres_data"
EXPECTED_COMPOSE_NETWORK="postgres_net"
EXPECTED_POSTGRES_IMAGE="postgres:16.15-bookworm"
EXPECTED_PGDATA_DEST="/var/lib/postgresql/data"
MIGRATE_NODE_IMAGE="node:24.19.0-bookworm-slim"
CONFIRMATION_TOKEN="RESET-NOMI-TEST-DATABASE"

# Structurally fixed TEST identity. Callers cannot override these.
ENV_ID="test"
COMPOSE_PROJECT="nomi-numi-shop-test"
EXPECTED_CONTAINER="nomi-numi-shop-test-postgres-1"
DATABASE_NAME="nomi_numi_shop_test"
EXPECTED_USER="nomi_numi_test"
HOST_PORT="55433"
INTERNAL_SQL_HOST="127.0.0.1"
INTERNAL_SQL_PORT="5432"
EXPECTED_NETWORK="nomi-numi-shop-test_postgres_net"
EXPECTED_VOLUME="nomi-numi-shop-test_postgres_data"
MAINTENANCE_DATABASE="postgres"

usage() {
  cat <<'EOF' >&2
Usage:
  scripts/db-test-rebuild.sh --confirm RESET-NOMI-TEST-DATABASE
  pnpm db:test:rebuild -- --confirm RESET-NOMI-TEST-DATABASE

Rebuilds ONLY the local TEST database nomi_numi_shop_test.

This command:
  - requires the exact confirmation token
  - never targets DEV or production
  - never uses protected host port 5433
  - refuses unexpected active TEST sessions
  - does not terminate other connections
  - reapplies committed Drizzle migrations
  - does not expose a raw SQL console
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
  local parsed_args=()

  # pnpm may forward a literal "--" before user arguments.
  if [[ "$#" -ge 1 && "$1" == "--" ]]; then
    shift
  fi

  parsed_args=("$@")

  if [[ "${#parsed_args[@]}" -ne 2 ]]; then
    usage
    fail "rebuild requires exactly: --confirm ${CONFIRMATION_TOKEN}"
  fi

  if [[ "${parsed_args[0]}" != "--confirm" ]]; then
    usage
    fail "rebuild requires exactly: --confirm ${CONFIRMATION_TOKEN}"
  fi

  if [[ "${parsed_args[1]}" != "$CONFIRMATION_TOKEN" ]]; then
    usage
    fail "confirmation token mismatch; refusing TEST rebuild"
  fi
}

validate_fixed_identity() {
  if [[ "$HOST_PORT" == "$PROTECTED_HOST_PORT" ]]; then
    fail "refusing protected host port ${PROTECTED_HOST_PORT}"
  fi

  if [[ "$INTERNAL_SQL_PORT" == "$PROTECTED_HOST_PORT" ]]; then
    fail "refusing protected SQL port ${PROTECTED_HOST_PORT}"
  fi

  if [[ "$ENV_ID" != "test" \
    || "$COMPOSE_PROJECT" != "nomi-numi-shop-test" \
    || "$EXPECTED_CONTAINER" != "nomi-numi-shop-test-postgres-1" \
    || "$DATABASE_NAME" != "nomi_numi_shop_test" \
    || "$EXPECTED_USER" != "nomi_numi_test" \
    || "$HOST_PORT" != "55433" \
    || "$INTERNAL_SQL_HOST" != "127.0.0.1" \
    || "$INTERNAL_SQL_PORT" != "5432" \
    || "$EXPECTED_NETWORK" != "nomi-numi-shop-test_postgres_net" \
    || "$EXPECTED_VOLUME" != "nomi-numi-shop-test_postgres_data" \
    || "$MAINTENANCE_DATABASE" != "postgres" ]]; then
    fail "TEST rebuild identity drifted from fixed constants"
  fi
}

validate_tooling_paths() {
  node "$PATH_SAFETY" tooling
  node "$PATH_SAFETY" migrations

  if [[ ! -f "$REBUILD_RUNNER" || -L "$REBUILD_RUNNER" ]]; then
    fail "rebuild runner missing or is a symlink: ${REBUILD_RUNNER}"
  fi

  if [[ ! -f "$MIGRATE_HELPER" || -L "$MIGRATE_HELPER" ]]; then
    fail "migrate helper missing or is a symlink: ${MIGRATE_HELPER}"
  fi

  if [[ ! -d "${EXPECTED_ROOT}/node_modules/postgres" ]]; then
    fail "required Node dependencies missing; run pnpm install --frozen-lockfile"
  fi
}

validate_credential_file_without_parsing() {
  if [[ -L "$CREDENTIAL_FILE" ]]; then
    fail "TEST credentials path must not be a symlink: ${CREDENTIAL_FILE}"
  fi

  if [[ ! -f "$CREDENTIAL_FILE" ]]; then
    fail "TEST credentials file missing: ${CREDENTIAL_FILE}"
  fi

  if [[ "$(stat -c '%a' "$CREDENTIAL_FILE")" != "600" ]]; then
    fail "TEST credentials file mode must be 600: ${CREDENTIAL_FILE}"
  fi
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
    fail "expected volume '${volume_name}' is absent; refusing TEST rebuild"
  fi

  project_label="$(volume_label "$volume_name" "com.docker.compose.project")"
  compose_volume_label="$(volume_label "$volume_name" "com.docker.compose.volume")"
  owned_project="$(volume_label "$volume_name" "com.nomimumi.project")"
  owned_environment="$(volume_label "$volume_name" "com.nomimumi.environment")"

  if [[ "$project_label" != "$COMPOSE_PROJECT" \
    || "$compose_volume_label" != "$EXPECTED_COMPOSE_VOLUME" \
    || "$owned_project" != "$OWNED_PROJECT_LABEL" \
    || "$owned_environment" != "$ENV_ID" ]]; then
    fail "volume '${volume_name}' failed ownership proof; refusing TEST rebuild"
  fi
}

assert_owned_network_name() {
  local network_name="$1"
  local project_label
  local compose_network_label
  local owned_project
  local owned_environment

  if ! docker network inspect "$network_name" >/dev/null 2>&1; then
    fail "expected network '${network_name}' is absent; refusing TEST rebuild"
  fi

  project_label="$(network_label "$network_name" "com.docker.compose.project")"
  compose_network_label="$(network_label "$network_name" "com.docker.compose.network")"
  owned_project="$(network_label "$network_name" "com.nomimumi.project")"
  owned_environment="$(network_label "$network_name" "com.nomimumi.environment")"

  if [[ "$project_label" != "$COMPOSE_PROJECT" \
    || "$compose_network_label" != "$EXPECTED_COMPOSE_NETWORK" \
    || "$owned_project" != "$OWNED_PROJECT_LABEL" \
    || "$owned_environment" != "$ENV_ID" ]]; then
    fail "network '${network_name}' failed ownership proof; refusing TEST rebuild"
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
  local ports_ok

  if ! docker inspect "$EXPECTED_CONTAINER" >/dev/null 2>&1; then
    fail "expected container '${EXPECTED_CONTAINER}' is absent; start it with pnpm db:test:up first"
  fi

  project_label="$(container_label "$EXPECTED_CONTAINER" "com.docker.compose.project")"
  service_label="$(container_label "$EXPECTED_CONTAINER" "com.docker.compose.service")"
  owned_project="$(container_label "$EXPECTED_CONTAINER" "com.nomimumi.project")"
  owned_environment="$(container_label "$EXPECTED_CONTAINER" "com.nomimumi.environment")"

  if [[ "$project_label" != "$COMPOSE_PROJECT" \
    || "$service_label" != "$COMPOSE_SERVICE_NAME" \
    || "$owned_project" != "$OWNED_PROJECT_LABEL" \
    || "$owned_environment" != "$ENV_ID" ]]; then
    fail "container '${EXPECTED_CONTAINER}' failed ownership labels; refusing TEST rebuild"
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
    fail "PostgreSQL container '${EXPECTED_CONTAINER}' is not running; start it with pnpm db:test:up"
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

run_namespaced_rebuild_runner() {
  # Share the exact verified TEST PostgreSQL container network namespace.
  # No Compose DNS alias. Password never appears on argv.
  # Do not forward host PG*/DATABASE_URL into the disposable runner.
  # Transport is fixed inside the runner to 127.0.0.1:5432.
  #
  # Fresh process-local capability is a guardrail against accidental
  # direct runner invocation. It is not authentication against this
  # Unix account. It is not printed, persisted, or placed on argv.
  local wrapper_capability
  local runner_status

  wrapper_capability="$(
    node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("base64url"))'
  )"
  if [[ ${#wrapper_capability} -ne 43 || ! "$wrapper_capability" =~ ^[A-Za-z0-9_-]+$ ]]; then
    fail "failed to generate wrapper execution capability"
  fi

  export NOMI_TEST_REBUILD_CAPABILITY="$wrapper_capability"

  set +e
  printf '%s' "$wrapper_capability" |
    env \
      -u DATABASE_URL \
      -u PGHOST \
      -u PGPORT \
      -u PGDATABASE \
      -u PGUSER \
      -u PGPASSWORD \
      -u POSTGRES_HOST \
      -u POSTGRES_DB \
      -u POSTGRES_USER \
      -u POSTGRES_PASSWORD \
      -u NOMI_DRIZZLE_CONNECT_HOST \
      -u NOMI_DRIZZLE_CONNECT_PORT \
      docker run --rm -i \
        --network "container:${VERIFIED_CONTAINER_ID}" \
        --volume "${EXPECTED_ROOT}:${EXPECTED_ROOT}:ro" \
        --workdir "$EXPECTED_ROOT" \
        --user "$(id -u):$(id -g)" \
        --env HOME=/tmp \
        --env NOMI_TEST_REBUILD_CAPABILITY \
        "$MIGRATE_NODE_IMAGE" \
        node "$REBUILD_RUNNER" --confirm "$CONFIRMATION_TOKEN" "$@"
  runner_status=$?
  set -e

  unset NOMI_TEST_REBUILD_CAPABILITY
  unset wrapper_capability

  if [[ "$runner_status" -ne 0 ]]; then
    exit "$runner_status"
  fi
}

run_rebuild() {
  validate_fixed_identity
  validate_tooling_paths
  validate_credential_file_without_parsing
  verify_exact_postgres_container

  info "Rebuilding TEST (${DATABASE_NAME})"
  info "Verified PostgreSQL container ${EXPECTED_CONTAINER} id=${VERIFIED_CONTAINER_ID}"
  info "Phase 1D host publication checked: 127.0.0.1:${HOST_PORT}->5432/tcp"
  info "Destructive runner network namespace: container:${VERIFIED_CONTAINER_ID}"
  info "SQL transport inside namespace: ${INTERNAL_SQL_HOST}:${INTERNAL_SQL_PORT}"
  info "Maintenance database: ${MAINTENANCE_DATABASE}"

  run_namespaced_rebuild_runner

  info "Reusing Phase 1E migrate for TEST ..."
  "${EXPECTED_ROOT}/scripts/drizzle-local.sh" migrate test

  info "Verifying rebuilt TEST database ..."
  run_namespaced_rebuild_runner verify
}

require_repo_root
validate_cli_arguments "$@"
run_rebuild
