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

    pnpm test           # Full suite (portable + local)
    pnpm test:ci        # Portable only (for GitHub Actions)
    pnpm test:local     # Local-only path-locked suites
    pnpm test:watch     # Watch mode
    pnpm test:e2e       # Playwright E2E tests
    pnpm test:all       # Full unit + E2E

### Portable vs Local Test Split

**Portable (`pnpm test:ci`)** — runs on GitHub-hosted runners:

- Uses `import.meta.url` for repo-relative paths
- No hardcoded workstation paths
- No local Docker/PostgreSQL dependencies
- Safe for CI without owned infrastructure

**Local-only (`pnpm test:local`)** — requires workstation canonical root:

- `database-safety.test.ts` — verifies `/home/pav4o71/Projects/nomi-numi-shop`
- `drizzle-foundation.test.ts` — path-locked migration/schema checks
- `email-local-safety.test.ts` — path-locked Mailpit helper checks
- `auth-first-admin-bootstrap-local.test.ts` — DEV/TEST promotion via owned DB
- `catalog-schema-local.test.ts` — TEST DB constraint enforcement
- `catalog-domain-local.test.ts` — TEST DB repository/service integration
- `catalog-fixtures-local.test.ts` — TEST DB fixture preflight/install
- `catalog-factories-local.test.ts` — TEST DB factory persistence
- `catalog-public-local.test.ts` — TEST DB public reads

These path locks are **intentional safety guards** preventing accidental
mutation of external projects or databases. Local full coverage remains
`pnpm test` (portable + local).

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
- `tests/unit/catalog-fixtures.test.ts` (Phase 3C portable fixture
  manifest + DEV seed CLI surface + pure builders)
- `tests/unit/catalog-fixtures-local.test.ts` (Phase 3C path-locked TEST
  DB preflight/install/conflict/idempotency; local `pnpm test` only)
- `tests/unit/catalog-factories-local.test.ts` (Phase 3C path-locked TEST
  factories; local `pnpm test` only)
- `tests/unit/catalog-public.test.ts` (Phase 3D portable eligibility,
  listing From/exact, initial-variant tie-break, money display)
- `tests/unit/catalog-public-local.test.ts` (Phase 3D path-locked TEST DB
  public reads; local `pnpm test` only)
- `tests/support/catalog-builders.ts` / `catalog-factories.ts` (Phase 3C
  pure builders + persisted TEST factories using CatalogService)
- `tests/unit/database-runtime-env.test.ts` (portable DATABASE_URL-only
  runtime env validation; no Better Auth secrets)
- `tests/e2e/catalog-public.spec.ts` (Phase 3D public catalog smoke;
  skipped when `CI=true`; read-only against Phase 3C DEV fixtures;
  fails with a manual `pnpm catalog:seed:dev` setup hint when missing;
  never seeds/deletes DEV data)
- `tests/e2e/storefront.spec.ts` (portable homepage smoke; asserts
  Products/`/#` hrefs; must not navigate to catalog routes in CI)
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
(`auth-ui`, storefront). Live `auth-security` and `catalog-public` cases
detect `CI` and skip. Full local closure requires owned DEV Postgres,
seeded Phase 3C DEV fixtures (manual `pnpm catalog:seed:dev`), Mailpit
(for auth), and `.env.local`, then `pnpm test:e2e` without `CI`.

`pnpm test:ci` still excludes path-locked suites
(`database-safety`, `drizzle-foundation`, `email-local-safety`,
`auth-first-admin-bootstrap-local`, `catalog-schema-local`,
`catalog-domain-local`, `catalog-fixtures-local`,
`catalog-factories-local`, `catalog-public-local`). Local full unit
coverage remains `pnpm test` (includes first-admin, Phase 3A–3D catalog
TEST DB regression).

## 4. Determinism

Automated tests should avoid unnecessary reliance on:

- wall-clock timing
- uncontrolled random data
- live external APIs
- another project
- undocumented machine-local state

`pnpm test` runs unit files sequentially (`fileParallelism: false`) so
path-locked suites that share the owned TEST database do not race.
Portable `pnpm test:ci` remains independent of workstation PostgreSQL.

## 5. Quality gate

### Portable GitHub Actions gate

From Phase 2C onward, every Pull Request and every push to `main` runs
the portable workflow:

`.github/workflows/pr-quality.yml`

Stable check name:

`PR Quality Gate`

The workflow is split into parallel jobs for faster feedback:

1. **static** — format check, lint, typecheck
2. **unit-build** — `pnpm test:ci` (portable unit tests excluding
   path-locked `database-safety`, `drizzle-foundation`,
   `email-local-safety`, `auth-first-admin-bootstrap-local`,
   `catalog-schema-local`, `catalog-domain-local`,
   `catalog-fixtures-local`, `catalog-factories-local`, and
   `catalog-public-local` suites) + `pnpm build`
3. **e2e** — Chromium Playwright tests (`pnpm test:e2e`)
4. **quality-gate** — aggregator job named exactly `PR Quality Gate`
   that depends on all other jobs; required for branch protection

The **e2e** job is skipped for docs-only changes (when only `docs/**`,
`*.md`, and `.github/workflows/codeql.yml` are modified) to reduce
unnecessary CI time. The aggregator treats skipped e2e jobs as success.

On E2E test failure, Playwright traces, screenshots, and failure reports
are automatically uploaded as workflow artifacts (retained for 7 days).

The workflow uses minimal permissions (workflow-level `permissions: {}`;
job-level `contents: read` only). Third-party actions are pinned to full
commit SHAs for supply-chain security. The workflow does not use
production secrets, production resources, `pull_request_target`, write
permissions, automatic merge, or protected workstation Docker resources
such as `beautybook3-pg` / host port `5433`.

### CodeQL security scanning

`.github/workflows/codeql.yml` runs CodeQL analysis on:

- JavaScript/TypeScript application code (`security-extended` query suite)
- GitHub Actions workflows

CodeQL runs on schedule (weekly), pull requests, pushes to `main`, and
manual dispatch. It uses minimal permissions plus `security-events: write`
for uploading results.

Workstation-specific checks that require the local canonical root,
protected Docker state, reserved host ports, or owned Compose PostgreSQL
remain local-only (`./scripts/preflight.sh`, `pnpm test`, `pnpm db:*`).
Do not duplicate those in GitHub Actions. Full local unit coverage is
still `pnpm test`.

**Planned upgrade:** A follow-up PR will split the Quality Gate workflow
into separate static-check, unit-build, and E2E jobs with an aggregator
job still named `PR Quality Gate` for branch-protection compatibility.
The stable check name and required-pass policy remain unchanged.

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

## 6. Health check scripts

### Portable health gate

`pnpm health` runs the same sequence as the CI `PR Quality Gate`:

1. `pnpm format:check`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test:ci` (portable unit tests)
5. `pnpm build`

This script is portable and does not require local Docker resources,
workstation canonical root, or owned PostgreSQL. It matches GitHub Actions
CI validation except for E2E tests (which require a separate browser
install step).

### Local health with path-locked tests

`pnpm health:local` runs the portable health gate plus local-only tests:

    pnpm health:local

Expands to:

    pnpm health && pnpm test

This includes path-locked tests requiring the workstation canonical root
and/or owned local PostgreSQL (`database-safety`, `drizzle-foundation`,
`email-local-safety`, `auth-first-admin-bootstrap-local`,
`catalog-schema-local`, `catalog-domain-local`, `catalog-fixtures-local`,
`catalog-factories-local`, `catalog-public-local`).

Use `pnpm health:local` for comprehensive local validation before
requesting review. Use `pnpm health` for quick portable checks.

### Preflight validation

Development branches should pass preflight before implementation:

    pnpm preflight

Expands to:

    ./scripts/preflight.sh phase1

This validates project identity, Git state, runtime versions, Docker
ownership, reserved ports, and safety documentation. A failed preflight
is evidence to investigate, not bypass.

On synchronized `main`:

    git fetch --prune origin
    ./scripts/preflight.sh integration

See `docs/ENVIRONMENTS.md` for historical Phase 0 preflight modes.

### Wait for PR checks

After pushing a PR, wait for required checks to complete:

    ./scripts/wait-quality-and-nomi.sh <pr-number>

This script:

1. Captures the current PR HEAD SHA
2. Fails closed if the HEAD SHA changes during the wait
3. Waits for the `PR Quality Gate` check to succeed
4. Verifies the latest `Nomi PR Verifier` issue comment is for the exact
   SHA and shows `PASS` verdict
5. Exits with success when both checks are ready

Use this to confirm readiness before manual merge. The script never
auto-merges. It requires the GitHub CLI (`gh`) to be installed and
authenticated.

**Expected Nomi PR Verifier comment format:**

```
## Nomi PR Verifier
**HEAD reviewed:** `<40-hex-sha>`
...
### Verdict
**PASS** at `<sha>` ...
```

The script parses `**HEAD reviewed:** \`<sha>\`` (primary) or
`**PASS/BLOCK/HOLD** at \`<sha>\`` (fallback) and validates the verdict
matches the exact PR HEAD SHA.

## 7. Critical commerce coverage

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

## 8. Authorization coverage

Test:

- admin-only routes/actions
- customer ownership
- cross-account access attempts
- order access
- address access
- wishlist access
- review mutation
- custom-video access

## 9. Review coverage

Test:

- verified-purchase eligibility
- unpurchased-product rejection
- duplicate-review policy
- review ownership
- image validation
- moderation authorization

## 10. Upload coverage

Test:

- invalid MIME type
- oversized files
- unsafe filenames
- path traversal attempts
- unauthorized private-media access
- cross-customer custom-video access

## 11. E2E application identity

Before stateful E2E execution, the test harness should eventually verify
that port 3101 is actually serving nomi-numi-shop.

Never silently fall back to port 3000 or another running project.

## 12. Regression policy

Reproducible defects should receive regression coverage where practical.

Do not weaken correct assertions merely to make an incorrect
implementation pass.
