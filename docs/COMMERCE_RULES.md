# Nomi Numi Shop — Commerce Rules

This document defines commerce invariants.

Implementation must not silently invent conflicting behavior.

The approved Phase 7/8 cart, guest/customer checkout, order-access,
idempotency, reservation, and mock-payment contract is defined in
`docs/CHECKOUT.md`.

## 1. Money

Money is stored as integer minor units.

Examples:

- USD 34.99 is stored as 3499
- PHP 1,799.00 is stored as 179900

Every monetary value has an explicit currency.

Do not use floating-point numbers as authoritative stored money.

## 2. Multi-currency prices

PHP and USD store prices are explicit prices.

Do not calculate the authoritative checkout price from a live exchange
rate.

Each enabled variant must have a valid price for every currency in which
that variant is offered.

## 3. Server authority

The browser/client is never authoritative for:

- product price
- variant price
- discount
- coupon effect
- shipping price
- inventory
- order total
- payment state

The server recalculates and validates authoritative values.

## 4. Cart versus order

Cart information may change before checkout.

Immediately before order creation, the server must revalidate:

- product availability
- variant availability
- current price
- current currency
- promotion eligibility
- shipping eligibility
- available inventory

An order stores a commercial snapshot.

Historical orders must not change merely because a product is later:

- renamed
- repriced
- edited
- hidden
- archived

Order-item snapshot information should preserve the commercial facts
needed to reconstruct the purchase, including where applicable:

- product identity
- variant identity
- display name
- selected options
- SKU
- unit price
- currency
- quantity
- discounts
- resulting totals

## 5. Product lifecycle

Products and variants referenced by historical commerce should normally
be archived/disabled instead of destructively removed.

Storefront visibility and historical-order integrity are separate
concerns.

Authoritative store/catalog structure (categories vs collections,
product/variant split, slugs, media, archival rules, conceptual schema)
is locked in `docs/STORE_CATALOG.md`.

## 6. Inventory

Inventory is variant-level.

Conceptually distinguish:

- on-hand quantity
- reserved quantity
- available quantity

Available quantity must not become logically negative through normal
checkout behavior.

Inventory changes require traceable movements.

Examples:

- restock
- reservation
- reservation release
- sale
- cancellation
- return
- manual adjustment

## 7. Checkout concurrency

Two customers attempting to purchase the final unit must not both
successfully consume it.

Reservation/commit behavior must account for concurrent checkout.

Critical inventory/order operations should use appropriate atomic
database operations and transactions.

## 8. Order, payment and fulfillment states

Order lifecycle, payment lifecycle and fulfillment lifecycle are
different concepts.

Do not represent every commerce state using one overloaded status field.

Conceptual order states may include:

- pending
- confirmed
- cancelled
- completed

Conceptual payment states may include:

- unpaid
- pending
- paid
- failed
- refunded
- partially refunded

Conceptual fulfillment states may include:

- unfulfilled
- processing
- shipped
- delivered
- cancelled

The exact state machines must be designed and approved before
implementation.

## 9. Idempotency

Operations capable of:

- creating orders
- consuming inventory
- charging money
- refunding money
- processing payment/provider webhooks

must eventually be idempotent.

Duplicate requests must not produce:

- duplicate orders
- double stock deduction
- duplicate payments
- duplicate refunds
- duplicate fulfillment actions

This principle also applies while mock providers are used.

## 10. Promotions

Promotion evaluation is server-side.

Rules must explicitly define relevant conditions such as:

- eligible products
- eligible categories
- eligible collections
- currency
- start/end time
- minimum spend
- usage limits
- per-customer limits
- stacking behavior

Promotion combination must be deterministic.

Do not rely on incidental array ordering to decide which promotion wins.

Final payable totals must never become negative.

## 11. Reviews

A customer may review only an eligible purchased item.

Eligibility is verified server-side using order data.

Reviews publish without mandatory owner pre-approval.

Owner moderation remains available after publication.

Review ownership must be checked before customer edit/delete operations.

Duplicate-review behavior must be defined before implementation.

## 12. Dropshipping

Fulfillment source does not change the commercial identity of the
customer's order item.

Fulfillment may come from:

- local stock
- supplier
- hybrid routing

Supplier/internal procurement information must not leak to customers
unless intentionally designed.

## 13. Custom videos

Custom-video purchases are linked to the corresponding customer/order.

Generated media is private.

A customer must never obtain another customer's video by guessing an ID,
filename, or URL.

## 14. Best sellers

Best-seller calculations must use valid commerce data.

Cancelled or otherwise invalid orders must not incorrectly inflate
ranking.

The exact qualifying order/payment states will be defined when the
analytics/merchandising implementation is designed.

Admin may later pin selected products independently from automatic
ranking.

## 15. Returns and refunds

Returns/refunds are not fully designed during Phase 0.

Before implementation, explicitly define their effect on:

- order state
- payment state
- fulfillment state
- inventory
- promotions
- analytics

Do not improvise destructive behavior before those rules are approved.
