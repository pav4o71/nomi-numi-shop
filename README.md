# Nomi Numi Shop

Custom ecommerce platform for a multi-category gifting and merchandise
store.

## Current phase

Post-Phase-3D storefront presentation + hardening

Phase 0 through Phase 3D are complete. The repository includes isolated
local PostgreSQL, Drizzle ORM, committed migrations, a guarded TEST-only
rebuild workflow, Better Auth (`better-auth@1.7.3` + matching Drizzle
adapter), server-owned `customer`/`admin` roles with exact-role
authorization primitives, the portable PR quality gate with SHA-pinned
actions and minimal permissions, CodeQL security analysis, Dependabot
configuration, the Phase 2C0 auth design lock, project-owned Mailpit with
a local email transport abstraction, the email/password backend lifecycle
(verification, reset, session policy), the Better Auth browser client
with customer auth UI, guarded DEV/TEST-only first-admin bootstrap,
minimal protected customer/admin surfaces, Phase 2C6 auth security + E2E
closure, the Phase 2D Store + Catalog blueprint
(`docs/STORE_CATALOG.md`), the Phase 3A foundational catalog schema
(migration `0003_phase3a_catalog_schema`), the Phase 3B catalog domain
under `src/catalog/`, Phase 3C deterministic DEV catalog fixtures
(`dev-fixture-*` / `DEVFIX-*`) and TEST builders/factories, and Phase 3D
public catalog reads with App Router pages.

Storefront presentation adds polished public catalog pages (`/products`,
`/categories`, `/collections` with detail routes), cozy homepage sections,
and static content pages (`/about`, `/faq`, `/shipping`, `/returns`,
`/contact`, `/legal/privacy`, `/legal/terms`, `/legal/imprint`, `/gifts`,
`/lookbook`, `/size-guide`) with placeholder/template content. Admin
catalog HTTP/UI, cart, checkout, and inventory runtime remain later phases.

Hardening progress includes SHA-pinned GitHub Actions (all third-party
actions pinned to full commit SHAs), minimal workflow permissions
(`permissions: {}` at workflow level; granular job permissions), CodeQL
security analysis for JavaScript/TypeScript and GitHub Actions workflows,
and Dependabot configuration for npm and github-actions dependencies.
Branch protection is live on `main` and requires the `PR Quality Gate`
check to pass before merge (strict, enforced for admins, no force push).
See `docs/GIT_WORKFLOW.md` for complete protection rules. Dependabot may
open major GitHub Actions version bumps; review SHA pins carefully before
merging major action updates.

Local auth runtime uses ignored `.env.local`
(`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, plus Mailpit
email transport keys), `/api/auth/*`, public UI routes under
`/signup`, `/login`, `/logout`, `/check-email`, `/email-verified`,
`/forgot-password`, and `/reset-password`, plus protected
`/account` and `/admin`. Social login is not enabled yet. Public catalog
pages use the lazy runtime DB client (`DATABASE_URL` only; no Better Auth
secrets required for browsing); auth connects lazily when auth routes
are invoked and still validates Better Auth secrets separately.

First-admin bootstrap (DEV/TEST only; confirmation required):

    pnpm auth:bootstrap-first-admin -- \
      --env <dev|test> --email <email> --confirm PROMOTE-FIRST-NOMI-ADMIN

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
- docs/STORE_CATALOG.md
- docs/DATABASE.md
- docs/AUTH.md
- docs/SECURITY.md
- docs/TESTING.md
- docs/ENVIRONMENTS.md
- docs/PROTECTED_RESOURCES.md

Cursor project rules:

- .cursor/rules/

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

Catalog tables live in `src/db/schema/catalog.ts` (Phase 3A).
Catalog domain services live in `src/catalog/` (Phase 3B).
DEV catalog fixtures + seed live under `src/catalog/fixtures/` (Phase 3C).
Public catalog reads live under `src/catalog/public/` (Phase 3D).
Better Auth tables live in `src/db/schema/auth.ts`:

- `drizzle/0001_phase2a_better_auth.sql` — core auth tables
- `drizzle/0002_phase2b_auth_role.sql` — server-owned `user.role`
- `drizzle/0003_phase3a_catalog_schema.sql` — foundational catalog schema

Migrations remain Drizzle-managed (do not run Better Auth migrate).
Application roles are `customer` (default) and `admin`. See `docs/AUTH.md`.

Local auth environment template (placeholders only): `.env.example`
Runtime secrets belong in ignored `.env.local` only.

TEST rebuild (destructive, TEST only; DEV is never reset by this command):

    pnpm db:test:rebuild -- --confirm RESET-NOMI-TEST-DATABASE

The confirmation token is required and is not a secret. Direct invocation
of the internal rebuild runner is refused without the public wrapper.
The command drops and recreates only `nomi_numi_shop_test`, then reapplies committed
migrations. Unexpected active TEST sessions cause refusal; connections
are not terminated. There is no `db:dev:reset`, generic drop tool, or
raw SQL console. Production and host port `5433` cannot be selected.

DEV catalog fixtures (Phase 3C; development data only):

    pnpm catalog:seed:dev -- --confirm SEED-NOMI-DEV-CATALOG

The command targets project-owned DEV only (`127.0.0.1:55432` /
`nomi_numi_shop_dev`). It runs a complete read-only fixture preflight
before writes, creates only missing fixture state, no-ops when already
matching, and aborts on conflict without overwrite/delete/truncate.
Production seed/import is unsupported. Public catalog pages
(`/products`, `/categories`, `/collections`) read published data via
`PublicCatalogReads` with temporary USD.

Local credentials remain under ignored `var/docker/` and must never be
committed. Start the matching PostgreSQL environment before migrate or
TEST rebuild. Stopping containers preserves named volumes. Host port
`5433` belongs to another project and must not be used.

## Local Mailpit (Phase 2C1)

Compose project: `nomi-numi-shop-dev` (same owned DEV namespace as
PostgreSQL; separate compose file and project-owned `mailpit_net`)

- SMTP: `127.0.0.1:11025`
- UI: `http://127.0.0.1:18025`

Lifecycle (only through project wrappers):

    pnpm email:up
    pnpm email:status
    pnpm email:stop

Local email transport placeholders live in `.env.example`
(`EMAIL_PROVIDER=mailpit`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`).
Runtime values belong in ignored `.env.local`. The Mailpit provider
abstraction lives under `src/email/` and is wired into Better Auth
verification and password-reset in Phase 2C2. Do not start Mailpit with
raw `docker compose` outside `scripts/email-local.sh`.

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
