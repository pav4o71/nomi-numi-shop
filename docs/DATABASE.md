# Nomi Numi Shop — Database Baseline

## 1. Database engine

Database:

- PostgreSQL 16.15 (local Compose image: `postgres:16.15-bookworm`)

ORM (Phase 1E):

- drizzle-orm `0.45.2`
- drizzle-kit `0.31.10`
- PostgreSQL driver: `postgres` (postgres.js) `3.4.9` via `drizzle-orm/postgres-js`

Schema evolution:

- committed SQL migrations under `drizzle/`
- migration-first workflow only
- `drizzle-kit push` is not the project strategy

Phase 1E established the ORM/migration mechanism. Phase 2A adds Better
Auth core tables (`user`, `session`, `account`, `verification`) through
a reviewed Drizzle migration. Phase 2B extends `user` with a
server-owned `role` column (`customer` | `admin`, default `customer`).
Phase 3A adds foundational catalog tables (`store_settings`, categories,
collections, products, variants, options, prices, media metadata) through
migration `0003_phase3a_catalog_schema`. Phase 3B adds the catalog domain
repository/service layer in `src/catalog/` without schema changes.
Phase 3C adds deterministic DEV fixtures (`src/catalog/fixtures/`) and
TEST factories; it does not add schema/migrations or store_settings seed.
Phase 3D adds public catalog reads (`src/catalog/public/`) and App Router
storefront catalog pages; no new migrations. Inventory ledger tables
remain absent. Public catalog pages use the lazy runtime DB client
(temporary USD); auth remains on `/api/auth`.

## 2. Development database

Compose project:

- nomi-numi-shop-dev

Host:

- 127.0.0.1

Host port:

- 55432

Database:

- nomi_numi_shop_dev

Lifecycle:

    pnpm db:dev:up
    pnpm db:dev:status
    pnpm db:dev:stop

Migrate:

    pnpm db:dev:migrate

## 3. Test database

Compose project:

- nomi-numi-shop-test

Host:

- 127.0.0.1

Host port:

- 55433

Database:

- nomi_numi_shop_test

Lifecycle:

    pnpm db:test:up
    pnpm db:test:status
    pnpm db:test:stop

Migrate:

    pnpm db:test:migrate

Guarded TEST rebuild (drops/recreates only `nomi_numi_shop_test`):

    pnpm db:test:rebuild -- --confirm RESET-NOMI-TEST-DATABASE

The TEST database is disposable. DEV is not reset by Phase 1F.

Development and test data must remain isolated. They use separate Compose
projects, named volumes, database names, local credentials, and migration
bookkeeping.

## 4. Drizzle layout

Canonical schema export:

- `src/db/schema/index.ts`

Drizzle Kit config:

- `drizzle.config.ts`

Committed migrations:

- `drizzle/`
- `drizzle/0000_phase1e_baseline.sql`
- `drizzle/0001_phase2a_better_auth.sql` (Better Auth core tables)
- `drizzle/0002_phase2b_auth_role.sql` (`user.role` authorization field)
- `drizzle/0003_phase3a_catalog_schema.sql` (Phase 3A catalog foundation)

Canonical schema modules:

- `src/db/schema/auth.ts` (Better Auth; isolated)
- `src/db/schema/catalog.ts` (Phase 3A catalog tables)

Guarded local helper:

- `scripts/drizzle-local.sh`

Migration runner (no password on argv):

- `scripts/drizzle-migrate.mjs`

Credential parsing for tooling:

- `scripts/drizzle-credentials.mjs`

Guarded TEST rebuild:

- `scripts/db-test-rebuild.sh`
- `scripts/db-test-rebuild.mjs`

Commands:

    pnpm db:generate
    pnpm db:check
    pnpm db:dev:migrate
    pnpm db:test:migrate
    pnpm db:test:rebuild -- --confirm RESET-NOMI-TEST-DATABASE

`generate` and `check` do not require a live database.
`migrate` requires the matching owned PostgreSQL environment already up
and healthy. `db:test:rebuild` requires the TEST environment already up
and healthy; it never starts or mutates DEV.

Hardened migrate model:

1. select fixed environment `dev` or `test`
2. verify the exact deterministic PostgreSQL container (labels, image,
   image ID, single owned network, owned data volume at
   `/var/lib/postgresql/data`, healthy/running)
3. verify Phase 1D host publication remains exact and loopback-only
   (`127.0.0.1:55432` or `127.0.0.1:55433` -> container `5432/tcp`)
4. capture that container's immutable Docker ID
5. launch disposable `node:24.19.0-bookworm-slim` with
   `--network container:<exact-id>`
6. inside that namespace, connect only to `127.0.0.1:5432`
7. validate `current_database()` / `current_user` / PostgreSQL major 16
   on that same connection
8. run Drizzle migrate on that same connection

Generic Compose DNS aliases such as `postgres` are not used for SQL
transport. Host ports prove Phase 1D configuration; they are not the
migration SQL transport. Protected host port `5433` remains forbidden.

## 5. Local credentials and persistence

Credentials are generated once under ignored local files:

- `var/docker/dev.env`
- `var/docker/test.env`

These files are local tooling infrastructure. Application runtime code
must not import or read them directly.

Passwords must never be committed or pasted into documentation.

PostgreSQL data uses environment-specific Docker named volumes. Stopping
containers preserves persistent data.

Public destructive tooling is TEST-only. There is no `db:dev:reset`,
`db:dev:rebuild`, `db:reset`, `db:drop`, or generic SQL console.

Guarded TEST rebuild:

    pnpm db:test:rebuild -- --confirm RESET-NOMI-TEST-DATABASE

The exact confirmation token `RESET-NOMI-TEST-DATABASE` is required and
is not a secret. Both the public wrapper and the internal rebuild runner
require that token. Direct invocation of the runner without the wrapper
is refused. The command drops and recreates only
`nomi_numi_shop_test` on the owned TEST cluster, then reapplies committed
migrations through the existing Phase 1E migrate path. DEV is never
selected. Unexpected active TEST sessions cause refusal; the rebuild
does not terminate other connections. Protected host port `5433` cannot
be targeted. Production is not a rebuild target.

## 6. Protected external database

Host port:

- 5433

belongs to another project (`beautybook3-pg`).

Webshop tooling must never use that port as its database target.

Unknown Docker containers, networks, and volumes are protected resources.
Prove ownership before mutation.

See:

- docs/PROTECTED_RESOURCES.md

## 7. Migration policy

Preferred lifecycle:

1. modify canonical schema under `src/db/schema/`
2. run `pnpm db:generate`
3. inspect generated SQL
4. commit the migration
5. apply with `pnpm db:dev:migrate` / `pnpm db:test:migrate`

Do not use `drizzle-kit push` as the normal schema workflow.

Once a migration is merged to `main` and used, do not edit it casually.
Future schema changes should create new migrations.

Before migration mutation verify:

- canonical repository root
- environment is exactly `dev` or `test`
- database host/port/name/user match the fixed allowlist
- owned Nomi Docker resources
- live identity via `current_database()` / role / PostgreSQL major 16

Phase 1E baseline migration:

- `drizzle/0000_phase1e_baseline.sql`
- infrastructure-only (`SELECT 1`) to establish Drizzle bookkeeping
- no domain tables

## 8. Naming convention

Use one consistent PostgreSQL naming convention.

Recommended:

- snake_case tables
- snake_case columns
- snake_case indexes
- snake_case constraints

Do not casually mix naming styles.

## 9. Time

Persist authoritative timestamps in UTC.

Presentation may convert timestamps to the appropriate user/store
timezone.

Do not store ambiguous local timestamps for commerce events.

## 10. Conceptual schema domains

Authentication:

- users
- sessions
- accounts
- verification

Catalog (authoritative conceptual model: `docs/STORE_CATALOG.md`):

- store_settings
- products
- product_variants
- product_options
- product_option_values
- product_variant_option_values
- product_media
- categories
- collections
- product_categories
- collection_products

Pricing:

- variant_prices

Inventory:

- inventory_balances
- inventory_reservations
- inventory_movements
- suppliers
- fulfillment_configuration

Commerce:

- carts
- cart_items
- orders
- order_items
- addresses
- payments
- shipments
- fulfillments

Customers:

- wishlists
- wishlist_items

Reviews:

- reviews
- review_media
- review_reports

Promotions:

- promotions
- promotion_codes
- promotion_usage

CMS:

- pages
- navigation
- homepage_sections
- site_settings

Custom video:

- custom_video_requests
- private_media_metadata

Phase 3A implements the foundational catalog subset listed above
(excluding inventory ledger tables) in `src/db/schema/catalog.ts` with
migration `0003_phase3a_catalog_schema`. Inventory, commerce, CMS,
reviews, and custom-video tables remain deferred to their phases.
Authoritative catalog contract: `docs/STORE_CATALOG.md`.

## 11. Core database invariants

Schema design must protect:

- unique sellable SKU where applicable
- explicit currency
- integer monetary values
- variant-level inventory
- customer ownership
- order ownership
- promotion usage integrity
- review eligibility
- private media ownership
- historical order integrity

## 12. Historical orders

Historical order items must not depend on mutable catalog data to
reconstruct the commercial purchase.

Order-item snapshots preserve the commercial facts required for order
history.

Editing or archiving a catalog item must not rewrite historical orders.

## 13. Product deletion

Products/variants referenced by commerce history should normally be:

- archived
- disabled
- hidden from sale

rather than hard deleted.

Hard deletion must never destroy required historical order data.

## 14. Inventory integrity

Inventory-changing operations must be auditable.

Concurrency controls must prevent overselling.

Critical inventory/order operations should use atomic SQL and database
transactions where appropriate.

## 15. Foreign keys and deletion behavior

Cascade deletion must be chosen deliberately.

Do not apply broad ON DELETE CASCADE behavior to commerce history
without proving that required records cannot be lost.

Particular caution is required for:

- orders
- order_items
- payments
- inventory movements
- audit history

## 16. Production

Production migration rules are defined later. Local tooling must never
target production or foreign databases.
