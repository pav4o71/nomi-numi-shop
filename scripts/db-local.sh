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
#
# Compose interpolation variables controlled by this helper:
#   NOMI_ENVIRONMENT
#   POSTGRES_HOST_PORT
#   POSTGRES_DB
#   POSTGRES_USER
#   POSTGRES_PASSWORD
# Ambient shell values for these must never win over validated state.

EXPECTED_ROOT="/home/pav4o71/Projects/nomi-numi-shop"
COMPOSE_FILE="${EXPECTED_ROOT}/infra/docker/postgres.compose.yml"
PROTECTED_HOST_PORT="5433"
OWNED_PROJECT_LABEL="nomi-numi-shop"
COMPOSE_SERVICE_NAME="postgres"
PASSWORD_BYTE_LENGTH="32"
# base64url encoding of 32 bytes is 43 characters without padding.
PASSWORD_EXPECTED_LENGTH="43"

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

  if [[ -L "$COMPOSE_FILE" ]]; then
    fail "Compose file must not be a symlink: ${COMPOSE_FILE}"
  fi
}

validate_cli_arguments() {
  if [[ -z "$ENV_ID" || -z "$ACTION" ]]; then
    usage
    fail "environment and action are required"
  fi

  case "$ACTION" in
    up | stop | status) ;;
    *)
      usage
      fail "unsupported action '${ACTION}'"
      ;;
  esac

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
      ENV_FILE="${EXPECTED_ROOT}/var/docker/dev.env"
      ;;
    test)
      COMPOSE_PROJECT="nomi-numi-shop-test"
      HOST_PORT="55433"
      DATABASE_NAME="nomi_numi_shop_test"
      EXPECTED_USER="nomi_numi_test"
      ENV_FILE="${EXPECTED_ROOT}/var/docker/test.env"
      ;;
    *)
      usage
      fail "unsupported environment '${ENV_ID:-}' (only 'dev' or 'test')"
      ;;
  esac

  # Deterministic Compose v2 resource names for -p <project>.
  EXPECTED_CONTAINER="${COMPOSE_PROJECT}-${COMPOSE_SERVICE_NAME}-1"
  EXPECTED_VOLUME="${COMPOSE_PROJECT}_postgres_data"
  EXPECTED_NETWORK="${COMPOSE_PROJECT}_postgres_net"
  CREDENTIAL_DIR="${EXPECTED_ROOT}/var/docker"
  VAR_DIR="${EXPECTED_ROOT}/var"
}

path_is_under_expected_root() {
  local candidate_path="$1"

  if [[ "$candidate_path" == "$EXPECTED_ROOT" ]]; then
    return 0
  fi

  if [[ "$candidate_path" == "$EXPECTED_ROOT"/* ]]; then
    return 0
  fi

  return 1
}

reject_symlink() {
  local target_path="$1"

  if [[ -L "$target_path" ]]; then
    fail "refusing symlink path (fail closed): ${target_path}"
  fi
}

require_existing_directory() {
  local target_path="$1"

  reject_symlink "$target_path"

  if [[ ! -d "$target_path" ]]; then
    fail "expected directory is missing or not a directory: ${target_path}"
  fi
}

require_canonical_under_root() {
  local target_path="$1"
  local resolved_path

  resolved_path="$(realpath -e "$target_path" 2>/dev/null || true)"
  if [[ -z "$resolved_path" ]]; then
    fail "unable to resolve canonical path for: ${target_path}"
  fi

  if ! path_is_under_expected_root "$resolved_path"; then
    fail "path resolves outside canonical repository: ${target_path}"
  fi
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

require_owned_by_current_user() {
  local target_path="$1"
  local actual_uid
  local expected_uid

  expected_uid="$(id -u)"
  actual_uid="$(stat -c '%u' "$target_path")"

  if [[ "$actual_uid" != "$expected_uid" ]]; then
    fail "unsafe ownership on ${target_path}: uid ${actual_uid}, expected ${expected_uid}"
  fi
}

validate_password_format() {
  local candidate_password="$1"

  if [[ ${#candidate_password} -ne "$PASSWORD_EXPECTED_LENGTH" ]]; then
    fail "POSTGRES_PASSWORD length must be ${PASSWORD_EXPECTED_LENGTH} (base64url of ${PASSWORD_BYTE_LENGTH} bytes)"
  fi

  if [[ ! "$candidate_password" =~ ^[A-Za-z0-9_-]+$ ]]; then
    fail "POSTGRES_PASSWORD must match the base64url generator character set"
  fi
}

validate_var_parent_directory() {
  if [[ -e "$VAR_DIR" || -L "$VAR_DIR" ]]; then
    reject_symlink "$VAR_DIR"
    require_existing_directory "$VAR_DIR"
    require_canonical_under_root "$VAR_DIR"
  fi
}

ensure_credential_directory() {
  local previous_umask

  validate_var_parent_directory

  if [[ -e "$CREDENTIAL_DIR" || -L "$CREDENTIAL_DIR" ]]; then
    reject_symlink "$CREDENTIAL_DIR"
    require_existing_directory "$CREDENTIAL_DIR"
    require_canonical_under_root "$CREDENTIAL_DIR"
    # Existing directory: refuse unsafe mode; do not silently repair.
    require_path_mode "$CREDENTIAL_DIR" "700"
    require_owned_by_current_user "$CREDENTIAL_DIR"
    return 0
  fi

  previous_umask="$(umask)"
  umask 077
  mkdir -p "$CREDENTIAL_DIR"
  umask "$previous_umask"

  reject_symlink "$CREDENTIAL_DIR"
  require_existing_directory "$CREDENTIAL_DIR"
  require_canonical_under_root "$CREDENTIAL_DIR"
  require_path_mode "$CREDENTIAL_DIR" "700"
  require_owned_by_current_user "$CREDENTIAL_DIR"
}

create_credential_file_exclusively() {
  local generated_password="$1"
  local write_status

  # Exclusive create (O_CREAT|O_EXCL via Node 'wx') avoids following a
  # pre-existing symlink and refuses to overwrite an unexpected file.
  set +e
  NOMI_CRED_PATH="$ENV_FILE" node - "$generated_password" <<'NODE'
const fs = require("fs");
const filePath = process.env.NOMI_CRED_PATH;
const password = process.argv[2];
const envId = process.env.NOMI_ENVIRONMENT;
const hostPort = process.env.POSTGRES_HOST_PORT;
const databaseName = process.env.POSTGRES_DB;
const postgresUser = process.env.POSTGRES_USER;

if (!filePath || !password || !envId || !hostPort || !databaseName || !postgresUser) {
  process.stderr.write("missing credential creation inputs\n");
  process.exit(1);
}

const contents =
  `# Generated local-only credentials for nomi-numi-shop (${envId}).\n` +
  `# Do not commit. Do not reuse outside this repository.\n` +
  `NOMI_ENVIRONMENT=${envId}\n` +
  `POSTGRES_HOST_PORT=${hostPort}\n` +
  `POSTGRES_DB=${databaseName}\n` +
  `POSTGRES_USER=${postgresUser}\n` +
  `POSTGRES_PASSWORD=${password}\n`;

let fd;
try {
  fd = fs.openSync(filePath, "wx", 0o600);
  fs.writeFileSync(fd, contents);
} catch (error) {
  if (error && error.code === "EEXIST") {
    process.exit(2);
  }
  process.stderr.write("credential file creation failed\n");
  process.exit(1);
} finally {
  if (fd !== undefined) {
    fs.closeSync(fd);
  }
}
NODE
  write_status=$?
  set -e

  if [[ "$write_status" -eq 2 ]]; then
    fail "credential file unexpectedly already exists: ${ENV_FILE}"
  fi

  if [[ "$write_status" -ne 0 ]]; then
    fail "failed to create credential file exclusively: ${ENV_FILE}"
  fi
}

ensure_credentials() {
  local generated_password

  ensure_credential_directory

  if [[ -e "$ENV_FILE" || -L "$ENV_FILE" ]]; then
    reject_symlink "$ENV_FILE"

    if [[ ! -f "$ENV_FILE" ]]; then
      fail "credential path exists but is not a regular file: ${ENV_FILE}"
    fi

    require_canonical_under_root "$ENV_FILE"
    # Existing file: refuse unsafe mode; do not silently repair.
    require_path_mode "$ENV_FILE" "600"
    require_owned_by_current_user "$ENV_FILE"
    return 0
  fi

  generated_password="$(
    node -e "process.stdout.write(require('crypto').randomBytes(${PASSWORD_BYTE_LENGTH}).toString('base64url'))"
  )"

  validate_password_format "$generated_password"

  # Provide fixed identity values to the exclusive writer via env.
  # Shell ambient overrides are not trusted for these names.
  NOMI_ENVIRONMENT="$ENV_ID" \
    POSTGRES_HOST_PORT="$HOST_PORT" \
    POSTGRES_DB="$DATABASE_NAME" \
    POSTGRES_USER="$EXPECTED_USER" \
    create_credential_file_exclusively "$generated_password"

  reject_symlink "$ENV_FILE"
  if [[ ! -f "$ENV_FILE" ]]; then
    fail "credential file missing after exclusive create: ${ENV_FILE}"
  fi
  require_canonical_under_root "$ENV_FILE"
  require_path_mode "$ENV_FILE" "600"
  require_owned_by_current_user "$ENV_FILE"
  info "Created ignored local credentials file for ${ENV_ID}."
}

load_and_validate_credentials() {
  local loaded_environment=""
  local loaded_port=""
  local loaded_db=""
  local loaded_user=""
  local loaded_password=""
  local seen_environment=0
  local seen_port=0
  local seen_db=0
  local seen_user=0
  local seen_password=0
  local line
  local key
  local value

  reject_symlink "$ENV_FILE"
  if [[ ! -f "$ENV_FILE" ]]; then
    fail "credentials file missing or not a regular file: ${ENV_FILE}"
  fi
  require_canonical_under_root "$ENV_FILE"
  require_path_mode "$ENV_FILE" "600"
  require_owned_by_current_user "$ENV_FILE"

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
        if [[ "$seen_environment" -eq 1 ]]; then
          fail "duplicate key NOMI_ENVIRONMENT in ${ENV_FILE}"
        fi
        seen_environment=1
        loaded_environment="$value"
        ;;
      POSTGRES_HOST_PORT)
        if [[ "$seen_port" -eq 1 ]]; then
          fail "duplicate key POSTGRES_HOST_PORT in ${ENV_FILE}"
        fi
        seen_port=1
        loaded_port="$value"
        ;;
      POSTGRES_DB)
        if [[ "$seen_db" -eq 1 ]]; then
          fail "duplicate key POSTGRES_DB in ${ENV_FILE}"
        fi
        seen_db=1
        loaded_db="$value"
        ;;
      POSTGRES_USER)
        if [[ "$seen_user" -eq 1 ]]; then
          fail "duplicate key POSTGRES_USER in ${ENV_FILE}"
        fi
        seen_user=1
        loaded_user="$value"
        ;;
      POSTGRES_PASSWORD)
        if [[ "$seen_password" -eq 1 ]]; then
          fail "duplicate key POSTGRES_PASSWORD in ${ENV_FILE}"
        fi
        seen_password=1
        loaded_password="$value"
        ;;
      *)
        fail "unexpected key '${key}' in ${ENV_FILE}"
        ;;
    esac
  done <"$ENV_FILE"

  if [[ "$seen_environment" -ne 1 || "$seen_port" -ne 1 || "$seen_db" -ne 1 || "$seen_user" -ne 1 || "$seen_password" -ne 1 ]]; then
    fail "credentials file ${ENV_FILE} is missing one or more required keys"
  fi

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

  if [[ "$loaded_user" != "$EXPECTED_USER" ]]; then
    fail "POSTGRES_USER in ${ENV_FILE} must be '${EXPECTED_USER}'"
  fi

  validate_password_format "$loaded_password"

  # Retained only for sanitized Compose child env; never printed.
  VALIDATED_PASSWORD="$loaded_password"
  unset loaded_password
}

compose() {
  # Docker Compose prefers ambient shell variables over --env-file.
  # Force every project-controlled interpolation variable from validated
  # helper state, and clear COMPOSE_* knobs that could swap file/project
  # identity or naming compatibility.
  env \
    -u COMPOSE_FILE \
    -u COMPOSE_PROJECT_NAME \
    -u COMPOSE_PATH \
    -u COMPOSE_ENV_FILES \
    -u COMPOSE_PROFILES \
    -u COMPOSE_COMPATIBILITY \
    -u COMPOSE_IGNORE_ORPHANS \
    -u COMPOSE_REMOVE_ORPHANS \
    NOMI_ENVIRONMENT="$ENV_ID" \
    POSTGRES_HOST_PORT="$HOST_PORT" \
    POSTGRES_DB="$DATABASE_NAME" \
    POSTGRES_USER="$EXPECTED_USER" \
    POSTGRES_PASSWORD="$VALIDATED_PASSWORD" \
    docker compose \
    -p "$COMPOSE_PROJECT" \
    --env-file "$ENV_FILE" \
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

assert_owned_volume_name() {
  local volume_name="$1"
  local project_label
  local owned_project
  local owned_environment

  if ! docker volume inspect "$volume_name" >/dev/null 2>&1; then
    return 0
  fi

  project_label="$(volume_label "$volume_name" "com.docker.compose.project")"
  owned_project="$(volume_label "$volume_name" "com.nomimumi.project")"
  owned_environment="$(volume_label "$volume_name" "com.nomimumi.environment")"

  if [[ "$project_label" != "$COMPOSE_PROJECT" \
    || "$owned_project" != "$OWNED_PROJECT_LABEL" \
    || "$owned_environment" != "$ENV_ID" ]]; then
    fail "deterministic volume name '${volume_name}' exists with missing/foreign ownership; refusing to adopt"
  fi
}

assert_owned_network_name() {
  local network_name="$1"
  local project_label
  local owned_project
  local owned_environment

  if ! docker network inspect "$network_name" >/dev/null 2>&1; then
    return 0
  fi

  project_label="$(network_label "$network_name" "com.docker.compose.project")"
  owned_project="$(network_label "$network_name" "com.nomimumi.project")"
  owned_environment="$(network_label "$network_name" "com.nomimumi.environment")"

  if [[ "$project_label" != "$COMPOSE_PROJECT" \
    || "$owned_project" != "$OWNED_PROJECT_LABEL" \
    || "$owned_environment" != "$ENV_ID" ]]; then
    fail "deterministic network name '${network_name}' exists with missing/foreign ownership; refusing to adopt"
  fi
}

assert_deterministic_resources_safe() {
  # Exact-name checks catch foreign/unlabelled collisions that label
  # filters would miss before Compose can reuse them.
  assert_owned_container_name "$EXPECTED_CONTAINER"
  assert_owned_volume_name "$EXPECTED_VOLUME"
  assert_owned_network_name "$EXPECTED_NETWORK"
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
  local service_label=""

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

      if [[ "$service_label" != "$COMPOSE_SERVICE_NAME" ]]; then
        fail "ownership proof failed for container ${resource_id}: unexpected service '${service_label:-NONE}'"
      fi
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
    # Still reject exact-name foreign collisions before any Compose call.
    assert_deterministic_resources_safe
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
    assert_deterministic_resources_safe
    info "status: ${COMPOSE_PROJECT} has no containers/volumes yet"
    return 0
  fi

  verify_project_ownership_or_absent
  compose ps
}

main() {
  require_repo_root
  # Reject invalid env/action before any credential filesystem mutation.
  validate_cli_arguments
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
