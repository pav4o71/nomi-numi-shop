# Nomi Numi Shop — Database Baseline

## 1. Database engine

Database:

- PostgreSQL 16

ORM:

- Drizzle ORM

Schema evolution:

- reviewed migrations

## 2. Development database

Host:

- 127.0.0.1

Host port:

- 55432

Database:

- nomi_numi_shop_dev

## 3. Test database

Host:

- 127.0.0.1

Host port:

- 55433

Database:

- nomi_numi_shop_test

Development and test data must remain isolated.

## 4. Protected external database

Host port:

- 5433

belongs to another project.

Webshop tooling must never use that port as its database target.

See:

- docs/PROTECTED_RESOURCES.md

## 5. Naming convention

Use one consistent PostgreSQL naming convention.

Recommended:

- snake_case tables
- snake_case columns
- snake_case indexes
- snake_case constraints

Do not casually mix naming styles.

## 6. Time

Persist authoritative timestamps in UTC.

Presentation may convert timestamps to the appropriate user/store
timezone.

Do not store ambiguous local timestamps for commerce events.

## 7. Conceptual schema domains

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

These names are conceptual during Phase 0.

Actual table design is reviewed during the corresponding schema phase.

## 8. Core database invariants

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

## 9. Historical orders

Historical order items must not depend on mutable catalog data to
reconstruct the commercial purchase.

Order-item snapshots preserve the commercial facts required for order
history.

Editing or archiving a catalog item must not rewrite historical orders.

## 10. Product deletion

Products/variants referenced by commerce history should normally be:

- archived
- disabled
- hidden from sale

rather than hard deleted.

Hard deletion must never destroy required historical order data.

## 11. Inventory integrity

Inventory-changing operations must be auditable.

Concurrency controls must prevent overselling.

Critical inventory/order operations should use atomic SQL and database
transactions where appropriate.

## 12. Foreign keys and deletion behavior

Cascade deletion must be chosen deliberately.

Do not apply broad ON DELETE CASCADE behavior to commerce history
without proving that required records cannot be lost.

Particular caution is required for:

- orders
- order_items
- payments
- inventory movements
- audit history

## 13. Migrations

Before database mutation verify:

- canonical repository root
- environment
- database host
- database port
- database name

Generated migration files must be reviewed.

Do not treat uncontrolled direct schema push as a replacement for
understood migrations.

Production migration rules are defined later.
