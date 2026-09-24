---
description: Mandatory repository, resource ownership, and cross-project safety boundary for nomi-numi-shop.
alwaysApply: true
---

# Project Boundary & Resource Ownership

You are operating on `nomi-numi-shop`.

Canonical local repository root:

`/home/pav4o71/Projects/nomi-numi-shop`

Before modifying anything, confirm that the Git root is exactly the canonical repository root.

If it is not, STOP.

Do not repair, initialize, relocate, clean, reset, or modify another repository.

Read and obey:

- `AGENTS.md`
- `docs/PROTECTED_RESOURCES.md`

## Core safety rule

Unknown resources are protected resources.

Prove project ownership before mutation.

If ownership cannot be proven, stop and report the ambiguity.

## External projects

Never modify sibling repositories including:

- `/home/pav4o71/Projects/beautybook3`
- `/home/pav4o71/Projects/beautybook3-current`
- `/home/pav4o71/Projects/biz-research`
- `/home/pav4o71/Projects/game_of_night`
- `/home/pav4o71/Projects/thirty-three`

Read-only inspection is permitted only when necessary for diagnostics.

## Protected external Docker/database resource

The Docker container:

`beautybook3-pg`

and host port:

`5433`

do not belong to this project.

Never stop, restart, remove, rename, reconfigure, migrate against, repurpose, or otherwise mutate that container or port.

## Nomi Numi local resources

Reserved development endpoints:

- application: `127.0.0.1:3100`
- E2E application: `127.0.0.1:3101`
- development PostgreSQL: `127.0.0.1:55432`
- test PostgreSQL: `127.0.0.1:55433`
- Mailpit SMTP: `127.0.0.1:11025`
- Mailpit UI: `127.0.0.1:18025`

Expected databases:

- `nomi_numi_shop_dev`
- `nomi_numi_shop_test`

Expected Docker Compose namespaces:

- `nomi-numi-shop-dev`
- `nomi-numi-shop-test`

Do not silently substitute standard or unrelated ports.

## Mutation restrictions

Do not perform destructive or external mutations merely to resolve an unexpected state.

Do not use destructive shortcuts such as:

- `git reset --hard`
- `git clean -fd`
- force push
- Docker prune commands
- unknown Docker volume deletion
- `docker compose down -v`
- database dropping
- filesystem deletion outside this repository

unless the action is explicitly authorized and project ownership is proven.

Investigate unexpected state before attempting repair.

## Git discipline

`main` is the stable integration branch.

Normal implementation belongs on a narrowly scoped non-`main` branch such as:

- `feature/...`
- `fix/...`
- `chore/...`
- `docs/...`

Before changing code, inspect the repository root, current branch, Git status, relevant diff, and relevant history.

Do not commit, push, merge, deploy, or create remote resources unless the current task explicitly authorizes it.

## Database boundary

Never run migrations, seeds, resets, truncation, destructive tests, or other database mutations against an unverified target.

Development database operations must target the owned development database.

Automated data-mutating tests must target the owned isolated test database.

Port `5433` must never be accepted as a Nomi Numi database target.

Additional database safety requirements are defined in:

`.agents/rules/02-database-safety.md`

## Secrets

Never expose or commit secrets, credentials, private keys, tokens, customer data, or production data.

Do not weaken `.gitignore`, `.cursorignore`, or related protections in order to access secrets.

## Production

Production infrastructure is not selected yet.

Do not assume any existing server, domain, DNS record, reverse proxy, database, Docker resource, credential, or deployment belongs to this project.

Do not create or mutate production infrastructure unless a later explicitly authorized production phase permits it.

## Failure behavior

When a safety check fails or ownership is ambiguous:

STOP.

Report what was found.

Do not guess and do not automatically repair external state.
