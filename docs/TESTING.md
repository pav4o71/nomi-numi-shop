# Nomi Numi Shop — Testing Baseline

## 1. Planned tooling

Unit/integration testing:

- Vitest

End-to-end testing:

- Playwright

## 2. Environment isolation

Development application:

- 127.0.0.1:3100

E2E application:

- 127.0.0.1:3101

Development PostgreSQL:

- 127.0.0.1:55432
- nomi_numi_shop_dev

Test PostgreSQL:

- 127.0.0.1:55433
- nomi_numi_shop_test

Data-mutating automated tests must use the test database.

They must never reset or truncate the development database.

## 3. Determinism

Automated tests should avoid unnecessary reliance on:

- wall-clock timing
- uncontrolled random data
- live external APIs
- another project
- undocumented machine-local state

Seed and test data should be deterministic where practical.

## 4. Quality gate

As implementation develops, the standard validation pipeline should
include:

1. formatting
2. lint
3. TypeScript
4. unit tests
5. integration tests where applicable
6. Playwright E2E where applicable
7. production build
8. Git diff/status review

During Phase 0 many of these commands do not exist.

Never report a validation as passing unless it actually ran.

## 5. Critical commerce coverage

High-risk behavior requiring strong coverage includes:

- integer money calculations
- currency selection
- cart repricing
- immutable order snapshots
- inventory reservation
- concurrent last-item checkout
- stock deduction
- cancellation release/restoration
- promotion stacking
- coupon usage limits
- negative-total prevention
- duplicate checkout/idempotency
- duplicate provider/webhook handling
- order-state transitions
- payment-state transitions
- fulfillment-state transitions

## 6. Authorization coverage

Test:

- admin-only routes/actions
- customer ownership
- cross-account access attempts
- order access
- address access
- wishlist access
- review mutation
- custom-video access

## 7. Review coverage

Test:

- verified-purchase eligibility
- unpurchased-product rejection
- duplicate-review policy
- review ownership
- image validation
- moderation authorization

## 8. Upload coverage

Test:

- invalid MIME type
- oversized files
- unsafe filenames
- path traversal attempts
- unauthorized private-media access
- cross-customer custom-video access

## 9. E2E application identity

Before stateful E2E execution, the test harness should eventually verify
that port 3101 is actually serving nomi-numi-shop.

Never silently fall back to port 3000 or another running project.

## 10. Regression policy

Reproducible defects should receive regression coverage where practical.

Do not weaken correct assertions merely to make an incorrect
implementation pass.
