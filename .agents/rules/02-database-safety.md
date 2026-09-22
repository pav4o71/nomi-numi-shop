---
description: Mandatory database target verification, migration safety, test isolation, and atomic upserts.
alwaysApply: true
---

# Database Safety & Guidelines

## General Postgres & Drizzle Rules
- PostgreSQL constraints are the final authority for integrity. Drizzle types do not replace database constraints.
- Preserve explicit `CHECK`, `NOT NULL`, `UNIQUE`, foreign-key, and exclusion constraints.
- Test concurrent updates where a business invariant is involved.
- Name constraints explicitly.

## Migrations
- Required migration policy: use `pnpm drizzle-kit generate` and `pnpm drizzle-kit migrate`.
- Do not manually rewrite applied migrations.
- Never use `drizzle-kit push`.

## Atomic Upserts
- An `INSERT ... ON CONFLICT` candidate row must satisfy applicable insertion constraints.
- **Never encode an operation or delta as an invalid candidate row.**
  - **BAD**: `INSERT INTO inventory (product_id, on_hand) VALUES ($1, -3) ON CONFLICT DO UPDATE SET on_hand = inventory.on_hand + EXCLUDED.on_hand;` (Will fail a non-negative CHECK constraint).
  - **GOOD**: Use a valid candidate row and perform the operation in the update expression, or initialize with `ON CONFLICT DO NOTHING` and then update inside one transaction. The final update must still satisfy the database constraint.

## Destructive Commands & Test Isolation
- Never run destructive database commands until the target is verified as disposable.
- Data-mutating automated tests must use `nomi_numi_shop_test` on `127.0.0.1:55433`. Never target the development database.
- Safe test database rebuilds are allowed using `pnpm db:test:rebuild -- --confirm RESET-NOMI-TEST-DATABASE`. Do not use arbitrary drop/truncate commands outside of established scripts.
