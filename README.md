# Nomi Numi Shop

Custom ecommerce platform for a multi-category gifting and merchandise
store.

## Current phase

Phase 1A — Application Foundation

Phase 0 is complete. The minimal Next.js application foundation now
exists, including App Router, TypeScript, Tailwind, ESLint, and
Prettier.

Ecommerce and domain functionality have not been implemented yet.
Databases, authentication, payments, shipping, admin, catalog, and
other business modules remain future phases. Production infrastructure
and real external integrations remain deferred.

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
