# Nomi Numi Shop — Architecture

## 1. Architecture style

Use a modular monolith.

One Next.js application contains:

- storefront
- customer account
- admin panel
- server-side commerce logic
- HTTP endpoints
- authentication integration

Do not introduce separate microservices without a demonstrated
requirement.

## 2. Runtime baseline

Node:

- 24.19.0

pnpm:

- 11.26.0

Framework major:

- Next.js 16 App Router

Exact package versions are pinned in `package.json` and
`pnpm-lock.yaml`.

Do not use floating latest dependencies in reproducible project
configuration after bootstrap.

Database major:

- PostgreSQL 16

The exact PostgreSQL container image tag is pinned in the implemented
Compose infrastructure.

## 3. Planned stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- PostgreSQL
- Drizzle ORM
- Better Auth
- Zod
- Vitest
- Playwright
- Docker Compose
- Mailpit

## 4. Source organization

Current implemented source foundation:

    src/
      app/
        api/
          auth/
          account/ admin/
        account/ admin/ forbidden/
        signup/ login/ logout/ check-email/
        email-verified/ forgot-password/ reset-password/
        layout.tsx
        page.tsx

      auth/
        client.ts   (Phase 2C3 browser createAuthClient)
        guards.ts / http.ts / safe-navigation.ts (Phase 2C5)
        client resolves page origin among LOCAL_AUTH_ORIGINS (Phase 2C6)
        server.ts / lifecycle.ts / authorization.ts / …
      components/
        auth/
      catalog/         (Phase 3B domain: repository, service, validators)
      db/
        runtime.ts
        schema/
          auth.ts      (Better Auth; isolated)
          catalog.ts   (Phase 3A foundational catalog)
          index.ts
      email/
      lib/

Future domain modules will be added only as their phases are approved;
their exact organization is not established by empty placeholder paths.

Do not create empty directories merely to match the diagram.

## 5. Module boundaries

Business rules belong in server-side domain modules rather than React
components.

UI code must not become authoritative for:

- pricing
- discount evaluation
- stock
- authorization
- payment state
- order state

## 6. Provider boundaries

External integrations use controlled interfaces/adapters.

Conceptual payment providers:

    PaymentProvider
      MockPaymentProvider
      PhilippinesPaymentProvider later
      InternationalPaymentProvider later

Conceptual shipping providers:

    ShippingProvider
      ManualShippingProvider
      CourierProvider later

Conceptual email providers:

    EmailProvider
      MailpitEmailProvider (Phase 2C1; wired by Phase 2C2 auth)
      TransactionalEmailProvider later

Conceptual storage providers:

    MediaStorage
      LocalMediaStorage
      ObjectStorage implementation later

Core commerce logic must not directly depend on a specific external
vendor SDK.

## 7. Database boundary

PostgreSQL is the authoritative persistence layer.

Schema evolution uses reviewed migrations.

Critical multi-record commerce operations use transactions where
atomicity is required.

See:

- docs/DATABASE.md

## 8. Commerce boundary

Commerce invariants are defined by:

- docs/COMMERCE_RULES.md

Store + catalog domain contracts (single-store model, categories vs
collections, product/variant aggregate, catalog money, inventory
architecture, media/CMS boundaries, conceptual schema, Phase 3+
sequence) are defined by:

- docs/STORE_CATALOG.md

Phase 3A implements the foundational catalog schema subset in
`src/db/schema/catalog.ts` (migration `0003_phase3a_catalog_schema`).
Phase 3B adds the server-side catalog domain under `src/catalog/`
(repository + service + Zod validation). Inventory runtime, seeds, and
public/admin catalog HTTP/UI surfaces remain later phases.

If implementation requirements conflict with those invariants, stop and
resolve the design instead of silently choosing different behavior.

## 9. Caching

Do not introduce Redis initially.

Caching must never weaken correctness.

Inventory, cart, checkout, authorization and payment behavior must not
depend on stale cache data.

## 10. Background work

Separate distributed job infrastructure is not required during initial
development.

When background/scheduled work becomes necessary, choose the simplest
reliable solution compatible with the existing architecture before
adding a new infrastructure dependency.

## 11. Media security classes

Public product media:

- public delivery is allowed
- CDN/cache use may be added later

Public review media:

- public only as accepted review content

Private custom-video media:

- not stored under public static paths
- access requires server-side authorization

Catalog media relationship, storage-key abstraction, and separation from
private custom-video assets are locked in `docs/STORE_CATALOG.md`.

## 12. CMS

Use controlled typed content blocks.

Do not build a general-purpose website builder.

Homepage/store content, policy pages, and merchandising sections are
CMS concerns distinct from inventorial catalog rows; see
`docs/STORE_CATALOG.md`.

## 13. Observability

Production-ready scope should eventually include:

- structured application logging
- error reporting
- health checks
- provider/job failure visibility
- security-relevant audit events

Logs must not contain secrets.

## 14. Production

Production architecture is deliberately undefined during Phase 0.

A later infrastructure audit determines:

- existing versus dedicated Hetzner server
- CPU
- RAM
- storage
- reverse proxy
- backup destination
- deployment strategy
- domain
- DNS
- CDN

Development agents must not infer these decisions.
