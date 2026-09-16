# Nomi Numi Shop — Project Plan

## 1. Objective

Build a custom ecommerce platform containing:

- public storefront
- customer registration and login
- customer account area
- admin panel (operated by the human shop owner; application role `admin`)
- catalog management
- variants
- inventory management
- shopping cart
- wishlist
- checkout
- orders
- reviews
- promotions
- merchandising
- custom-video fulfillment
- owned-stock fulfillment
- dropship fulfillment

Expected initial scale:

approximately 500 orders per month.

## 2. Initial markets

Markets:

- Philippines
- United States

Currencies:

- PHP
- USD

Language:

- English

Authoritative product/store prices are explicitly managed by currency.

Live foreign-exchange conversion must not silently determine the
customer's authoritative checkout price.

## 3. Catalog

Catalog structure is database-managed rather than hard-coded.

The authoritative Store + Catalog blueprint (Phase 2D) is:

- `docs/STORE_CATALOG.md`

That document locks single-store architecture, category vs collection
separation, product/variant structure, money semantics, inventory
boundaries, media/CMS/review/custom-video boundaries, deletion/archival
rules, the conceptual relational model, and the Phase 3+ implementation
sequence. Do not invent conflicting catalog schema during later phases.

The application needs both:

- categories
- collections

A product may belong to multiple categories and multiple collections.

Initial product families include the following.

### Plushies

- regular plushies
- large 60 cm plushies
- large 80 cm plushies

### Apparel

- hoodies
- pajamas
- night suits
- Christmas clothing

### Accessories

- keychains
- bags
- tumblers
- bottles
- umbrellas
- ornaments

### Home

- cushions
- lamps
- posters
- calendars
- magnetic toys

### Seasonal collections

- Christmas
- Halloween
- Valentine's Day

### Services

- custom videos

Gift cards are excluded from the current project scope.

## 4. Product variants

Products may have options such as:

- size
- color
- style
- material

Each sellable variant may independently contain:

- SKU
- PHP price
- USD price
- inventory
- images
- weight
- dimensions
- enabled/disabled state
- fulfillment configuration

Inventory is tracked at variant level.

Money uses integer minor units.

## 5. Merchandising

The storefront should support:

- featured products
- featured categories
- featured collections
- best sellers / top sellers
- new products
- seasonal collections
- promotional banners

Best-seller ranking should primarily derive from valid completed
commerce data.

Admin may later pin or override selected merchandising positions without
requiring source-code changes.

## 6. Inventory and fulfillment

Supported fulfillment modes:

- owned stock
- dropship
- hybrid

Inventory capabilities should include:

- stock additions
- reservations
- successful purchase deduction
- reservation release
- cancellation restoration where applicable
- return adjustments
- manual adjustments

Inventory changes require a traceable movement history.

Overselling prevention is mandatory.

Supplier API automation is not required initially.

## 7. Customer accounts

Customers should eventually be able to:

- register
- log in
- log out
- verify email
- reset password
- manage profile
- manage addresses
- view orders
- view shipment/tracking status
- manage wishlist
- manage reviews
- access completed custom videos

Guest browsing is required.

Guest cart usage is required.

Whether checkout itself permits guest checkout or requires an account is
an explicit open decision to lock before checkout implementation.

## 8. Reviews

Reviews require verified purchase eligibility.

Planned review content:

- 1–5 stars
- title
- written review
- customer images

Reviews publish without mandatory owner pre-approval.

Owner moderation must remain available after publication.

Review eligibility must be derived from server-side order data.

The client cannot claim purchase eligibility.

Duplicate-review behavior must be explicitly defined before the review
implementation phase.

## 9. Promotions

Admin-controlled promotion capabilities should eventually support:

- percentage discounts
- fixed discounts
- coupon codes
- product promotions
- category promotions
- collection promotions
- scheduled promotions
- automatic discounts
- free-shipping thresholds
- buy-X-get-Y
- seasonal campaigns
- minimum-order requirements
- global usage limits
- per-customer usage limits
- stacking/combination rules

Promotion evaluation must be deterministic and server-authoritative.

## 10. Custom videos

Custom video is a special commerce workflow.

Customer-provided information may include:

- recipient name
- occasion
- message
- instructions

Conceptual workflow:

- new
- in progress
- ready
- delivered

Completed videos are private customer media.

Access requires authenticated authorization.

## 11. Admin panel

Locked application role model (Phase 2B + Phase 2C0):

- `customer` (default)
- `admin`

These roles are mutually exclusive and have no hierarchy. There is no
`OWNER` application role. In product language, "owner" means the human
shop owner, not an auth role. Multiple admins are allowed.

First-admin provisioning is implemented in Phase 2C4:

- DEV/TEST-only guarded tooling (`pnpm auth:bootstrap-first-admin`)
- promote an existing verified `customer`
- only while zero admins exist (race-safe check + promote)
- no HTTP/self-promotion, env-email auto-promotion, seed/migration
  admin, or general promote/demote API in Phase 2C
- production admin bootstrap deferred to a separately authorized
  production phase

The admin panel should control as much routine shop operation as
practical without requiring source-code edits.

Planned administration areas:

- dashboard
- products
- variants
- categories
- collections
- inventory
- suppliers
- orders
- customers
- reviews
- promotions
- merchandising
- homepage
- banners
- navigation
- content pages
- custom videos
- shipping configuration
- payment configuration
- media
- SEO fields
- store settings
- basic analytics

## 12. Payments

Initial implementation:

- MockPaymentProvider

Real payment providers are deferred.

The architecture must allow later provider adapters appropriate for:

- Philippines
- USD/international customers

Core order and checkout logic must not directly depend on one payment
vendor.

## 13. Shipping

Initial development uses internally configured shipping rules/zones.

The architecture must allow later courier adapters and region-based
shipping calculation.

Shipping must support:

- owned inventory
- dropship fulfillment
- hybrid fulfillment

## 14. Media

Initial media storage is local to controlled application
infrastructure.

Media classes:

- public product media
- public review media
- private custom-video media

Storage must be abstractable so a later object-storage migration does
not require rewriting commerce logic.

## 15. CMS scope

Admin should eventually control:

- homepage sections
- hero content
- promotional banners
- navigation
- footer
- informational pages
- seasonal merchandising
- SEO metadata

Do not build a general-purpose Wix-style page builder.

Use controlled typed content blocks.

## 16. Development phases

### Phase 0

Safe repository and environment foundation.

### Phase 1

Application skeleton, quality tooling, storefront shell, and isolated
local PostgreSQL infrastructure.

Phase 1 is delivered in smaller reviewed steps:

- Phase 1A — Next.js application foundation
- Phase 1B — testing foundation
- Phase 1C — storefront design system and public shell
- Phase 1D — isolated local PostgreSQL infrastructure
- Phase 1E — Drizzle ORM + migration foundation
- Phase 1F — database / TEST destructive-operation safety

Phase 1D provides Docker Compose PostgreSQL for development and test
only.

Phase 1E adds drizzle-orm, drizzle-kit, postgres.js, canonical schema
export boundary, committed migrations, and guarded generate/check/migrate
helpers. It does not introduce domain tables, application runtime DB
wiring, authentication, catalog, cart, checkout, or payments.

Phase 1F adds the guarded TEST-only rebuild workflow
(`pnpm db:test:rebuild -- --confirm RESET-NOMI-TEST-DATABASE`). It drops
and recreates only `nomi_numi_shop_test`, refuses unexpected active
sessions, and reapplies committed migrations. DEV is not reset. There is
no generic drop/SQL tooling and no production target.

Phase 2A establishes Better Auth foundation after Phase 1F.

### Phase 2

Database and authentication foundation, delivered in reviewed steps:

- Phase 2A — Better Auth foundation (dependencies, Drizzle adapter,
  core auth schema/migration, local runtime env validation, server
  instance, `/api/auth` route, unauthenticated session smoke). No
  login/signup UI, roles, email/password, social providers, or
  production auth.
- Phase 2B — customer/admin identity roles and server authorization
  foundation (server-owned role field, exact-role primitives, migration
  `0002`). No auth UI, role mutation, or admin bootstrap.
- Phase 2C — auth lifecycle/security/UI/E2E, delivered in reviewed
  steps:
  - Phase 2C-P — CI + PR review foundation (portable GitHub Actions
    quality gate and durable review workflow)
  - Phase 2C0 — auth architecture/design lock (roles, signup/login,
    verification, reset, sessions, protected surfaces, first-admin
    rules; docs only)
  - Phase 2C1 — local email/Mailpit infrastructure (owned Compose
    Mailpit on 127.0.0.1:11025/18025, `src/email/` transport
    abstraction, safe local env templates)
  - Phase 2C2 — email/password + verification/reset backend
  - Phase 2C3 — auth client + signup/login/logout/verify/reset UI
  - Phase 2C4 — guarded first-admin provisioning (DEV/TEST)
  - Phase 2C5 — customer/admin protected surfaces
  - Phase 2C6 — auth security + E2E closure (complete: portable
    contracts + local Playwright/Mailpit evidence; CI skips live auth
    E2E)
- Phase 2D — Store + Catalog blueprint (docs only): locks
  single-store model, categories vs collections, product/variant
  aggregate, money, inventory architecture, order/payment/fulfillment
  boundary relative to catalog, media/CMS/reviews/custom-video
  boundaries, slugs, archival rules, conceptual DB model, and Phase 3+
  sequence. Authoritative doc: `docs/STORE_CATALOG.md`. No schema,
  migrations, or catalog runtime in 2D.

### Phase 3

Catalog model (schema + domain services + public reads), subdivided
per `docs/STORE_CATALOG.md` §17 after Phase 2D merge.

- Phase 3A — foundational catalog schema (complete: Drizzle tables +
  migration `0003_phase3a_catalog_schema`; no inventory runtime,
  repositories, seeds, or public/admin catalog APIs)
- Phase 3B — catalog domain repository/service layer (complete:
  `src/catalog/` with Zod 4 validation; no HTTP/UI or schema changes)
- Phase 3C — deterministic DEV catalog fixtures + TEST factories
  (complete: `src/catalog/fixtures/`, guarded
  `pnpm catalog:seed:dev -- --confirm SEED-NOMI-DEV-CATALOG`, TEST
  builders/factories under `tests/support/`; no store_settings seed,
  no public/admin catalog HTTP/UI prior to 3D)
- Phase 3D — public catalog reads (complete: `src/catalog/public/`
  published-only read models; App Router pages under `/products`,
  `/categories`, `/collections` with temporary USD; unit + Playwright
  smoke; no cookies/geo, no `/api/catalog/*`, no schema changes)

Post-Phase-3D storefront visual polish restyles the public catalog pages
(`/products`, `/categories`, `/collections` and detail routes) on the
closed Phase 3D read layer. Presentation-only: no PublicCatalogReads,
schema, auth, media runtime, or commerce changes. Complete.

Static content pages: `/about`, `/faq`, `/shipping`, `/returns`,
`/contact`, `/legal/privacy`, `/legal/terms`, `/legal/imprint`, `/gifts`,
`/lookbook`, `/size-guide` are implemented as read-only informational
pages using placeholder/template content. These pages do not integrate
with CMS, checkout, or commerce systems.

### Phase 4

Admin catalog management, delivered in reviewed steps:

- Phase 4A — admin API foundation + category management (admin layout
  shell, admin API utilities, `CatalogError` → HTTP status mapping,
  `listAllCategories` repository/service methods, category CRUD API
  routes under `/api/admin/catalog/categories`, category admin UI pages
  under `/admin/categories`, authorization tests)
- Phase 4B — collection management (`listAllCollections`, collection CRUD
  API routes under `/api/admin/catalog/collections`, collection admin UI
  pages, form component, integration tests)
- Phase 4C — product management base entity (`listAllProducts`, product CRUD
  API routes under `/api/admin/catalog/products`, product admin UI
  pages, form component, integration tests)
- Phase 4D — product options, variants, and pricing UI (`getProductOptions`,
  `listVariantDetailsForProduct`, `getVariantDetails`, option/variant CRUD
  API routes, variant form components, tests)
- Phase 4E (Pending) — assigning products to categories and collections.

### Phase 5

Inventory and fulfillment.

### Phase 6

Storefront and merchandising.

### Phase 7

Customer account, cart, wishlist and addresses.

### Phase 8

Checkout and order lifecycle using mock providers.

### Phase 9

Reviews and promotions.

### Phase 10

Custom-video workflow.

### Phase 11

CMS and admin completeness.

### Phase 12

Security, reliability and production-readiness hardening.

Hardening progress:

- GitHub Actions workflows use SHA-pinned third-party actions and
  minimal permissions (`permissions: {}` at workflow level; granular
  job permissions)
- CodeQL security analysis for JavaScript/TypeScript and GitHub Actions
- Dependabot configuration for npm and github-actions dependencies
- `test:ci` remains portable (GitHub-hosted runners; no local Docker/DB)
- Branch protection is live on `main` and requires the `PR Quality Gate`
  check to pass before merge (strict, enforced for admins, no force push).
  Complete rules are documented in `docs/GIT_WORKFLOW.md`

### Phase 13

Production infrastructure audit and selection.

### Phase 14

Real payments, couriers, transactional email and production
integrations.

Every phase must be divided into smaller reviewed implementation steps.

## 17. Initial non-goals

Do not initially introduce:

- Kubernetes
- microservices
- Redis
- Elasticsearch
- separate frontend/backend repositories
- real payment credentials
- real courier credentials
- production deployment
- gift cards
- general-purpose visual page builder

New infrastructure must be justified by a demonstrated requirement.

## 18. Explicit open decisions

The following are intentionally not decided during Phase 0:

- final public domain
- production Hetzner topology
- guest checkout versus account-required checkout
- exact real payment providers
- exact courier providers
- return/refund policy details
- tax implementation details
- final transactional email provider

Agents must not silently resolve these decisions during unrelated work.
