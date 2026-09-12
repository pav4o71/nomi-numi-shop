#!/usr/bin/env bash

set -Eeuo pipefail

# ==========================================================
# nomi-numi-shop
# Guarded local Mailpit lifecycle helper (Phase 2C1)
# ==========================================================
#
# Usage:
#   scripts/email-local.sh <up|stop|status>
#
# Fixed allowlist only. No arbitrary project names, ports,
# compose files, or ambient Compose overrides from the caller.
#
# Compose interpolation variables controlled by this helper:
#   NOMI_ENVIRONMENT
# Ambient shell values for this must never win over validated state.

EXPECTED_ROOT="/home/pav4o71/Projects/nomi-numi-shop"
COMPOSE_FILE="${EXPECTED_ROOT}/infra/docker/mailpit.compose.yml"
OWNED_PROJECT_LABEL="nomi-numi-shop"
COMPOSE_PROJECT="nomi-numi-shop-dev"
ENV_ID="dev"
COMPOSE_SERVICE_NAME="mailpit"
EXPECTED_COMPOSE_NETWORK="mailpit_net"
SMTP_HOST_PORT="11025"
UI_HOST_PORT="18025"
PROTECTED_HOST_PORT="5433"

ACTION="${1:-}"

# Deterministic Compose v2 resource names for -p <project>.
EXPECTED_CONTAINER="${COMPOSE_PROJECT}-${COMPOSE_SERVICE_NAME}-1"
EXPECTED_NETWORK="${COMPOSE_PROJECT}_${EXPECTED_COMPOSE_NETWORK}"

usage() {
  cat <<'EOF' >&2
Usage: scripts/email-local.sh <up|stop|status>

Fixed local Mailpit identity:
  project  nomi-numi-shop-dev
  SMTP     127.0.0.1:11025
  UI       127.0.0.1:18025

Actions:
  up      Start Mailpit and wait until healthy
  stop    Stop the Mailpit container (preserves unrelated project resources)
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

  if [[ -L "$COMPOSE_FILE" ]]; then
    fail "Compose file must not be a symlink: ${COMPOSE_FILE}"
  fi
}

validate_cli_arguments() {
  if [[ -z "$ACTION" ]]; then
    usage
    fail "action is required"
  fi

  case "$ACTION" in
    up | stop | status) ;;
    *)
      usage
      fail "unsupported action '${ACTION}'"
      ;;
  esac
}

is_allowed_compose_service() {
  local service_name="$1"

  case "$service_name" in
    postgres | mailpit) return 0 ;;
    *) return 1 ;;
  esac
}

is_allowed_compose_network() {
  local network_name="$1"

  case "$network_name" in
    postgres_net | mailpit_net) return 0 ;;
    *) return 1 ;;
  esac
}

is_allowed_compose_volume() {
  local volume_name="$1"

  case "$volume_name" in
    postgres_data) return 0 ;;
    *) return 1 ;;
  esac
}

compose() {
  # Docker Compose prefers ambient shell variables over --env-file.
  # Force every project-controlled interpolation variable from validated
  # helper state, and clear COMPOSE_* knobs that could swap file/project
  # identity or naming compatibility.
  # COMPOSE_IGNORE_ORPHANS=1 is intentional: DEV may host both PostgreSQL
  # and Mailpit under the same project with separate compose files. Ambient
  # COMPOSE_* identity knobs remain cleared so callers cannot retarget.
  env \
    -u COMPOSE_FILE \
    -u COMPOSE_PROJECT_NAME \
    -u COMPOSE_PATH \
    -u COMPOSE_ENV_FILES \
    -u COMPOSE_PROFILES \
    -u COMPOSE_COMPATIBILITY \
    -u COMPOSE_REMOVE_ORPHANS \
    COMPOSE_IGNORE_ORPHANS=1 \
    NOMI_ENVIRONMENT="$ENV_ID" \
    docker compose \
    -p "$COMPOSE_PROJECT" \
    -f "$COMPOSE_FILE" \
    "$@"
}

container_label() {
  local container_name="$1"
  local label_key="$2"

  docker inspect \
    --format "{{index .Config.Labels \"${label_key}\"}}" \
    "$container_name" 2>/dev/null || true
}

network_label() {
  local network_name="$1"
  local label_key="$2"

  docker network inspect \
    --format "{{index .Labels \"${label_key}\"}}" \
    "$network_name" 2>/dev/null || true
}

volume_label() {
  local volume_name="$1"
  local label_key="$2"

  docker volume inspect \
    --format "{{index .Labels \"${label_key}\"}}" \
    "$volume_name" 2>/dev/null || true
}

assert_owned_container_name() {
  local container_name="$1"
  local project_label
  local service_label
  local owned_project
  local owned_environment

  if ! docker inspect "$container_name" >/dev/null 2>&1; then
    return 0
  fi

  project_label="$(container_label "$container_name" "com.docker.compose.project")"
  service_label="$(container_label "$container_name" "com.docker.compose.service")"
  owned_project="$(container_label "$container_name" "com.nomimumi.project")"
  owned_environment="$(container_label "$container_name" "com.nomimumi.environment")"

  if [[ "$project_label" != "$COMPOSE_PROJECT" \
    || "$service_label" != "$COMPOSE_SERVICE_NAME" \
    || "$owned_project" != "$OWNED_PROJECT_LABEL" \
    || "$owned_environment" != "$ENV_ID" ]]; then
    fail "deterministic container name '${container_name}' exists with missing/foreign ownership; refusing to adopt"
  fi
}

assert_owned_network_name() {
  local network_name="$1"
  local project_label
  local compose_network_label
  local owned_project
  local owned_environment

  if ! docker network inspect "$network_name" >/dev/null 2>&1; then
    return 0
  fi

  project_label="$(network_label "$network_name" "com.docker.compose.project")"
  compose_network_label="$(network_label "$network_name" "com.docker.compose.network")"
  owned_project="$(network_label "$network_name" "com.nomimumi.project")"
  owned_environment="$(network_label "$network_name" "com.nomimumi.environment")"

  if [[ "$project_label" != "$COMPOSE_PROJECT" \
    || "$compose_network_label" != "$EXPECTED_COMPOSE_NETWORK" \
    || "$owned_project" != "$OWNED_PROJECT_LABEL" \
    || "$owned_environment" != "$ENV_ID" ]]; then
    fail "deterministic network name '${network_name}' exists with missing/foreign ownership; refusing to adopt"
  fi
}

assert_deterministic_resources_safe() {
  assert_owned_container_name "$EXPECTED_CONTAINER"
  assert_owned_network_name "$EXPECTED_NETWORK"
}

verify_resource_labels() {
  local resource_kind="$1"
  local resource_id="$2"
  local project_label=""
  local owned_project=""
  local owned_environment=""
  local service_label=""
  local compose_volume_label=""
  local compose_network_label=""

  case "$resource_kind" in
    container)
      project_label="$(
        docker inspect \
          --format '{{index .Config.Labels "com.docker.compose.project"}}' \
          "$resource_id" 2>/dev/null || true
      )"
      service_label="$(
        docker inspect \
          --format '{{index .Config.Labels "com.docker.compose.service"}}' \
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

      if ! is_allowed_compose_service "$service_label"; then
        fail "ownership proof failed for container ${resource_id}: unexpected service '${service_label:-NONE}'"
      fi
      ;;
    volume)
      project_label="$(
        docker volume inspect \
          --format '{{index .Labels "com.docker.compose.project"}}' \
          "$resource_id" 2>/dev/null || true
      )"
      compose_volume_label="$(
        docker volume inspect \
          --format '{{index .Labels "com.docker.compose.volume"}}' \
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

      if ! is_allowed_compose_volume "$compose_volume_label"; then
        fail "ownership proof failed for volume ${resource_id}: unexpected Compose volume '${compose_volume_label:-NONE}'"
      fi
      ;;
    network)
      project_label="$(
        docker network inspect \
          --format '{{index .Labels "com.docker.compose.project"}}' \
          "$resource_id" 2>/dev/null || true
      )"
      compose_network_label="$(
        docker network inspect \
          --format '{{index .Labels "com.docker.compose.network"}}' \
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

      if ! is_allowed_compose_network "$compose_network_label"; then
        fail "ownership proof failed for network ${resource_id}: unexpected Compose network '${compose_network_label:-NONE}'"
      fi
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

  assert_deterministic_resources_safe

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

mailpit_resource_count() {
  local container_count
  local network_count

  container_count="$(
    docker ps -a \
      --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" \
      --filter "label=com.docker.compose.service=${COMPOSE_SERVICE_NAME}" \
      --format '{{.ID}}' \
      | wc -l \
      | tr -d '[:space:]'
  )"

  network_count="$(
    docker network ls \
      --filter "label=com.docker.compose.project=${COMPOSE_PROJECT}" \
      --filter "label=com.docker.compose.network=${EXPECTED_COMPOSE_NETWORK}" \
      --format '{{.ID}}' \
      | wc -l \
      | tr -d '[:space:]'
  )"

  printf '%s\n' "$((container_count + network_count))"
}

port_is_listening() {
  local reserved_port="$1"
  ss -ltn 2>/dev/null | grep -Eq ":${reserved_port}[[:space:]]"
}

port_owned_by_mailpit() {
  local reserved_port="$1"
  local container_id
  local ports_field
  local compose_project
  local owned_project
  local owned_environment
  local service_label

  while IFS=$'\t' read -r container_id ports_field compose_project owned_project owned_environment service_label; do
    if [[ -z "$container_id" ]]; then
      continue
    fi

    if ! printf '%s' "$ports_field" | grep -Eq "(^|[^0-9])${reserved_port}->|:${reserved_port}->"; then
      continue
    fi

    if [[ "$compose_project" == "$COMPOSE_PROJECT" \
      && "$owned_project" == "$OWNED_PROJECT_LABEL" \
      && "$owned_environment" == "$ENV_ID" \
      && "$service_label" == "$COMPOSE_SERVICE_NAME" ]]; then
      return 0
    fi

    return 1
  done < <(
    docker ps \
      --format $'{{.ID}}\t{{.Ports}}\t{{.Label "com.docker.compose.project"}}\t{{.Label "com.nomimumi.project"}}\t{{.Label "com.nomimumi.environment"}}\t{{.Label "com.docker.compose.service"}}' \
      2>/dev/null || true
  )

  return 1
}

verify_port_before_up() {
  local reserved_port="$1"

  if [[ "$reserved_port" == "$PROTECTED_HOST_PORT" ]]; then
    fail "refusing protected host port ${PROTECTED_HOST_PORT}"
  fi

  if ! port_is_listening "$reserved_port"; then
    info "Host port ${reserved_port} is free."
    return 0
  fi

  if port_owned_by_mailpit "$reserved_port"; then
    info "Host port ${reserved_port} is already bound by owned Mailpit (${COMPOSE_PROJECT})."
    return 0
  fi

  fail "host port ${reserved_port} is occupied by an unproven/unknown resource; refusing to start"
}

assert_ports_owned_after_start() {
  local reserved_port

  for reserved_port in "$SMTP_HOST_PORT" "$UI_HOST_PORT"; do
    if ! port_is_listening "$reserved_port"; then
      fail "Mailpit started but host port ${reserved_port} is not listening"
    fi

    if ! port_owned_by_mailpit "$reserved_port"; then
      fail "host port ${reserved_port} is listening but Mailpit ownership could not be proven after start"
    fi
  done
}

assert_ports_free_after_stop() {
  local reserved_port

  for reserved_port in "$SMTP_HOST_PORT" "$UI_HOST_PORT"; do
    if port_is_listening "$reserved_port"; then
      if port_owned_by_mailpit "$reserved_port"; then
        fail "host port ${reserved_port} still bound by Mailpit after stop"
      fi
      fail "host port ${reserved_port} still occupied after stop by an unexpected resource"
    fi
  done
}

action_up() {
  verify_project_ownership_or_absent
  verify_port_before_up "$SMTP_HOST_PORT"
  verify_port_before_up "$UI_HOST_PORT"

  info "Starting ${COMPOSE_PROJECT} Mailpit on 127.0.0.1:${SMTP_HOST_PORT} (SMTP) and 127.0.0.1:${UI_HOST_PORT} (UI) ..."
  if ! compose up -d --wait; then
    fail "failed to start Mailpit (compose up -d --wait)"
  fi

  assert_ports_owned_after_start
  info "Mailpit is up and healthy."
}

action_stop() {
  local count

  count="$(mailpit_resource_count)"
  if [[ "$count" -eq 0 ]]; then
    assert_deterministic_resources_safe
    info "No Mailpit resources present; nothing to stop."
    return 0
  fi

  verify_project_ownership_or_absent

  info "Stopping Mailpit in ${COMPOSE_PROJECT} ..."
  if ! compose stop; then
    fail "failed to stop Mailpit"
  fi

  assert_ports_free_after_stop
  info "Stopped Mailpit. PostgreSQL and other ${COMPOSE_PROJECT} resources were left untouched."
}

action_status() {
  local count

  count="$(mailpit_resource_count)"
  if [[ "$count" -eq 0 ]]; then
    assert_deterministic_resources_safe
    info "status: Mailpit has no containers/networks yet"
    return 0
  fi

  verify_project_ownership_or_absent
  compose ps
}

main() {
  require_repo_root
  validate_cli_arguments

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
