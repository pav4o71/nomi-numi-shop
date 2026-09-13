# Nomi Numi Shop — Store + Catalog Blueprint

Phase 2D locks the authoritative Store + Catalog design contract.

Later catalog, inventory, merchandising, admin, and storefront phases
must follow this document. Conflicts with implementation proposals must
be resolved by updating this contract first — not by silently inventing
alternate schema or domain behavior.

This phase is **documentation only**. It does **not** create Drizzle
schema, migrations, catalog APIs, admin UI, storefront catalog features,
checkout, inventory runtime, CMS, reviews, or payment integrations.

Related invariants remain in force:

- `docs/COMMERCE_RULES.md` — money, inventory, order/payment/fulfillment,
  reviews, custom video
- `docs/DATABASE.md` — migration safety, naming, historical integrity
- `docs/AUTH.md` / `docs/SECURITY.md` — exact-role authorization
- `docs/PROJECT_PLAN.md` — business scope and phased delivery

---

## 1. Authority and non-goals

### In scope for Phase 2D

- single-store model
- category vs collection separation
- product / variant aggregate
- money and currency contract for catalog prices
- inventory architecture (conceptual)
- order / payment / fulfillment boundary relative to catalog
- media model
- CMS / content boundary
- review rules that protect the product model
- private custom-video boundary
- slug / public identifier rules
- deletion / archival rules
- security boundary for catalog reads vs mutations
- conceptual relational model
- Phase 3+ implementation sequence

### Explicit exclusions (this phase and current product plan)

Do **not** design or implement:

- gift cards, store credit, wallet balances, gift-card codes
- multi-tenant SaaS / per-tenant catalog isolation
- warehouse multi-location complexity beyond a single logical stock pool
- unrestricted JSON/page-builder CMS
- live FX conversion as authoritative pricing
- runtime schema, migrations, seed data, or APIs in Phase 2D

Gift cards remain out of project scope until a separately approved plan
change.

---

## 2. Store model (locked)

### Decision

Nomi Numi Shop is a **single-store** product.

There is one public shop identity, one admin-operated catalog, and one
set of store settings. Do not introduce `tenant_id` / multi-store
scoping on catalog rows in the initial schema.

### What belongs to store configuration

Store-level (not product rows):

- public store name / brand identity fields
- default language (English for initial launch)
- supported business currencies (PHP, USD) and which are offered
- contact / support presentation fields (when implemented)
- homepage and storefront chrome settings (via typed CMS later)
- shipping zones / payment configuration (later commerce phases)
- SEO defaults for the store root
- feature flags / operational toggles that are store-wide

### What belongs to catalog data

- categories, collections
- products, variants, options, prices
- product media
- inventory balances / movements / reservations
- merchandising membership and sort positions that attach to catalog
  entities

### Public store identity / content boundary

Public store identity is presentation + settings, not a second catalog.

Storefront content such as homepage sections, banners, navigation, and
policy pages is **CMS / typed content**, not inventorial product data.
Product merchandising (featured products, seasonal collections) may
reference catalog entities but does not redefine them.

### Future extensibility

If a future product requirement ever needs multiple stores:

1. stop and redesign deliberately
2. do not retrofit by sprinkling nullable `store_id` without a reviewed
   tenancy model
3. do not implement multi-tenant SaaS patterns “just in case”

A singleton `store_settings` record (one logical store) is the locked
shape. Conceptual table name: `store_settings`.

---

## 3. Categories vs collections (locked)

Categories and collections are **separate concepts** and **separate
tables**. Do not collapse them into one generic “grouping” entity.

### Categories — structural taxonomy

Purpose:

- stable product taxonomy
- primary navigation and filtering structure
- durable classification of merchandise families

Rules:

- **Ownership:** admin-managed catalog structure
- **Product relationship:** many-to-many via `product_categories`
  (a product may belong to multiple categories, per project plan)
- **Uniqueness:** `slug` unique among categories; internal `id`
  separate from slug
- **Ordering:** explicit `position` (and optional parent/child nesting
  only if a later schema phase proves hierarchical need; initial design
  assumes a flat or shallow tree — see conceptual model)
- **Publish / visibility:** `published` (or equivalent) controls
  storefront visibility; unpublished categories are admin-only
- **Deletion / archive:** prefer archive/unpublish when products still
  reference the category; hard delete only when no product membership
  remains and no historical merchandising requirement needs the row
- **Not for:** seasonal campaigns, editorial “shop the look”, or
  temporary promo groupings

### Collections — merchandising / editorial grouping

Purpose:

- seasonal, campaign, and manual merchandising sets
- editorial groupings that change more often than taxonomy

Rules:

- **Ownership:** admin-managed merchandising
- **Product relationship:** many-to-many via `collection_products`
  (products may belong to multiple collections)
- **Uniqueness:** `slug` unique among collections
- **Ordering:** collection `position` for storefront listing; per-product
  `position` inside a collection for merchandising order
- **Publish / visibility:** independent publish flag and optional
  schedule window fields (start/end) may be added in implementation;
  unpublished collections are not public
- **Deletion / archive:** unpublish/archive preferred; membership rows
  may be removed when a campaign ends without deleting products
- **Not for:** replacing category taxonomy

### Separation invariant

Application and schema must preserve distinct types. Shared UI
components are allowed; shared persistence tables are not.

---

## 4. Product model (locked)

### Product aggregate

A **product** is the customer-facing sellable parent. Sellable stock and
price live on **variants**.

| Concern                             | Product level                      | Variant level                                            |
| ----------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| Public identity / slug              | yes                                | no (variant is not a separate public PDP URL by default) |
| Title / description / rich content  | yes                                | optional override display label only if needed           |
| Status / lifecycle                  | yes (draft / published / archived) | yes (active / inactive)                                  |
| Category membership                 | yes                                | no                                                       |
| Collection membership               | yes                                | no                                                       |
| Options definition (Size, Color, …) | yes                                | option values selected                                   |
| SKU                                 | no                                 | yes                                                      |
| Price / compare-at                  | no                                 | yes (per currency)                                       |
| Inventory                           | no                                 | yes                                                      |
| Weight / dimensions for shipping    | default optional                   | authoritative when present                               |
| Fulfillment mode hints              | default optional                   | authoritative when present                               |
| Media                               | yes (gallery)                      | optional variant-specific images                         |
| SEO metadata                        | yes                                | no (unless a later phase proves need)                    |
| Merchandising sort on product grids | yes                                | no                                                       |
| Created / updated timestamps        | yes                                | yes                                                      |

### Required product fields (conceptual)

- `id` — internal opaque identifier (not the public URL)
- `slug` — public URL identifier
- `title`
- `description` — storefront plain/structured text; rich blocks via
  typed content if needed later (not unrestricted JSON blob as the
  primary model)
- `status` — at least: `draft` \| `published` \| `archived`
- category links (M:N)
- collection links (M:N)
- merchandising `position` (storefront default ordering among products
  where applicable)
- SEO fields when implemented: `seo_title`, `seo_description`
  (nullable; fall back to title/description)
- `created_at`, `updated_at` (UTC)
- optional `published_at`

### Product lifecycle

- **draft** — admin only; not storefront-visible
- **published** — eligible for storefront if at least one sellable
  variant is active and priced for the shopper’s currency (exact
  storefront eligibility rules refined in public-read phases)
- **archived** — retained for history and admin reference; not for sale

Archival is the normal way to retire a product. See §14.

### Expected merchandise families

Design for ordinary ecommerce options on:

- plushies
- apparel
- drinkware
- keychains
- tote bags
- small home / decor / gift products

Plus the separate **custom video** commerce workflow (not ordinary
public product media — see §11).

Do **not** build a premature generic “any configurable product engine”
(arbitrary nested BOM, kit builders, etc.). Support normal option axes:

- size
- color
- style
- material (where needed)

---

## 5. Product variants (locked)

### Identity

Each **variant** is one sellable SKU under a product.

Conceptual fields:

- `id`
- `product_id`
- selected option values (via option-value links)
- `sku` — unique among sellable variants (store-wide uniqueness)
- prices per currency (see §6)
- optional compare-at prices per currency
- inventory relationship (see §7)
- `is_active` (or equivalent) — inactive variants are not newly sold
- optional variant media links
- optional weight / dimensions
- optional fulfillment configuration reference
- `created_at`, `updated_at`

### Option model (intentionally modest)

- `product_options` — named axes on a product (`Size`, `Color`, …)
  with display `position`
- `product_option_values` — values on an option (`S`, `M`, `Red`, …)
  with display `position`
- `product_variant_option_values` — which values a variant selects
  (exactly one value per defined option for that product when the
  product uses options)

A product with a single implicit sellable unit still has **one**
variant (the “default” variant). Do not omit variants and hang price /
inventory on the product row.

### Invariants

- SKU uniqueness is store-wide among non-deleted variants
- a variant belongs to exactly one product
- price and inventory are never authoritative on the product parent
- inactive or archived parents cannot present variants as newly purchasable
  on the storefront
- variant option combination uniqueness per product (no two active
  variants with the same option-value set)
- avoid encoding price as floating point anywhere in persistence

### Variant images

Supported: optional media rows linked to a variant for swatch/PDP
switching. Product gallery remains the default when a variant has no
specific image.

---

## 6. Money / currency contract (locked)

Reinforces and specializes `docs/COMMERCE_RULES.md` for catalog prices.

### Amount representation

- store monetary amounts as **integer minor units** only
- examples: USD `34.99` → `3499`; PHP `1,799.00` → `179900`
- never use IEEE floating-point as authoritative stored money

### Currency representation

- currency is an explicit code alongside every monetary amount
- initial supported business currencies: **PHP**, **USD**
- use a closed allowlist in application validation (ISO-like codes:
  `PHP`, `USD`)

### Catalog price storage

Conceptual: `variant_prices`

- `variant_id`
- `currency` (`PHP` \| `USD`)
- `amount_minor` (integer, required when the currency is offered)
- optional `compare_at_amount_minor` (integer)

Unique on `(variant_id, currency)`.

Each active variant offered for sale in a currency must have a valid
row for that currency. Missing currency price means “not offered in
that currency,” not “derive from the other currency.”

### No implicit FX

- PHP and USD prices are independently administered
- no live FX feed may set the authoritative catalog or checkout price
- never assume PHP and USD amounts are equivalent
- any future conversion tooling must be an **explicit, separately
  designed** admin aid — never silent write-through into authoritative
  prices

### Comparison and constraints

- monetary comparison is only valid within the **same currency**
- `amount_minor` must be **> 0** for sellable catalog prices
  (zero-price catalog products are out of initial scope; free gifts via
  promotions are a later promotions concern, not zero catalog price)
- negative amounts are forbidden for catalog prices
- if `compare_at_amount_minor` is set, it must be **> `amount_minor`**
  in the same currency (compare-at is the pre-discount / MSRP style
  figure)
- storefront “sale” presentation is derived from compare-at vs price;
  it is not a separate truth source

### Checkout note

Cart/order totals recalculate server-side from authoritative variant
prices (and later promotions/shipping). Client-displayed prices are
never trusted.

---

## 7. Inventory contract (locked)

Inventory is **variant-level**. Do not model stock as only a mutable
`quantity` column without auditability.

### Distinctions

| Concept               | Meaning                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------- |
| **Balance (on-hand)** | units physically/logically held                                                         |
| **Reserved**          | units held for in-flight checkouts/orders                                               |
| **Available**         | `on_hand - reserved` (computed; must not go logically negative under normal sale paths) |
| **Movement / ledger** | immutable-ish history explaining balance changes                                        |
| **Reservation**       | traceable hold with source reference and lifetime                                       |
| **Release**           | reservation ends without sale; restores availability                                    |
| **Sale / commit**     | reservation converts to sold; on-hand decreases                                         |
| **Manual adjustment** | admin correction with mandatory reason                                                  |

### Conceptual entities

- `inventory_balances` — one row per inventorial variant (on-hand,
  reserved)
- `inventory_movements` — append-oriented ledger
- `inventory_reservations` — active/released/committed reservation
  records

### Movement requirements

Every balance-changing operation writes a movement with:

- variant reference
- delta (signed integer minor **units of stock**, not money)
- reason / movement type (`restock`, `reserve`, `release`, `sale`,
  `cancel_restore`, `return`, `manual_adjustment`, …)
- source reference (order id, admin actor id, import batch id, …)
- timestamp (UTC)
- optional note

Movements explain balances. Balances are not silently edited.

### Concurrency / oversell

- two checkouts must not both consume the final available unit
- reservation and commit paths use transactions and atomic conditional
  updates (or equivalent DB constraints)
- available quantity must not become logically negative through normal
  checkout

### Fulfillment modes (boundary only)

Owned stock, dropship, and hybrid are fulfillment concerns. Dropship
variants may still track operational quantities or external
availability flags in later phases, but they do **not** skip the need
for clear sale/reservation semantics when the shop promises limited
units.

### Warehouse complexity

Single logical stock pool for the shop. Multi-warehouse, bin locations,
and WMS are out of scope unless a later approved requirement appears.

---

## 8. Order / payment / fulfillment boundary (locked)

Checkout and orders are **later phases**. Catalog design must not encode
order/payment/fulfillment into product status.

### Keep separate

| Domain          | Owns                                            | Examples (conceptual)                                       |
| --------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| **Catalog**     | sellability / visibility of products & variants | draft, published, archived; variant active/inactive         |
| **Order**       | commercial agreement lifecycle                  | pending, confirmed, cancelled, completed                    |
| **Payment**     | money capture lifecycle                         | unpaid, pending, paid, failed, refunded, partially refunded |
| **Fulfillment** | physical/digital delivery lifecycle             | unfulfilled, processing, shipped, delivered, cancelled      |

Do **not** create one generic `status` that tries to represent all three
commerce lifecycles, and do **not** overload product `status` with
payment or shipment meaning.

### Ownership relationship (future)

- an **order** references snapshot commercial facts (product/variant
  identity, title, options, SKU, unit price, currency, qty, discounts)
- **payment** records attach to the order (or payment intents) and do
  not mutate catalog prices
- **fulfillment** / shipments attach to the order (and line items) and
  may consume inventory commitments
- catalog archival after purchase must not rewrite those snapshots

Exact order/payment/fulfillment state machines are designed in the
checkout/order phases; this section only locks the separation so catalog
schema stays clean.

---

## 9. Media model (locked)

### Classes

1. **Public product media** — catalog galleries / variant images
2. **Public review media** — later reviews phase
3. **Private custom-video media** — never mixed into public product media
   URLs or storage prefixes meant for CDN-public assets

### Product / variant media

Conceptual: `product_media` (and optional variant association)

Fields / concerns:

- product link (required)
- optional variant link
- storage identifier / object key (**opaque**; not a raw forever-coupled
  filesystem path column as the only handle)
- provider hint (`local` initially; replaceable)
- `alt_text`
- `position` for gallery order
- primary flag **or** convention that `position = 0` is primary (pick one
  in schema phase; default recommendation: lowest `position` is primary)
- content type / size metadata as needed for validation
- created/updated timestamps

### Storage abstraction

Initial provider: local media under controlled application
infrastructure (`LocalMediaStorage` conceptual adapter).

Database records store a **storage key / logical identifier**. Delivery
URLs are derived through the storage adapter. Do not permanently couple
commerce rows to one host filesystem layout so object-storage migration
can replace the adapter without rewriting catalog meaning.

### Deletion behavior

- removing a media row must not break historical order snapshots (orders
  should not depend on live gallery rows for legal/commercial history)
- private custom-video assets follow authorization-sensitive deletion
  rules in their own phase
- orphan binary cleanup is an operational concern coordinated with the
  storage adapter; prefer soft-detach then GC over blind unlink

---

## 10. CMS / content boundary (locked)

### Direction

Use **typed content blocks**, not unrestricted arbitrary JSON documents
as a general page builder.

### Eventually CMS-managed (not in Phase 2D)

- homepage / store merchandising sections
- promotional banners
- navigation / footer
- policy and informational pages
- optional product rich-content blocks beyond plain description
- SEO fields for content pages

### Not CMS

- inventorial product/variant rows
- inventory balances and movements
- prices
- order/payment/fulfillment records
- authorization / roles

Do not build a Wix-style freeform builder. Block types are enumerated
and validated server-side when CMS is implemented (Phase 11 area in the
project plan).

---

## 11. Reviews (future rules protecting the product model)

No review implementation in Phase 2D. Locked direction:

- reviews associate to **products** (and may reference the purchased
  variant for context)
- **verified-buyer** status is derived from server-side purchasing
  evidence (eligible paid/completed order data) — never from a
  client-supplied flag
- **moderation / publication** state is separate from review body
  content (publish-without-mandatory-pre-approval remains per
  `docs/COMMERCE_RULES.md` / project plan; owner moderation remains
  available after publication)
- customer edit/delete requires ownership checks
- duplicate-review policy is defined in the reviews implementation
  phase before coding

Catalog schema must not embed review aggregates as the source of truth
for moderation.

---

## 12. Private custom paid video boundary (locked)

Custom paid video / gift content is a **separate commerce workflow**,
not ordinary public product media.

Locked properties:

- private, customer-specific asset
- access requires authenticated server-side authorization
- linked to the relevant order / line item / custom-video request
- **not** exposed through public product media URLs or public storage
  prefixes
- guessing ids/filenames/URLs must not grant access

Catalog may later include a purchasable custom-video **offer** product
type, but delivered media remains in the private media domain
(`custom_video_requests` / private media metadata — conceptual names in
`docs/DATABASE.md`).

---

## 13. Slugs / public identifiers (locked)

### Entities with public slugs

- products
- categories
- collections

### Rules

- **Internal `id`** (opaque, stable) is distinct from **public `slug`**
- uniqueness scope:
  - product slugs unique among products
  - category slugs unique among categories
  - collection slugs unique among collections
  - do **not** require global uniqueness across entity types in v1
    (routing disambiguates: `/products/:slug`, `/categories/:slug`,
    `/collections/:slug` — exact paths chosen in storefront phases)
- **normalization:** lowercase, trimmed, URL-safe hyphenated slugs;
  reject empty / unsafe unicode control characters; exact normalization
  helper locked at schema/service implementation time
- **rename behavior:** slug may change under admin control; old slug
  becomes unused
- **historical redirects:** deferred — not required in initial catalog
  phases; if added later, use an explicit redirect map, not in-place
  mutation of historical order data
- storefront and APIs look up published entities by slug for public
  reads; admin may also use internal ids

Variants are not required to have public slugs; selection uses variant
id or option combination on the product PDP.

---

## 14. Deletion / archival rules (locked)

### Products and variants

- prefer **archive / disable / unpublish** over hard delete
- products or variants referenced by future orders **must not**
  disappear from historical reconstruction
- future order-item **snapshots** (not implemented in 2D) must capture
  commercial facts so catalog edits cannot rewrite history
- hard delete of a never-sold draft may be allowed in admin tooling once
  implemented; hard delete of commerce-referenced rows is forbidden

### Categories and collections

- unpublish / archive preferred when membership or storefront history
  matters
- membership join rows may be removed without deleting the product
- hard delete allowed only when safe (no required references)

### Media

- detaching public gallery media must not break order history (orders
  do not rely on live gallery as source of truth)
- private custom-video deletion is authorization-sensitive and deferred
  to that workflow’s phase
- do not cascade-delete binaries in a way that orphans private
  authorized references

### Inventory history

- movements and fulfilled reservation history are retained for audit;
  do not hard-delete ledger rows to “clean up” catalog archives

---

## 15. Security / authorization boundary (locked)

Aligned with Phase 2B/2C exact-role model (`customer` | `admin`).

| Action                                                                          | Who                                                 |
| ------------------------------------------------------------------------------- | --------------------------------------------------- |
| Public storefront catalog reads (published data)                                | unauthenticated allowed                             |
| Customer-specific private media / custom video                                  | exact authenticated principal with ownership checks |
| Catalog create/update/archive, pricing, inventory adjustments, media management | exact `admin` only                                  |

Rules:

- customer role must **never** gain catalog-management access
- client role/session visibility is **non-authoritative**
- server-side `requireAdmin` (or successor) remains mandatory for
  mutations
- UI hiding is not authorization

No admin catalog UI/API in Phase 2D.

---

## 16. Conceptual relational model

**Not implemented in Phase 2D.** Names are conceptual; final column
types/indexes are chosen in foundational schema phases. Prefer
snake_case tables/columns per `docs/DATABASE.md`.

### 16.1 `store_settings`

- **Purpose:** singleton store configuration
- **Key fields:** store display name, supported currencies config,
  default locale, contact/SEO defaults, timestamps
- **Uniqueness:** logically one active store settings row
- **FKs:** none required for single-store
- **Invariants:** no multi-tenant scoping; currencies allowlist includes
  PHP and USD for initial business

### 16.2 `categories`

- **Purpose:** structural taxonomy
- **Key fields:** id, slug, name, description, position, published,
  optional parent_id (only if hierarchy is confirmed at schema time),
  timestamps, archived_at nullable
- **Uniqueness:** unique slug
- **FKs:** optional self-parent
- **Invariants:** not used as merchandising-only collections

### 16.3 `collections`

- **Purpose:** merchandising/editorial groupings
- **Key fields:** id, slug, name, description, position, published,
  optional publish window, timestamps, archived_at nullable
- **Uniqueness:** unique slug
- **FKs:** none to categories
- **Invariants:** separate from categories

### 16.4 `products`

- **Purpose:** product parent aggregate
- **Key fields:** id, slug, title, description, status, position,
  seo fields, timestamps, published_at, archived_at
- **Uniqueness:** unique slug
- **FKs:** none required to store_settings in v1
- **Invariants:** status lifecycle; not a price/inventory carrier

### 16.5 `product_categories`

- **Purpose:** M:N product ↔ category
- **Key fields:** product_id, category_id, position (optional),
  optional is_primary flag if storefront breadcrumb needs one
- **Uniqueness:** unique `(product_id, category_id)`
- **FKs:** products, categories
- **Invariants:** deleting category membership does not delete product

### 16.6 `collection_products`

- **Purpose:** M:N collection ↔ product merchandising
- **Key fields:** collection_id, product_id, position
- **Uniqueness:** unique `(collection_id, product_id)`
- **FKs:** collections, products
- **Invariants:** position orders merchandising within collection

### 16.7 `product_options` / `product_option_values`

- **Purpose:** modest option axes and values
- **Key fields:** product_id, name, position; option_id, value, position
- **Uniqueness:** unique option name per product; unique value per option
- **FKs:** product → options → values
- **Invariants:** keep model modest; no arbitrary kit engine

### 16.8 `product_variants`

- **Purpose:** sellable SKU units
- **Key fields:** id, product_id, sku, is_active, weight/dimensions
  optional, fulfillment hints optional, timestamps
- **Uniqueness:** unique sku (store-wide); unique option combination
  per product among active variants
- **FKs:** products
- **Invariants:** every sellable product has ≥ 1 variant

### 16.9 `product_variant_option_values`

- **Purpose:** bind variant to selected option values
- **Key fields:** variant_id, option_value_id
- **Uniqueness:** one value per option per variant; combination unique
  per product
- **FKs:** variants, option_values

### 16.10 `variant_prices`

- **Purpose:** explicit per-currency prices
- **Key fields:** variant_id, currency, amount_minor,
  compare_at_amount_minor nullable
- **Uniqueness:** unique `(variant_id, currency)`
- **FKs:** variants
- **Invariants:** integer minor units; amount_minor > 0; compare-at >
  amount when set; no FX derivation

### 16.11 `product_media`

- **Purpose:** public product/variant imagery metadata
- **Key fields:** id, product_id, variant_id nullable, storage_key,
  provider, alt_text, position, content metadata, timestamps
- **Uniqueness:** primary image convention via position (or single
  is_primary constrained)
- **FKs:** products; optional variants
- **Invariants:** storage_key opaque; not private custom-video media

### 16.12 `inventory_balances`

- **Purpose:** current on-hand and reserved quantities per variant
- **Key fields:** variant_id, on_hand, reserved, updated_at
- **Uniqueness:** one row per inventorial variant
- **FKs:** variants
- **Invariants:** reserved ≥ 0; on_hand ≥ 0; available =
  on_hand - reserved ≥ 0 under normal paths

### 16.13 `inventory_movements`

- **Purpose:** auditable ledger of stock changes
- **Key fields:** id, variant_id, delta, movement_type, source_type,
  source_id, actor_user_id nullable, note, created_at
- **Uniqueness:** id; optional idempotency key for safe retries later
- **FKs:** variants; logical reference to source entities
- **Invariants:** movements explain balance changes; no silent balance
  edits

### 16.14 `inventory_reservations`

- **Purpose:** traceable holds for checkout/order flows
- **Key fields:** id, variant_id, quantity, status
  (active/released/committed), source_type/source_id, expires_at
  nullable, timestamps
- **Uniqueness:** id; source reference should be locatable
- **FKs:** variants
- **Invariants:** reservations traceable; commit/release produce
  movements

### Intentionally deferred entities (named only)

Orders, payments, shipments, carts, reviews, CMS tables, custom-video
request tables, suppliers — designed in their phases. Catalog FKs must
not prematurely entangle those lifecycles beyond clear future reference
points (variant_id, product_id).

### Entity relationship (conceptual)

```text
store_settings (singleton)

categories ←—— product_categories ——→ products ←—— collection_products ——→ collections
                                         │
                                         ├── product_options ── product_option_values
                                         │         ▲
                                         │         │
                                         ├── product_variants ── product_variant_option_values
                                         │         │
                                         │         ├── variant_prices
                                         │         ├── inventory_balances
                                         │         ├── inventory_movements
                                         │         └── inventory_reservations
                                         │
                                         └── product_media (optional variant_id)
```

---

## 17. Implementation sequence (Phase 3+)

Derive small reviewed PRs. Do not start these in Phase 2D.

### Phase 3A — Foundational catalog schema

- **Status:** implemented (schema + migration `0003_phase3a_catalog_schema`
  - portable/local constraint tests). Category hierarchy (`parent_id`)
    and active-variant option-combination uniqueness remain deferred to
    later phases / service layer per contract.
- **Scope:** Drizzle tables/migrations for store_settings, categories,
  collections, products, M:N joins, options, variants, variant_prices,
  product_media metadata (no full upload UX required)
- **Out of scope:** admin UI, public catalog pages, inventory ledger
  runtime, CMS, checkout
- **Validation:** migrate DEV/TEST, unit tests for constraints/helpers,
  `pnpm` quality gate
- **Depends on:** Phase 2D merge; existing Drizzle/auth foundation

### Phase 3B — Catalog domain repository / service layer

- **Status:** implemented (`src/catalog/` — repository, service, Zod 4
  validation, slug/money helpers, option-combination + primary-category
  transactional enforcement). No HTTP/UI surfaces. Migration `0003`
  unchanged. Active-combination uniqueness remains service-enforced
  (no schema unique index in 3A/3B).
- **Scope:** server-side product/category/collection/variant services,
  Zod validation, slug normalization, money helpers, status transitions
- **Out of scope:** HTTP admin API surface beyond minimal if needed for
  tests; storefront UI; Phase 3C seeds/fixtures
- **Validation:** portable unit tests + path-locked TEST DB integration
- **Depends on:** 3A
- **Phase 3B notes (not inventing new business contracts):**
  - product status values remain `draft` | `published` | `archived` per
    §4; no restrictive transition matrix is locked beyond those meanings;
    `changeProductStatus` accepts any of the three and keeps
    `published_at` / `archived_at` consistent
  - `defineProductOptions` may define/replace the option axis only when
    the product has **no** variants; if any variants exist, the service
    refuses with `CONFLICT` (no partial changes). Variant rebinding /
    option-axis migration workflows are deferred
  - no historical slug redirects; no hard-delete APIs; no inventory

### Phase 3C — Seed / DEV fixtures

- **Scope:** deterministic DEV fixtures for merchandise families;
  TEST factories for automated tests
- **Out of scope:** production data loads
- **Validation:** seed against DEV only with ownership guards; TEST
  factories on TEST DB
- **Depends on:** 3A–3B

### Phase 3D — Public catalog reads

- **Scope:** published product/category/collection queries and public
  routes/APIs; storefront listing/PDP read models
- **Out of scope:** cart, checkout, admin mutations
- **Validation:** unit + Playwright smoke for public reads
- **Depends on:** 3B–3C

### Phase 4 — Admin catalog management

- **Scope:** admin-only create/update/archive for products, variants,
  categories, collections, prices; exact `requireAdmin`
- **Out of scope:** full CMS, promotions engine, payments
- **Validation:** authorization tests (customer denied), admin E2E
- **Depends on:** Phase 3 + auth protected surfaces

### Phase 5A — Media management

- **Scope:** LocalMediaStorage adapter, upload validation, product
  media attach/reorder/detach
- **Out of scope:** object-storage provider; private custom video
- **Validation:** MIME/size/path traversal tests; authz tests
- **Depends on:** Phase 4 (or thin admin hooks from 3B if split)

### Phase 5B — Inventory ledger + reservations

- **Scope:** balances, movements, reservation/release/sale primitives;
  concurrency tests for oversell prevention
- **Out of scope:** multi-warehouse; courier integration
- **Validation:** concurrent TEST DB tests; audit assertions
- **Depends on:** variants schema; before or with checkout as needed

### Phase 6 — Storefront merchandising integration

- **Scope:** featured products/categories/collections wiring, seasonal
  collection surfaces using published catalog data
- **Out of scope:** best-seller analytics finalization if commerce data
  insufficient; promotions engine
- **Validation:** storefront E2E smoke
- **Depends on:** public reads + admin merchandising fields

### Later (unchanged project-plan lanes)

- customer cart/wishlist/account
- checkout + order snapshots + payment/fulfillment state machines
- reviews + promotions
- custom-video private workflow
- CMS typed blocks
- production hardening / real providers

Each implementation PR remains narrowly scoped per
`docs/GIT_WORKFLOW.md`.

---

## 18. Phase 2D completion checklist

Phase 2D is complete when:

- this document is merged as the catalog contract
- no Drizzle schema/migration/runtime catalog code shipped in the same
  change set as “docs-only Phase 2D”
- project plan / architecture point here as authority for store+catalog
- Phase 3 does not begin until human merge review accepts this blueprint
