---
description: Mandatory database target verification, migration safety, test isolation, and atomic upserts.
alwaysApply: true
---

# Database Safety & Guidelines

Read `docs/PROTECTED_RESOURCES.md` for owned database/resource identities and `.agents/rules/00-project-boundary.md` for mutation boundaries. Never run migrations, seeds, resets, truncation, destructive tests, or other database mutations against an unverified target.

## General Postgres & Drizzle Rules

- PostgreSQL constraints are the final authority for integrity. Drizzle types do not replace database constraints.
- Preserve explicit `CHECK`, `NOT NULL`, `UNIQUE`, foreign-key, and exclusion constraints.
- Test concurrent updates where a business invariant is involved.
- Name constraints explicitly.

## Target verification

Before a database mutation, verify the project root, selected environment, database host, port, name, and resource ownership. A mismatch means STOP. Do not guess, silently rewrite the target, or bypass a guard.

Development operations must target the owned DEV database recorded in `docs/PROTECTED_RESOURCES.md`. Port `5433` must never be accepted as a Nomi Numi database target. Never run destructive commands until the target is verified as disposable.

## Migrations

Never use `drizzle-kit push` against any database, including isolated TEST databases. Do not invoke it directly, through package scripts, or through another wrapper. Verified ownership, disposable data, or permission to apply migrations does not make schema push an approved workflow.

Use the established local project wrappers: `pnpm db:generate`, `pnpm db:dev:migrate`, and `pnpm db:test:migrate`. Review generated SQL and metadata before application. Never manually rewrite applied migrations.

Migrations remain Drizzle-managed; do not run Better Auth migrate. Validate migration consistency through the established check commands documented in `docs/TESTING.md`. Do not use an uncontrolled schema mutation or a raw SQL console as a migration shortcut.

Generate, review, and commit migration artifacts only within the authorization rules in `.agents/rules/04-workflow.md`.

## Atomic Upserts

- An `INSERT ... ON CONFLICT` candidate row must satisfy applicable insertion constraints.
- **Never encode an operation or delta as an invalid candidate row.**
  - **BAD**: `INSERT INTO inventory (product_id, on_hand) VALUES ($1, -3) ON CONFLICT DO UPDATE SET on_hand = inventory.on_hand + EXCLUDED.on_hand;` (Will fail a non-negative CHECK constraint).
  - **GOOD**: Use a valid candidate row and perform the operation in the update expression, or initialize with `ON CONFLICT DO NOTHING` and then update inside one transaction. The final update must still satisfy the database constraint.

## Isolated TEST workflow

Before any data-mutating automated test or local TEST database operation, verify the canonical repository root, TEST environment, database identity, and ownership of the resources used by the established project tooling.

The only approved workstation TEST database is `nomi_numi_shop_test`, exposed at `127.0.0.1:55433` in Compose namespace `nomi-numi-shop-test`. Never target DEV, production, an unknown database, or protected host port `5433`. Do not substitute another target or bypass a failed guard.

Apply local TEST migrations through `pnpm db:test:migrate`. When an authorized task requires rebuilding the disposable TEST database, use only:

`pnpm db:test:rebuild -- --confirm RESET-NOMI-TEST-DATABASE`

The confirmation token is required and is not a credential. Its presence does not itself authorize a rebuild. The wrapper must verify its fixed TEST identity, refuse unexpected active sessions without terminating connections, and reapply committed migrations. Do not call the internal runner directly or use arbitrary drop, truncate, or reset commands.

The guarded wrappers' verified container-internal loopback connection at port `5432` implements this same owned TEST target; it is not authorization to connect to an unrelated PostgreSQL service.

Existing GitHub-hosted migration validation remains limited to its verified CI job and disposable runner-local TEST database through `pnpm db:migrate:ci`. Do not invoke that command locally or use its CI exception to bypass workstation safety rules.

Read-only and planning tasks do not authorize migrations, rebuilds, seeds, data-mutating tests, or container lifecycle operations.

There is no DEV reset workflow. Tests must never clear or reset the development database. Start the matching owned PostgreSQL environment only when lifecycle operations are authorized; stopping containers preserves named volumes.

## Local credentials, bootstrap, and fixtures

Keep local credentials under ignored `var/docker/` and runtime secrets in ignored `.env.local`; never commit or expose them. Preserve ignore protections and follow `.agents/rules/05-security.md`.

First-admin bootstrap is DEV/TEST-only and requires the established `pnpm auth:bootstrap-first-admin` wrapper, explicit environment/email arguments, and `--confirm PROMOTE-FIRST-NOMI-ADMIN`. This command does not authorize production bootstrap or unrelated role changes.

DEV catalog fixtures use only `pnpm catalog:seed:dev -- --confirm SEED-NOMI-DEV-CATALOG` against verified owned DEV. Run the complete read-only fixture preflight before writes, create only missing matching fixture state, no-op when already matching, and abort on conflicts without overwrite, delete, or truncate. Production seed/import is unsupported. Command examples and confirmation tokens do not authorize executing these operations.

## Production

Production database details are not defined. Do not infer credentials or reuse an existing database.

A later production migration policy must require backup verification, explicit production target verification, migration review, and rollback/recovery planning. These requirements do not authorize production work; the project boundary still requires a separately authorized production phase and infrastructure audit.
