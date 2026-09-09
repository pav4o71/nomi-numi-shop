# Nomi Numi Shop — Bugbot Review Policy

Review this repository as a production-oriented ecommerce application.

Do not merely summarize the diff.

Actively search for defects, regressions, security problems, data
integrity problems, unsafe infrastructure behavior, and violations of
project architecture.

## Project boundary

Flag any change that could modify or depend on resources outside:

`/home/pav4o71/Projects/nomi-numi-shop`

unless explicitly justified.

Known protected resources include:

- sibling repositories documented in `docs/PROTECTED_RESOURCES.md`
- Docker container `beautybook3-pg`
- host port `5433`
- Docker resources not proven to belong to this project

Flag destructive commands that do not prove project ownership.

## Git / automation safety

Flag scripts or workflows that may:

- run from the wrong repository
- force push
- reset unrelated state
- clean untracked files broadly
- delete unknown Docker resources
- prune system-wide Docker resources
- operate outside the project root

## Database

Flag:

- migrations without target validation
- test code capable of hitting development data
- destructive operations without environment guards
- unsafe schema changes
- missing transaction handling where atomicity matters
- race conditions
- incorrect uniqueness constraints
- missing foreign-key behavior
- irreversible destructive migration without justification

Development target:

`127.0.0.1:55432 / nomi_numi_shop_dev`

Test target:

`127.0.0.1:55433 / nomi_numi_shop_test`

Port `5433` is prohibited for webshop database operations.

## Authentication and authorization

Pay special attention to:

- missing server-side authorization
- IDOR / cross-customer access
- admin privilege escalation
- unsafe role changes
- session handling
- password reset
- email verification
- protected uploads
- custom video access

UI hiding is not authorization.

## Ecommerce correctness

Review monetary logic carefully.

Flag:

- floating-point money
- missing currency handling
- incorrect PHP/USD price selection
- double discount application
- invalid promotion stacking
- negative totals
- incorrect tax/shipping calculations
- stale cart pricing
- order-price mutation after checkout

Review inventory logic for:

- overselling
- reservation races
- double stock decrement
- cancellation restoration
- refund/return consistency
- variant-level stock correctness
- local versus dropship fulfillment mistakes

## Reviews

Verified-buyer reviews must actually verify purchase eligibility.

Review for:

- reviewing unpurchased products
- duplicate review abuse
- cross-account modification
- unsafe image uploads
- moderation/reporting authorization defects

## Files and uploads

Flag:

- path traversal
- public exposure of private custom videos
- trusting client filenames
- missing MIME/size validation
- predictable private file URLs
- unauthorized download endpoints

## Secrets

Flag:

- secrets committed to Git
- credentials in logs
- unsafe environment templates
- production secrets in tests
- tokens in client-side bundles

## API / server boundaries

Flag:

- trusting client-provided prices
- trusting client-calculated discounts
- trusting client inventory values
- missing validation
- missing authorization
- missing idempotency where duplicate requests could cause financial or
  inventory damage

## Testing

Flag meaningful behavior changes without suitable validation.

Do not accept tests that merely mirror implementation details while
missing the business invariant.

For bug fixes, prefer regression coverage.

## Scope

Flag unrelated refactors or dependency changes mixed into a focused PR
when they increase review risk.

## Review severity

Prioritize findings that can cause:

1. security compromise;
2. data loss;
3. incorrect charges;
4. inventory corruption;
5. customer privacy exposure;
6. cross-project damage;
7. deployment breakage;
8. material ecommerce behavior regression.

Minor style preferences should not distract from substantive defects.
