# Nomi Numi Shop — Environment Baseline

## 1. Canonical repository

Project:

- nomi-numi-shop

Canonical root:

- /home/pav4o71/Projects/nomi-numi-shop

Stable integration branch:

- main

Planned GitHub repository:

- pav4o71/nomi-numi-shop

Planned visibility:

- PRIVATE

## 2. Runtime

Node:

- 24.19.0

pnpm:

- 11.26.0

Runtime pin files:

- .nvmrc
- .node-version

Do not change the machine-wide NVM default merely for this project.

## 3. Development environment

Application:

- 127.0.0.1:3100

PostgreSQL:

- 127.0.0.1:55432

Database:

- nomi_numi_shop_dev

Compose project:

- nomi-numi-shop-dev

Lifecycle helper:

    pnpm db:dev:up
    pnpm db:dev:status
    pnpm db:dev:stop

Drizzle migrate:

    pnpm db:dev:migrate

## 4. Test / E2E environment

Application:

- 127.0.0.1:3101

PostgreSQL:

- 127.0.0.1:55433

Database:

- nomi_numi_shop_test

Compose project:

- nomi-numi-shop-test

Lifecycle helper:

    pnpm db:test:up
    pnpm db:test:status
    pnpm db:test:stop

Drizzle migrate:

    pnpm db:test:migrate

Schema generation / migration consistency (no live DB required):

    pnpm db:generate
    pnpm db:check

## 5. Mailpit

SMTP:

- 127.0.0.1:11025

Web UI:

- 127.0.0.1:18025

Mailpit is reserved but not provisioned yet.

## 6. Environment files

Real environment values are never committed.

Phase 1D/1E local database credentials (tooling only):

- ignored `var/docker/dev.env`
- ignored `var/docker/test.env`

Generated once by `scripts/db-local.sh`, reused on subsequent starts,
different between development and test, and never printed by normal
lifecycle or migrate commands. Application runtime must not read these
files directly.

Expected pattern later for application secrets:

- `.env.example`
- ignored local development environment
- ignored local test environment

Production secrets are outside the current phase.

## 7. Local network exposure

Local infrastructure should bind to:

- 127.0.0.1

unless an explicitly approved requirement needs wider network exposure.

Development PostgreSQL and Mailpit must not be exposed on 0.0.0.0 by
default.

PostgreSQL host ports bind only as:

- `127.0.0.1:55432`
- `127.0.0.1:55433`

## 8. Protected external database

Existing container:

- beautybook3-pg

Existing host port:

- 5433

This resource does not belong to nomi-numi-shop.

Unknown Docker resources are protected. Ownership must be proven before
mutation.

See:

- docs/PROTECTED_RESOURCES.md

## 9. Preflight modes

Currently supported:

- phase0
- baseline-local
- baseline-remote
- phase1
- integration

Mode meaning:

- `phase0` — before the first commit and before a Git remote exists
- `baseline-local` — committed local foundation before a Git remote exists
- `baseline-remote` — committed foundation synchronized with canonical GitHub main
- `phase1` — safe feature-branch development context for Phase 1 work
- `integration` — clean, synchronized stable `main` after application files exist

### phase1 invariants

`phase1` is the preflight mode for approved non-`main` development branches.

It requires:

- canonical repository root and working directory
- current branch matching exactly one of:
  - `feature/*`
  - `fix/*`
  - `chore/*`
  - `docs/*`
- current branch is not `main`
- detached HEAD is refused
- exactly one canonical `origin` remote
- immutable Phase 0 baseline remains an ancestor of `HEAD`
- current `origin/main` is an ancestor of `HEAD`
- repository-local `core.hooksPath=.githooks`
- `.githooks/pre-push` exists and is executable
- Node `24.19.0` and pnpm `11.26.0`
- protected external resources remain external
- safety documents and mandatory Cursor rules remain present

It does not require:

- application artifacts to be absent
- a clean working tree during active implementation
- the work branch to have an upstream before its first push
- `HEAD` to equal `origin/main`

Dirty working trees are reported as INFO only. Beginning-of-step
workflows remain responsible for requiring a clean tree when appropriate.

Reserved webshop ports for `phase1`:

- free → PASS
- occupied by a provably nomi-numi-shop-owned process or owned Compose
  project (`nomi-numi-shop-dev` / `nomi-numi-shop-test`) → PASS
- occupied with unproven/unknown ownership → FAIL closed

Do not fetch remotes inside preflight. Refresh `origin` before a
phase-start check when ancestry must be evaluated against current main.

### integration invariants

`integration` is the permanent stable-`main` gate after application
foundation files exist.

It requires:

- canonical repository root and working directory
- current branch exactly `main`
- detached HEAD refused
- exactly one canonical `origin` remote
- local `main` upstream exactly `origin/main`
- immutable Phase 0 baseline remains an ancestor of `HEAD`
- clean working tree (tracked and untracked; ignored generated files do
  not make Git dirty)
- repository-local `core.hooksPath=.githooks`
- `.githooks/pre-push` exists and is executable
- Node `24.19.0` and pnpm `11.26.0`
- `package.json` present with:
  - `name = nomi-numi-shop`
  - `private = true`
  - `packageManager = pnpm@11.26.0`
  - `engines.node = 24.19.0`
  - `engines.pnpm = 11.26.0`
- `pnpm-lock.yaml` present
- protected external resources remain external
- safety documents and mandatory Cursor rules remain present

Before running `integration`, the operator must refresh remote refs:

    git fetch --prune origin

Preflight does not fetch. The three-way synchronization invariant is:

    local HEAD = origin/main = live remote refs/heads/main

Reserved webshop ports for `integration` use the same ownership
semantics as `phase1`:

- free → PASS
- occupied by a provably nomi-numi-shop-owned process or owned Compose
  project (`nomi-numi-shop-dev` / `nomi-numi-shop-test`) → PASS
- occupied with unproven/unknown ownership → FAIL closed

Historical Phase 0 modes retain their original semantics, including the
requirement to run on `main` and to expect application artifacts to be
absent. `phase1` continues to reject `main`.

Currently unsupported:

- dev
- test
- ci
- production

Unsupported modes must fail instead of making assumptions.

Additional modes are added only after those environments exist and have
defined invariants.

## 10. Production

Current status:

UNDECIDED — INSPECT HETZNER LATER

No existing:

- server
- domain
- DNS configuration
- reverse proxy
- production database
- production storage
- production Docker stack

is considered owned by nomi-numi-shop until explicitly audited and
documented.
