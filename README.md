# Nomi Numi Shop

Custom ecommerce platform for a multi-category gifting and merchandise
store.

## Current phase

Phase 1F — Database / Test / Destructive-Operation Safety

Phase 0 through Phase 1E are complete. The repository now includes
isolated local PostgreSQL environments, Drizzle ORM, committed
migrations, and a guarded TEST-only database rebuild workflow.

The Next.js storefront still does not require PostgreSQL at runtime.
Application domain schema (auth, catalog, commerce) remains later.
Phase 2A starts authentication.

## Initial business scope

Initial markets:

- Philippines
- United States

Initial currencies:

- PHP
- USD

Initial language:

- English

Expected initial scale:

- approximately 500 orders per month

## Planned technology stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- PostgreSQL 16
- Drizzle ORM
- Better Auth
- Zod
- pnpm
- Docker Compose
- Mailpit
- Vitest
- Playwright

Architecture style:

- modular monolith

Exact application dependency versions are pinned in package.json and
pnpm-lock.yaml.

## Development principles

- one canonical repository
- stable main branch
- narrowly scoped feature/fix branches
- small validated implementation steps
- isolated development and test environments
- server-authoritative commerce logic
- explicit money and currency handling
- no cross-project mutation
- mock payment and shipping integrations first
- production selected only after a separate infrastructure audit

## Authoritative project documentation

Before implementation, read the documents relevant to the current task:

- AGENTS.md
- docs/PROJECT_PLAN.md
- docs/ARCHITECTURE.md
- docs/COMMERCE_RULES.md
- docs/DATABASE.md
- docs/SECURITY.md
- docs/TESTING.md
- docs/ENVIRONMENTS.md
- docs/PROTECTED_RESOURCES.md

Cursor project rules:

- .cursor/rules/

Bugbot review rules:

- .cursor/BUGBOT.md

## Local PostgreSQL and Drizzle

Development:

- Compose project: `nomi-numi-shop-dev`
- Host: `127.0.0.1:55432`
- Database: `nomi_numi_shop_dev`

Test:

- Compose project: `nomi-numi-shop-test`
- Host: `127.0.0.1:55433`
- Database: `nomi_numi_shop_test`

Lifecycle:

    pnpm db:dev:up
    pnpm db:dev:status
    pnpm db:dev:stop
    pnpm db:test:up
    pnpm db:test:status
    pnpm db:test:stop

Migrations (migration-first; no `drizzle-kit push`):

    pnpm db:generate
    pnpm db:check
    pnpm db:dev:migrate
    pnpm db:test:migrate

Canonical schema path: `src/db/schema/`
Committed migrations: `drizzle/`

TEST rebuild (destructive, TEST only; DEV is never reset by this command):

    pnpm db:test:rebuild -- --confirm RESET-NOMI-TEST-DATABASE

The confirmation token is required and is not a secret. Direct invocation
of the internal rebuild runner is refused without the public wrapper.
The command drops and recreates only `nomi_numi_shop_test`, then reapplies committed
migrations. Unexpected active TEST sessions cause refusal; connections
are not terminated. There is no `db:dev:reset`, generic drop tool, or
raw SQL console. Production and host port `5433` cannot be selected.

Local credentials remain under ignored `var/docker/` and must never be
committed. Start the matching PostgreSQL environment before migrate or
TEST rebuild. Stopping containers preserves named volumes. Host port
`5433` belongs to another project and must not be used.

## Preflight

On approved `feature/*`, `fix/*`, `chore/*`, or `docs/*` development
branches, run from the canonical repository root:

    ./scripts/preflight.sh phase1

On synchronized stable `main`, after refreshing remotes:

    git fetch --prune origin
    ./scripts/preflight.sh integration

Historical Phase 0 preflight modes remain documented in:

`docs/ENVIRONMENTS.md`

A failed preflight is evidence to investigate.

Do not modify or bypass a safety guard merely to make it pass.

## Production

Production infrastructure and the public domain are currently undecided.

A later dedicated phase will inspect the available Hetzner
infrastructure before any production deployment decision is made.
