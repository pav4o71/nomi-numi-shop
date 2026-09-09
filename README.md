# Nomi Numi Shop

Custom ecommerce platform for a multi-category gifting and merchandise
store.

## Current phase

Phase 1A — Application Foundation

Application package scaffolding has not been created yet. Webshop
databases, production infrastructure, and real external integrations
remain deferred.

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

Exact application dependency versions will be pinned when Phase 1
creates package.json and pnpm-lock.yaml.

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

For current feature-branch development, run from the canonical
repository root:

    ./scripts/preflight.sh phase1

Historical Phase 0 preflight modes remain documented in:

`docs/ENVIRONMENTS.md`

A failed preflight is evidence to investigate.

Do not modify or bypass a safety guard merely to make it pass.

## Production

Production infrastructure and the public domain are currently undecided.

A later dedicated phase will inspect the available Hetzner
infrastructure before any production deployment decision is made.
