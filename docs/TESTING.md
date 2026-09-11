# Nomi Numi Shop — Testing Foundation

## 1. Tooling

Vitest runs fast foundation and unit tests in a Node environment. Tests
live under:

- `tests/unit/`

Playwright runs browser-level smoke tests against the application. E2E
tests live under:

- `tests/e2e/`

The current E2E scope uses Chromium only.

## 2. Commands

Install the project-local Chromium browser once:

    pnpm test:e2e:install

Run the available test commands:

    pnpm test
    pnpm test:watch
    pnpm test:e2e
    pnpm test:all

Playwright browser binaries are stored under the ignored
`var/playwright-browsers/` directory. Playwright temporary files use the
ignored `var/tmp/` directory.

## 3. Environment isolation

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

The TEST database is disposable. Recreate it only through the guarded
Phase 1F workflow:

    pnpm db:test:rebuild -- --confirm RESET-NOMI-TEST-DATABASE

That command requires the exact confirmation token, drops/recreates only
`nomi_numi_shop_test`, refuses unexpected active sessions without
terminating them, and reapplies committed migrations. After Phase 2B,
a fresh TEST rebuild includes Drizzle bookkeeping plus Better Auth core
tables and `user.role` derived from committed migrations. DEV has no
rebuild command. There is no generic `db:reset` / `db:drop` / raw SQL
console.

Auth foundation unit coverage lives in:

- `tests/unit/auth-foundation.test.ts`
- `tests/unit/auth-authorization.test.ts`

Playwright starts the application through `pnpm dev:e2e` on
`127.0.0.1:3101`. It must never reuse an unknown process already
listening on port 3101.

## 4. Determinism

Automated tests should avoid unnecessary reliance on:

- wall-clock timing
- uncontrolled random data
- live external APIs
- another project
- undocumented machine-local state

Seed and test data should be deterministic where practical.

## 5. Quality gate

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

Never report a validation as passing unless it actually ran.

## 6. Critical commerce coverage

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

## 7. Authorization coverage

Test:

- admin-only routes/actions
- customer ownership
- cross-account access attempts
- order access
- address access
- wishlist access
- review mutation
- custom-video access

## 8. Review coverage

Test:

- verified-purchase eligibility
- unpurchased-product rejection
- duplicate-review policy
- review ownership
- image validation
- moderation authorization

## 9. Upload coverage

Test:

- invalid MIME type
- oversized files
- unsafe filenames
- path traversal attempts
- unauthorized private-media access
- cross-customer custom-video access

## 10. E2E application identity

Before stateful E2E execution, the test harness should eventually verify
that port 3101 is actually serving nomi-numi-shop.

Never silently fall back to port 3000 or another running project.

## 11. Regression policy

Reproducible defects should receive regression coverage where practical.

Do not weaken correct assertions merely to make an incorrect
implementation pass.
