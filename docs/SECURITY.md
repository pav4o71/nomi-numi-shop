# Nomi Numi Shop — Security Baseline

Security is a design requirement from the first implementation phase.

## 1. Authentication

Authentication library:

- Better Auth `1.7.3`
- `@better-auth/drizzle-adapter` `1.7.3`

Phase 2A/2B foundation status:

- server instance and `/api/auth/*` route exist
- core auth tables are migrated through Drizzle
- Phase 2B adds server-owned `user.role` (`customer` | `admin`)
- local runtime requires ignored `.env.local` with
  `BETTER_AUTH_SECRET` (>= 32 chars), explicit `BETTER_AUTH_URL`
  (`http://127.0.0.1:3100`), and DEV-only `DATABASE_URL`
- Phase 2C2 enables email/password with required verification and
  password reset through local Mailpit (`src/email/`)
- Phase 2C3 adds `createAuthClient` and customer auth UI; client
  session/role visibility is never authorization; plugins and social
  providers remain deferred (see `docs/AUTH.md`)
- Phase 2C1 provides project-owned Mailpit + `src/email/` transport

Phase 2C0 lifecycle rules implemented by Phase 2C2:

- open email/password customer signup; role always server `customer`
- unverified users must not receive or use an authenticated session
- public auth responses must avoid account enumeration
- email verification required; token lifetime **24 hours**; safe resend
- password-reset request is generic; reset token lifetime **1 hour**;
  successful reset revokes all sessions and requires fresh auth
- authenticated change-password is deferred past Phase 2C
- no social providers in Phase 2C
- production session/cookie hardening remains deferred
- session policy: `expiresIn` 7 days, `updateAge` 1 day

See `docs/AUTH.md`.

## 2. Authorization

Sensitive actions require server-side authorization.

UI visibility is never sufficient access control.

Phase 2B primitives (`src/auth/authorization.ts`) authorize only from a
server-validated Better Auth session (`auth.api.getSession`) plus
runtime role validation. Cookie existence and client-visible role
claims are never authorization proof.

Application roles are mutually exclusive exact values:

- `customer` (default for new users)
- `admin`

There is no role hierarchy and no `OWNER` application role. Missing or
unknown role fails closed. "Owner" in product language means the human
shop owner, not an auth role.

Role is configured with Better Auth `input: false` so ordinary
user/API/provider input cannot choose `admin`. No Admin plugin.

Protected-surface rules (Phase 2C5):

- customer surfaces: exact `customer`
- admin surfaces: exact `admin`
- admin is not implicitly a customer
- unauthenticated pages redirect safely to login
- unauthenticated APIs: `401` / `UNAUTHENTICATED`
- wrong-role APIs: `403` / `FORBIDDEN`
- prefer server-side guards; no client-only authorization

Authorization must protect (in later phases that wire routes):

- admin functions
- customer profiles
- addresses
- orders
- reviews
- wishlists
- private uploads
- custom videos

Cross-customer access must fail closed.

## 3. Admin role

Phase 2B defines the `admin` application role and server checks
(`requireAdmin`). Multiple admins are allowed.

Phase 2C4 first-admin provisioning (DEV/TEST only) is implemented via
`pnpm auth:bootstrap-first-admin`:

- promote an existing verified `customer`
- only while zero admins exist
- zero-admin check + promotion as one race-safe guarded operation
- no HTTP/self-promotion, env-email auto-promotion, or seed/migration
  admin creation
- no general promotion/demotion API in Phase 2C
- production admin bootstrap remains separately authorized later

There must be no public/customer-accessible mechanism for self-promotion
to `admin`.

## 4. Sessions

Local Phase 2C session policy (locked):

- `expiresIn`: 7 days
- `updateAge`: 1 day
- logout invalidates the current server session and clears auth state
- authorization path remains getSession → validated principal →
  exact-role decision

Production session configuration must use appropriate secure cookie and
transport settings when a production phase authorizes it.

Do not expose session tokens to client-side code unnecessarily.

Authentication and authorization failures fail closed.

## 5. Secrets

Never commit or expose:

- passwords
- database credentials
- authentication secrets
- API keys
- payment secrets
- provider tokens
- private keys
- webhook secrets

Safe environment templates contain placeholders only.

## 6. Input validation

Untrusted input is validated server-side.

Examples:

- account forms
- admin forms
- route parameters
- query parameters
- reviews
- checkout
- coupons
- uploads
- APIs
- webhooks

## 7. Commerce authority

Never trust client-provided authoritative:

- price
- discount
- inventory
- shipping cost
- order total
- payment state

Server-side commerce logic recalculates authoritative values.

## 8. Idempotency

Financial and inventory-sensitive actions must support idempotency where
duplicate execution could cause damage.

Duplicate requests must not cause duplicate:

- orders
- inventory deductions
- charges
- refunds
- webhook processing

## 9. Upload security

Uploads must validate:

- authorization
- MIME type
- file size
- allowed formats
- server-generated filename
- ownership
- destination

Do not trust client filenames.

Prevent path traversal.

Private custom videos must not be stored in public static storage.

## 10. Web security

Production-readiness should include appropriate:

- HTTPS
- secure cookies
- origin/CSRF protections appropriate to the chosen auth/framework flow
- Content Security Policy
- security headers
- rate limiting
- authorization checks

Do not disable security controls merely to bypass an integration issue.

## 11. Rate limiting

Sensitive flows requiring protection include:

- login
- registration
- password reset
- review creation
- upload operations
- checkout
- coupon attempts
- provider/webhook endpoints where relevant

Exact implementation is selected later.

## 12. Auditability

Important security and commerce actions should eventually create
auditable events where useful.

Examples:

- human shop-owner / admin actions
- inventory adjustments
- order-state changes
- refund actions
- sensitive account changes

Audit logs must not contain secrets.

## 13. Dependencies

Security-sensitive dependencies require justification.

Do not introduce packages merely because an implementation agent is
familiar with them.

Use maintained dependencies compatible with the approved architecture.
