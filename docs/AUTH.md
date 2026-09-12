# Nomi Numi Shop — Authentication and Authorization Foundation

Phase 2A established the minimum secure Better Auth infrastructure.
Phase 2B added application roles and **server** authorization primitives.
Phase 2C0 locks the auth lifecycle architecture for implementation in
Phases 2C1–2C6. Implementation of email/password, Mailpit, UI, bootstrap
tooling, and protected surfaces remains deferred to those later steps.

## Versions

Pinned exactly:

- `better-auth@1.7.3`
- `@better-auth/drizzle-adapter@1.7.3`

Do not install `@better-auth/cli` as a project dependency. One-time
schema generation may use `pnpm dlx auth@1.7.3` when needed.

## Schema and migrations

Canonical Better Auth schema:

- `src/db/schema/auth.ts`

Exported through the single Drizzle entry:

- `src/db/schema/index.ts`

Core tables (Better Auth 1.7.3 generator output):

- `user` (includes Phase 2B `role`)
- `session`
- `account`
- `verification`

Migrations remain Drizzle-managed under `drizzle/`. Do **not** run
Better Auth's database migrate command.

- `drizzle/0001_phase2a_better_auth.sql` — core auth tables
- `drizzle/0002_phase2b_auth_role.sql` — `user.role` extension

`user.role` may be null at the database layer. Authorization treats
missing/null/unknown role as fail-closed invalid state and never silently
maps it to `customer` or `admin`.

## Application roles (locked)

Exactly two mutually exclusive roles:

- `customer` (default)
- `admin`

There is **no** role hierarchy. `customer` is not implicitly `admin`.
`admin` is not implicitly `customer`. Exact-role checks only.

There is **no** `OWNER` application role. In product and documentation
language, "owner" means the human shop owner, not an auth role.

Multiple admins are allowed. There is no one-admin cardinality constraint.

Role source of truth:

- Better Auth `user.additionalFields.role`
- server-owned (`input: false`)
- returned on validated server session/user (`returned: true`)
- application default: `customer`

Configured in:

- `src/auth/roles.ts`
- `src/auth/server.ts`

Critical security property:

- ordinary user/API/provider input must never choose `admin`
- client-visible role is **not** authorization proof

Missing, null, unknown, or malformed role fails closed as invalid
authorization state. It is never silently mapped to `customer` or
`admin`.

The Better Auth Admin plugin is **not** used (no ban/impersonation/
admin-management endpoints or schema).

## First-admin provisioning (locked for Phase 2C4)

Phase 2C4 will provide guarded **DEV/TEST-only** bootstrap tooling that:

- promotes an existing **verified** `customer` to `admin`
- is allowed **only while zero admins exist**
- performs the zero-admin check and promotion as one race-safe guarded
  operation
- refuses production targets and production environments

Explicitly forbidden in Phase 2C:

- HTTP or self-promotion paths
- automatic env-email promotion
- migration/seed-created admin users
- general promotion/demotion APIs

Production admin bootstrap remains deferred to a separately authorized
production phase.

## Signup and login policy (locked for Phase 2C2/2C3)

- Open email/password customer signup
- Role is always server-controlled `customer` (`input: false`)
- Unverified users must not receive or use an authenticated session
- Public signup/login behavior must not reveal whether an email is
  already registered
- No social providers in Phase 2C

## Email verification (locked for Phase 2C2/2C3)

- Email verification is required before an authenticated session
- Send a verification email after signup
- Safe resend is allowed
- Verification token lifetime: **24 hours**
- Invalid or expired verification fails safely and may lead to resend
- Successful verification may auto-sign-in
- Public responses must avoid account enumeration

## Password reset (locked for Phase 2C2/2C3)

- Forgot-password requests return a generic response regardless of
  whether the account exists
- Reset token lifetime: **1 hour**
- Successful reset revokes all existing sessions
- Fresh authentication is required afterward
- Authenticated change-password is deferred to the later customer-account
  phase (not Phase 2C)

## Session and security policy (locked)

Local Phase 2C session policy:

- `expiresIn`: **7 days**
- `updateAge`: **1 day**
- Logout invalidates the current server session and clears auth state
- Authorization remains:
  1. `getAuth().api.getSession({ headers })`
  2. validated principal `{ userId, role }`
  3. exact-role decision
- Never trust cookie existence or client-visible role data alone

Production secure-cookie / HTTPS session hardening remains deferred.

## Protected surfaces (locked for Phase 2C5)

- Customer surfaces require exact `customer` (`requireCustomer`)
- Admin surfaces require exact `admin` (`requireAdmin`)
- Admin is **not** implicitly a customer
- Unauthenticated pages redirect safely to login
- Unauthenticated APIs return `401` / `UNAUTHENTICATED`
- Wrong-role APIs return `403` / `FORBIDDEN`
- Invalid/missing role fails closed (`INVALID_AUTHORIZATION_STATE`)
- Prefer server-side guards using existing authorization primitives
- Do not introduce client-only authorization

Shared “any authenticated role” behavior uses `requireAuthenticated` only
when a surface is intentionally shared.

## Server authorization primitives

Module:

- `src/auth/authorization.ts`

Runtime trust boundary:

1. request `Headers`
2. `getAuth().api.getSession({ headers })`
3. runtime role validation
4. authorization principal `{ userId, role }`
5. exact role requirement

Primitives:

- `getAuthorizationPrincipal(headers)` — `null` when unauthenticated;
  valid principal for `customer`/`admin`; fail closed on invalid role
- `requireAuthenticated(headers)` — any valid role
- `requireCustomer(headers)` — exact `customer` only
- `requireAdmin(headers)` — exact `admin` only

Error codes:

- `UNAUTHENTICATED` — no session
- `FORBIDDEN` — valid role but wrong required role
- `INVALID_AUTHORIZATION_STATE` — authenticated but missing/unknown role

Infrastructure/`getSession` failures propagate. They are not mapped to
`null`, `401`, or `403`.

Cookie existence (`getSessionCookie` / cookie cache) is never used as
authorization.

## Runtime (local development only)

Ignored local environment file:

- `.env.local` (mode `600`, never commit)

Required variables:

- `BETTER_AUTH_SECRET` — high entropy, at least 32 characters
- `BETTER_AUTH_URL` — exactly `http://127.0.0.1:3100`
- `DATABASE_URL` — local DEV only (`127.0.0.1:55432`, `nomi_numi_shop_dev`, `nomi_numi_dev`)

Tracked placeholder template:

- `.env.example`

Runtime validation:

- `src/auth/env.ts` (`parseAuthRuntimeEnv`)
- auth initialization is rejected when `NODE_ENV=production`,
  `VERCEL=1`, or `VERCEL_ENV=production`; this foundation is local-only

Lazy runtime database client:

- `src/db/runtime.ts`

Better Auth server instance:

- `src/auth/server.ts`

Next.js App Router handler:

- `src/app/api/auth/[...all]/route.ts`
- public path: `/api/auth/*`
- uses `toNextJsHandler` from `better-auth/next-js`

## Implementation status vs locked design

Still **not implemented** (deferred to later 2C steps):

- email/password authentication (2C2)
- email verification / password-reset backend wiring (2C2)
- Mailpit / local email delivery (2C1)
- client auth instance (`createAuthClient`) and auth UI (2C3)
- first-admin bootstrap tooling (2C4)
- customer/admin protected surfaces (2C5)
- auth security + E2E closure (2C6)
- social providers
- Better Auth plugins (including Admin / Organization)
- general role-mutation endpoints
- production cookies / production database auth

## Storefront independence

The public homepage must start and render without PostgreSQL.
Auth modules initialize lazily when `/api/auth` is invoked.
`pnpm build` must not require a running database.

## Phase 2C boundaries

- **2C0** — auth architecture/design lock (this document)
- **2C1** — Mailpit / local email infrastructure
- **2C2** — email/password + verification/reset backend
- **2C3** — auth client + signup/login/logout/verify/reset UI
- **2C4** — guarded first-admin provisioning
- **2C5** — customer/admin protected surfaces
- **2C6** — auth security + E2E closure
