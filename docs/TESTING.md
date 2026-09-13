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
    pnpm test:ci
    pnpm test:watch
    pnpm test:e2e
    pnpm test:all

`pnpm test:ci` is the portable GitHub Actions unit suite. It excludes
path-locked `database-safety`, `drizzle-foundation`,
`email-local-safety`, `auth-first-admin-bootstrap-local`, and
`catalog-schema-local` tests that require the workstation canonical root
and/or owned local PostgreSQL. Local full coverage remains `pnpm test`.

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
- `tests/unit/auth-lifecycle.test.ts` (Phase 2C2 email/password,
  verification/reset policy, and email-callback wiring)
- `tests/unit/auth-ui.test.ts` (Phase 2C3 auth client, safe copy,
  no role inputs, no client authorization assumptions)
- `tests/unit/auth-first-admin-bootstrap.test.ts` (Phase 2C4 portable
  CLI surface, confirmation/production refusals, no HTTP role mutation)
- `tests/unit/auth-first-admin-bootstrap-local.test.ts` (Phase 2C4
  path-locked DEV/TEST promotion, race-safety, wrapper smoke; local
  `pnpm test` only)
- `tests/unit/catalog-schema.test.ts` (Phase 3A portable schema/migration
  contract checks)
- `tests/unit/catalog-schema-local.test.ts` (Phase 3A path-locked TEST DB
  constraint enforcement; local `pnpm test` only)
- `tests/unit/catalog-domain.test.ts` (Phase 3B portable slug/money/
  combination/error-boundary unit coverage)
- `tests/unit/catalog-domain-local.test.ts` (Phase 3B path-locked TEST DB
  repository/service integration; local `pnpm test` only)
- `tests/unit/auth-protected-surfaces.test.ts` (Phase 2C5 page guards,
  API 401/403 mapping, safe next paths / open-redirect refusals,
  client UX is not authorization; portable)
- `tests/unit/auth-security-closure.test.ts` (Phase 2C6 portable
  contracts: origins, revocation policy, enumeration copy, open-redirect,
  test-hook removal, E2E wiring)
- `tests/e2e/auth-ui.spec.ts` (Phase 2C3 public auth page smoke +
  Phase 2C5 `/forbidden` landing; portable CI)
- `tests/e2e/auth-security.spec.ts` (Phase 2C6 live lifecycle/security
  evidence via browser + Mailpit + DEV Postgres; skipped when `CI=true`;
  required for local `pnpm test:e2e` closure)

Local email / Mailpit coverage lives in:

- `tests/unit/email-foundation.test.ts` (portable)
- `tests/unit/email-local-safety.test.ts` (path-locked helper/ownership)

Playwright starts the application through `pnpm dev:e2e` on
`127.0.0.1:3101`. It must never reuse an unknown process already
listening on port 3101. Local live auth E2E overrides
`BETTER_AUTH_URL=http://127.0.0.1:3101` for the Playwright webServer so
verification/reset links match the E2E origin. Auth runtime still uses
DEV Postgres (`55432` / `nomi_numi_shop_dev`) only.

### Live auth E2E vs portable CI

`pnpm test:e2e` in GitHub Actions runs portable Chromium smoke
(`auth-ui`, storefront). Live `auth-security` cases detect `CI` and
skip. Full local closure requires owned DEV Postgres, Mailpit, and
`.env.local`, then `pnpm test:e2e` without `CI`.

`pnpm test:ci` still excludes path-locked suites
(`database-safety`, `drizzle-foundation`, `email-local-safety`,
`auth-first-admin-bootstrap-local`, `catalog-schema-local`,
`catalog-domain-local`). Local full unit coverage remains `pnpm test`
(includes first-admin, Phase 3A catalog constraint, and Phase 3B catalog
domain TEST DB regression).

## 4. Determinism

Automated tests should avoid unnecessary reliance on:

- wall-clock timing
- uncontrolled random data
- live external APIs
- another project
- undocumented machine-local state

Seed and test data should be deterministic where practical.

## 5. Quality gate

### Portable GitHub Actions gate

From Phase 2C onward, every Pull Request and every push to `main` runs
the portable workflow:

`.github/workflows/pr-quality.yml`

Stable check name:

`PR Quality Gate`

Exact portable commands (in order):

1. `pnpm install --frozen-lockfile`
2. `pnpm format:check`
3. `pnpm lint`
4. `pnpm typecheck`
5. `pnpm test:ci` (portable unit tests; excludes path-locked
   `database-safety`, `drizzle-foundation`, `email-local-safety`,
   `auth-first-admin-bootstrap-local`, and `catalog-schema-local`
   suites that require the workstation canonical root and/or owned
   local PostgreSQL)
6. `pnpm build`
7. Chromium install for Playwright (`playwright install --with-deps chromium`)
8. `pnpm test:e2e`

That workflow uses read-only repository permissions. It does not use
production secrets, production resources, `pull_request_target`, write
permissions, automatic merge, or protected workstation Docker resources
such as `beautybook3-pg` / host port `5433`.

Workstation-specific checks that require the local canonical root,
protected Docker state, reserved host ports, or owned Compose PostgreSQL
remain local-only (`./scripts/preflight.sh`, `pnpm test`, `pnpm db:*`).
Do not duplicate those in GitHub Actions. Full local unit coverage is
still `pnpm test`.

### Local validation

As implementation develops, the standard local validation pipeline
should include:

1. formatting
2. lint
3. TypeScript
4. unit tests
5. integration tests where applicable (local only when they need owned
   Docker/database resources)
6. Playwright E2E where applicable
7. production build
8. Git diff/status review

Never report a validation as passing unless it actually ran.

Any new commit on a Pull Request invalidates the previous reviewed HEAD.
Re-run relevant CI and review on the new HEAD before merge.

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
