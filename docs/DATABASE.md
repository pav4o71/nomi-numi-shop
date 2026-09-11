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

Phase 1E establishes the ORM/migration mechanism only. It does not create
ecommerce domain tables and does not wire the Next.js application to
PostgreSQL at runtime.

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

Guarded local helper:

- `scripts/drizzle-local.sh`

Migration runner (no password on argv):

- `scripts/drizzle-migrate.mjs`

Credential parsing for tooling:

- `scripts/drizzle-credentials.mjs`

Commands:

    pnpm db:generate
    pnpm db:check
    pnpm db:dev:migrate
    pnpm db:test:migrate

`generate` and `check` do not require a live database.
`migrate` requires the matching owned PostgreSQL environment already up
and healthy.

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
containers preserves persistent data. Destructive reset/remove tooling is
intentionally deferred to Phase 1F.

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

Catalog:

- products
- product_variants
- product_options
- product_option_values
- product_media
- categories
- collections
- product_categories
- product_collections

Pricing:

- variant_prices
- currency

Inventory:

- inventory_state
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

These names are conceptual. Actual table design is reviewed during the
corresponding schema phase. Phase 1E does not create product schema.

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
