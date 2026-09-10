#!/usr/bin/env bash

set -Eeuo pipefail

# ==========================================================
# nomi-numi-shop
# Guarded local PostgreSQL lifecycle helper (Phase 1D)
# ==========================================================
#
# Usage:
#   scripts/db-local.sh <dev|test> <up|stop|status>
#
# Fixed allowlist only. No arbitrary project names, ports,
# databases, compose files, or SQL from the caller.

EXPECTED_ROOT="/home/pav4o71/Projects/nomi-numi-shop"
COMPOSE_FILE="${EXPECTED_ROOT}/infra/docker/postgres.compose.yml"
PROTECTED_HOST_PORT="5433"
OWNED_PROJECT_LABEL="nomi-numi-shop"

ENV_ID="${1:-}"
ACTION="${2:-}"

usage() {
  cat <<'EOF' >&2
Usage: scripts/db-local.sh <dev|test> <up|stop|status>

Environments (fixed allowlist only):
  dev   nomi-numi-shop-dev  127.0.0.1:55432  nomi_numi_shop_dev
  test  nomi-numi-shop-test 127.0.0.1:55433  nomi_numi_shop_test

Actions:
  up      Start PostgreSQL and wait until healthy
  stop    Stop containers (preserves named volumes)
  status  Show Compose service status
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

  if [[ ! -f "$COMPOSE_FILE" ]]; then
    fail "Compose file missing: ${COMPOSE_FILE}"
  fi
}

resolve_environment() {
  case "$ENV_ID" in
    dev)
      COMPOSE_PROJECT="nomi-numi-shop-dev"
      HOST_PORT="55432"
      DATABASE_NAME="nomi_numi_shop_dev"
      ENV_FILE="${EXPECTED_ROOT}/var/docker/dev.env"
      ;;
    test)
      COMPOSE_PROJECT="nomi-numi-shop-test"
      HOST_PORT="55433"
      DATABASE_NAME="nomi_numi_shop_test"
      ENV_FILE="${EXPECTED_ROOT}/var/docker/test.env"
      ;;
    *)
      usage
      fail "unsupported environment '${ENV_ID:-}' (only 'dev' or 'test')"
      ;;
  esac
}

require_path_mode() {
  local target_path="$1"
  local expected_mode="$2"
  local actual_mode

  if [[ ! -e "$target_path" ]]; then
    fail "expected path missing while checking permissions: ${target_path}"
  fi

  actual_mode="$(stat -c '%a' "$target_path")"
  if [[ "$actual_mode" != "$expected_mode" ]]; then
    fail "unsafe permissions on ${target_path}: mode ${actual_mode}, expected ${expected_mode}"
  fi
}

ensure_credentials() {
  local generated_password
  local postgres_user
  local docker_dir="${EXPECTED_ROOT}/var/docker"
  local previous_umask

  previous_umask="$(umask)"
  umask 077
  mkdir -p "$docker_dir"
  umask "$previous_umask"

  chmod 700 "$docker_dir"
  require_path_mode "$docker_dir" "700"

  if [[ -f "$ENV_FILE" ]]; then
    # Do not rotate/regenerate existing credentials. Require safe mode.
    require_path_mode "$ENV_FILE" "600"
    return 0
  fi

  postgres_user="nomi_numi_${ENV_ID}"
  generated_password="$(
    node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))"
  )"

  if [[ -z "$generated_password" || ${#generated_password} -lt 32 ]]; then
    fail "failed to generate a secure local database password"
  fi

  previous_umask="$(umask)"
  umask 077
  cat >"$ENV_FILE" <<EOF
# Generated local-only credentials for nomi-numi-shop (${ENV_ID}).
# Do not commit. Do not reuse outside this repository.
NOMI_ENVIRONMENT=${ENV_ID}
POSTGRES_HOST_PORT=${HOST_PORT}
POSTGRES_DB=${DATABASE_NAME}
POSTGRES_USER=${postgres_user}
POSTGRES_PASSWORD=${generated_password}
EOF
  umask "$previous_umask"

  chmod 600 "$ENV_FILE"
  require_path_mode "$ENV_FILE" "600"
  info "Created ignored local credentials file for ${ENV_ID}."
}

load_and_validate_credentials() {
  local loaded_environment=""
  local loaded_port=""
  local loaded_db=""
  local loaded_user=""
  local loaded_password=""
  local line
  local key
  local value

  if [[ ! -f "$ENV_FILE" ]]; then
    fail "credentials file missing: ${ENV_FILE}"
  fi

  require_path_mode "$ENV_FILE" "600"

  if [[ ! -r "$ENV_FILE" ]]; then
    fail "credentials file is not readable: ${ENV_FILE}"
  fi

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"

    if [[ -z "$line" || "$line" == \#* ]]; then
      continue
    fi

    if [[ "$line" != *=* ]]; then
      fail "invalid credentials line in ${ENV_FILE}"
    fi

    key="${line%%=*}"
    value="${line#*=}"

    case "$key" in
      NOMI_ENVIRONMENT)
        loaded_environment="$value"
        ;;
      POSTGRES_HOST_PORT)
        loaded_port="$value"
        ;;
      POSTGRES_DB)
        loaded_db="$value"
        ;;
      POSTGRES_USER)
        loaded_user="$value"
        ;;
      POSTGRES_PASSWORD)
        loaded_password="$value"
        ;;
      *)
        fail "unexpected key '${key}' in ${ENV_FILE}"
        ;;
    esac
  done <"$ENV_FILE"

  if [[ "$loaded_environment" != "$ENV_ID" ]]; then
    fail "NOMI_ENVIRONMENT in ${ENV_FILE} must be '${ENV_ID}'"
  fi

  if [[ "$loaded_port" != "$HOST_PORT" ]]; then
    fail "POSTGRES_HOST_PORT in ${ENV_FILE} must be '${HOST_PORT}'"
  fi

  if [[ "$loaded_port" == "$PROTECTED_HOST_PORT" ]]; then
    fail "refusing protected host port ${PROTECTED_HOST_PORT}"
  fi

  if [[ "$loaded_db" != "$DATABASE_NAME" ]]; then
    fail "POSTGRES_DB in ${ENV_FILE} must be '${DATABASE_NAME}'"
  fi

  if [[ -z "$loaded_user" ]]; then
    fail "POSTGRES_USER is missing in ${ENV_FILE}"
  fi

  if [[ -z "$loaded_password" ]]; then
    fail "POSTGRES_PASSWORD is missing in ${ENV_FILE}"
  fi

  unset loaded_password
}

compose() {
  docker compose \
    -p "$COMPOSE_PROJECT" \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    "$@"
}

resource_count_for_project() {
  local container_count
  local volume_count
  local network_count

  container_count="$(
    docker ps -a \
      --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" \
      --format '{{.ID}}' \
      | wc -l \
      | tr -d '[:space:]'
  )"

  volume_count="$(
    docker volume ls \
      --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" \
      --format '{{.Name}}' \
      | wc -l \
      | tr -d '[:space:]'
  )"

  network_count="$(
    docker network ls \
      --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" \
      --format '{{.ID}}' \
      | wc -l \
      | tr -d '[:space:]'
  )"

  printf '%s\n' "$((container_count + volume_count + network_count))"
}

verify_resource_labels() {
  local resource_kind="$1"
  local resource_id="$2"
  local project_label=""
  local owned_project=""
  local owned_environment=""

  case "$resource_kind" in
    container)
      project_label="$(
        docker inspect \
          --format '{{index .Config.Labels "com.docker.compose.project"}}' \
          "$resource_id" 2>/dev/null || true
      )"
      owned_project="$(
        docker inspect \
          --format '{{index .Config.Labels "com.nomimumi.project"}}' \
          "$resource_id" 2>/dev/null || true
      )"
      owned_environment="$(
        docker inspect \
          --format '{{index .Config.Labels "com.nomimumi.environment"}}' \
          "$resource_id" 2>/dev/null || true
      )"
      ;;
    volume)
      project_label="$(
        docker volume inspect \
          --format '{{index .Labels "com.docker.compose.project"}}' \
          "$resource_id" 2>/dev/null || true
      )"
      owned_project="$(
        docker volume inspect \
          --format '{{index .Labels "com.nomimumi.project"}}' \
          "$resource_id" 2>/dev/null || true
      )"
      owned_environment="$(
        docker volume inspect \
          --format '{{index .Labels "com.nomimumi.environment"}}' \
          "$resource_id" 2>/dev/null || true
      )"
      ;;
    network)
      project_label="$(
        docker network inspect \
          --format '{{index .Labels "com.docker.compose.project"}}' \
          "$resource_id" 2>/dev/null || true
      )"
      owned_project="$(
        docker network inspect \
          --format '{{index .Labels "com.nomimumi.project"}}' \
          "$resource_id" 2>/dev/null || true
      )"
      owned_environment="$(
        docker network inspect \
          --format '{{index .Labels "com.nomimumi.environment"}}' \
          "$resource_id" 2>/dev/null || true
      )"
      ;;
    *)
      fail "unknown resource kind for ownership proof: ${resource_kind}"
      ;;
  esac

  if [[ "$project_label" != "$COMPOSE_PROJECT" ]]; then
    fail "ownership proof failed for ${resource_kind} ${resource_id}: unexpected compose project '${project_label:-NONE}'"
  fi

  if [[ "$owned_project" != "$OWNED_PROJECT_LABEL" ]]; then
    fail "ownership proof failed for ${resource_kind} ${resource_id}: missing/invalid com.nomimumi.project"
  fi

  if [[ "$owned_environment" != "$ENV_ID" ]]; then
    fail "ownership proof failed for ${resource_kind} ${resource_id}: expected environment '${ENV_ID}', found '${owned_environment:-NONE}'"
  fi
}

verify_project_ownership_or_absent() {
  local resource_id
  local found=0

  while IFS= read -r resource_id; do
    if [[ -z "$resource_id" ]]; then
      continue
    fi
    found=1
    verify_resource_labels "container" "$resource_id"
  done < <(
    docker ps -a \
      --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" \
      --format '{{.ID}}'
  )

  while IFS= read -r resource_id; do
    if [[ -z "$resource_id" ]]; then
      continue
    fi
    found=1
    verify_resource_labels "volume" "$resource_id"
  done < <(
    docker volume ls \
      --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" \
      --format '{{.Name}}'
  )

  while IFS= read -r resource_id; do
    if [[ -z "$resource_id" ]]; then
      continue
    fi
    found=1
    verify_resource_labels "network" "$resource_id"
  done < <(
    docker network ls \
      --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" \
      --format '{{.ID}}'
  )

  if [[ "$found" -eq 0 ]]; then
    info "No existing ${COMPOSE_PROJECT} resources; safe to create."
  else
    info "Existing ${COMPOSE_PROJECT} resources verified as nomi-numi-shop/${ENV_ID}."
  fi
}

port_is_listening() {
  local reserved_port="$1"
  ss -ltn 2>/dev/null | grep -Eq ":${reserved_port}[[:space:]]"
}

port_owned_by_this_project() {
  local reserved_port="$1"
  local container_id
  local ports_field
  local compose_project
  local owned_project
  local owned_environment

  while IFS=$'\t' read -r container_id ports_field compose_project owned_project owned_environment; do
    if [[ -z "$container_id" ]]; then
      continue
    fi

    if ! printf '%s' "$ports_field" | grep -Eq "(^|[^0-9])${reserved_port}->|:${reserved_port}->"; then
      continue
    fi

    if [[ "$compose_project" == "$COMPOSE_PROJECT" \
      && "$owned_project" == "$OWNED_PROJECT_LABEL" \
      && "$owned_environment" == "$ENV_ID" ]]; then
      return 0
    fi

    return 1
  done < <(
    docker ps \
      --format $'{{.ID}}\t{{.Ports}}\t{{.Label "com.docker.compose.project"}}\t{{.Label "com.nomimumi.project"}}\t{{.Label "com.nomimumi.environment"}}' \
      2>/dev/null || true
  )

  return 1
}

verify_port_before_up() {
  if [[ "$HOST_PORT" == "$PROTECTED_HOST_PORT" ]]; then
    fail "refusing protected host port ${PROTECTED_HOST_PORT}"
  fi

  if ! port_is_listening "$HOST_PORT"; then
    info "Host port ${HOST_PORT} is free."
    return 0
  fi

  if port_owned_by_this_project "$HOST_PORT"; then
    info "Host port ${HOST_PORT} is already bound by owned project ${COMPOSE_PROJECT}."
    return 0
  fi

  fail "host port ${HOST_PORT} is occupied by an unproven/unknown resource; refusing to start"
}

action_up() {
  verify_project_ownership_or_absent
  verify_port_before_up

  info "Starting ${COMPOSE_PROJECT} PostgreSQL on 127.0.0.1:${HOST_PORT} ..."
  if ! compose up -d --wait; then
    fail "failed to start ${COMPOSE_PROJECT} (compose up -d --wait)"
  fi

  if ! port_is_listening "$HOST_PORT"; then
    fail "PostgreSQL started but host port ${HOST_PORT} is not listening"
  fi

  if ! port_owned_by_this_project "$HOST_PORT"; then
    fail "host port ${HOST_PORT} is listening but ownership could not be proven after start"
  fi

  info "PostgreSQL for ${ENV_ID} is up and healthy."
}

action_stop() {
  local count

  count="$(resource_count_for_project)"
  if [[ "$count" -eq 0 ]]; then
    info "No ${COMPOSE_PROJECT} resources present; nothing to stop."
    return 0
  fi

  verify_project_ownership_or_absent

  info "Stopping ${COMPOSE_PROJECT} (volumes preserved) ..."
  if ! compose stop; then
    fail "failed to stop ${COMPOSE_PROJECT}"
  fi

  if port_is_listening "$HOST_PORT"; then
    if port_owned_by_this_project "$HOST_PORT"; then
      fail "host port ${HOST_PORT} still bound by ${COMPOSE_PROJECT} after stop"
    fi
    fail "host port ${HOST_PORT} still occupied after stop by an unexpected resource"
  fi

  info "Stopped ${COMPOSE_PROJECT}. Named volume data was preserved."
}

action_status() {
  local count

  count="$(resource_count_for_project)"
  if [[ "$count" -eq 0 ]]; then
    info "status: ${COMPOSE_PROJECT} has no containers/volumes yet"
    return 0
  fi

  verify_project_ownership_or_absent
  compose ps
}

main() {
  require_repo_root

  if [[ -z "$ENV_ID" || -z "$ACTION" ]]; then
    usage
    fail "environment and action are required"
  fi

  resolve_environment
  ensure_credentials
  load_and_validate_credentials

  case "$ACTION" in
    up)
      action_up
      ;;
    stop)
      action_stop
      ;;
    status)
      action_status
      ;;
    *)
      usage
      fail "unsupported action '${ACTION}'"
      ;;
  esac
}

main "$@"
