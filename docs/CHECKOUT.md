# Nomi Numi Shop — Cart, Checkout, and Order Contract

This document is authoritative for Phase 7 cart ownership and the Phase 8
development checkout/order lifecycle. It extends `docs/COMMERCE_RULES.md` and
must be updated before changing the contracts below.

## 1. Checkout access

- Guest checkout and exact-role `customer` checkout are supported.
- An authenticated `admin` is not a customer. Admin sessions may use a guest
  cart, but must never be written to `orders.customer_id`.
- Checkout requires a validated contact email for both guest and customer
  orders.
- The Phase 8 mock checkout uses explicit USD catalog prices. Shipping and tax
  are both zero until their separately approved rules exist; orders store
  subtotal, shipping, tax, and total explicitly.

## 2. Cart identity

- Every cart has exactly one owner: `customer_id` or opaque `session_id`.
- At most one active cart exists for a customer and at most one for a guest
  session.
- Guest session identifiers are server-generated opaque UUID capabilities,
  stored only in an HttpOnly, SameSite=Lax cookie.
- Cart reads and mutations always scope item identifiers to the resolved cart.
- Carts expire after 30 days. Expired carts are not resumed or merged.
- Login merge is transactional and additive; duplicate variant quantities are
  combined atomically.

## 3. Checkout authority and snapshots

Immediately before order creation, inside the order transaction, the server
revalidates product publication, variant activation, explicit currency price,
quantity, and available inventory. The client never supplies authoritative
money, availability, or status values.

Each order item snapshots:

- product and variant identifiers when still available;
- product display title;
- SKU;
- selected option names and values;
- unit price, quantity, and line total;
- order currency.

Catalog edits or archival must not rewrite snapshots.

## 4. Idempotency

- The client creates one opaque idempotency key per checkout attempt and reuses
  it for every retry of that attempt.
- The server scopes the key to the checkout owner (`customer:<id>` or
  `session:<id>`) and stores a fingerprint of email, currency, and ordered
  variant/quantity pairs.
- Retry lookup occurs before cart-empty validation so a lost response can
  return the existing order after its source cart was cleared.
- The same textual key may exist independently in different owner scopes.
  Within one owner scope, reuse with a different request fingerprint is a
  conflict.
- Concurrent requests for one owner/key create at most one order and one set of
  reservations.

## 5. Order access

- Customer orders are readable only by the exact owning customer.
- Guest orders require independently random, high-entropy bearer capabilities.
  Raw capabilities are never persisted; each issued raw capability is exposed
  only once and kept in an HttpOnly SameSite=Lax cookie. Only its SHA-256 digest
  is stored.
- A guest order may have multiple simultaneously valid capability digests.
  Authorized idempotent recovery or concurrent retries may issue an additional
  capability only under the same guest owner/session scope and matching request
  semantics. Issuing one must not invalidate capabilities previously issued for
  that order.
- An order ID or idempotency key is never sufficient authorization.
- Capability expiry and revocation beyond the existing 30-day browser-cookie
  lifetime are deferred beyond this Phase 8 correction.
- Admin order management is deferred to an explicit admin-orders unit.

## 6. Inventory reservations

Every checkout hold has a durable reservation row per order/variant with:

- quantity;
- `active`, `committed`, `released`, or `expired` status;
- creation, update, and expiration timestamps.

Active reservations expire after 15 minutes. Payment success commits them;
payment failure releases them; opportunistic expiration releases overdue holds
transactionally. Every transition writes an inventory movement tied to the
order and reservation.

## 7. Mock payment lifecycle

Phase 8 uses a local-only `mock` provider. The configured outcome is
deterministic (`success` or `failure`); random payment outcomes are forbidden.

The mock webhook:

- authenticates with a local secret that is never exposed to the browser;
- validates the payload;
- persists a unique provider event/transaction identifier;
- is replay-safe and order-row locked;
- never trusts a browser claim of payment state.

State transitions are:

- created: order `pending`, payment `pending`, fulfillment `unfulfilled`;
- paid: order `confirmed`, payment `paid`, fulfillment `unfulfilled`,
  reservations `committed`;
- failed: order `cancelled`, payment `failed`, fulfillment `cancelled`,
  reservations `released`;
- expired before terminal payment: order `cancelled`, payment `failed`,
  fulfillment `cancelled`, reservations `expired`.

Terminal mock payment events do not reverse one another. Refunds, returns, and
real provider state machines remain separate later phases.

## 8. Error and test contract

- Invalid input returns 400, unauthenticated/forbidden customer resources use
  the existing 401/403 contract, missing owned resources return 404, and
  inventory/idempotency conflicts return 409.
- Unexpected infrastructure errors return a generic 500 body and are not
  exposed to clients.
- Data-mutating tests run only against `127.0.0.1:55433` /
  `nomi_numi_shop_test`.
- Required coverage includes ownership isolation, concurrent cart creation,
  idempotent retry/concurrency, reprice/deactivation races, last-unit checkout,
  reservation commit/release/expiry, webhook replay/authentication, and guest
  and customer order access.
