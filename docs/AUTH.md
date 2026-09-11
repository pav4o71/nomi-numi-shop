# Nomi Numi Shop — Authentication and Authorization Foundation

Phase 2A established the minimum secure Better Auth infrastructure.
Phase 2B adds application roles and **server** authorization primitives.
Neither phase delivers login/signup UI, email delivery, or production
authentication.

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

## Application roles (Phase 2B)

Exactly two mutually exclusive roles:

- `customer` (default)
- `admin`

There is **no** role hierarchy. `customer` is not implicitly `admin`.
`admin` is not implicitly `customer`. Exact-role checks only.

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

Admin provisioning, role mutation APIs, hard-coded admin emails/IDs,
and bootstrap scripts are intentionally out of scope for Phase 2B.

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

Lazy runtime database client:

- `src/db/runtime.ts`

Better Auth server instance:

- `src/auth/server.ts`

Next.js App Router handler:

- `src/app/api/auth/[...all]/route.ts`
- public path: `/api/auth/*`
- uses `toNextJsHandler` from `better-auth/next-js`

## Explicitly not enabled yet

- email/password authentication
- social providers
- Better Auth plugins (including Admin / Organization)
- client auth instance (`createAuthClient`)
- signup/login/logout UI
- email verification / Mailpit auth emails
- role mutation endpoints
- admin bootstrap / first-admin provisioning
- route protection / `proxy.ts` / `middleware.ts`
- production cookies / production database auth

## Storefront independence

The public homepage must start and render without PostgreSQL.
Auth modules initialize lazily when `/api/auth` is invoked.
`pnpm build` must not require a running database.
Phase 2B does not add storefront UI for roles or login.

## Next phase

- Phase 2C — auth lifecycle, UI, email verification, password reset,
  session security, first-admin provisioning decision, protected
  surfaces/E2E where appropriate
