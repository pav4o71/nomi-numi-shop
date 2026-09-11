# Nomi Numi Shop — Security Baseline

Security is a design requirement from the first implementation phase.

## 1. Authentication

Authentication library:

- Better Auth `1.7.3`
- `@better-auth/drizzle-adapter` `1.7.3`

Phase 2A foundation status:

- server instance and `/api/auth/*` route exist
- core auth tables are migrated through Drizzle
- local runtime requires ignored `.env.local` with
  `BETTER_AUTH_SECRET` (>= 32 chars), explicit `BETTER_AUTH_URL`
  (`http://127.0.0.1:3100`), and DEV-only `DATABASE_URL`
- email/password, social providers, plugins, roles, and auth UI are
  **not** enabled yet

Later phases will add:

- registration
- login
- logout
- email verification
- password reset
- session policy hardening for production

See `docs/AUTH.md`.

## 2. Authorization

Sensitive actions require server-side authorization.

UI visibility is never sufficient access control.

Authorization must protect:

- admin functions
- customer profiles
- addresses
- orders
- reviews
- wishlists
- private uploads
- custom videos

Cross-customer access must fail closed.

## 3. OWNER role

Initial administration model:

- one OWNER account

There must be no public/customer-accessible mechanism for promoting an
account to OWNER.

Role mutation must be explicitly authorized.

## 4. Sessions

Production session configuration must use appropriate secure cookie and
transport settings.

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

- owner actions
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
