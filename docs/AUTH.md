# Nomi Numi Shop — Authentication Foundation (Phase 2A)

Phase 2A establishes the minimum secure Better Auth infrastructure.
It does **not** deliver login/signup UI, roles, email delivery, or
production authentication.

## Versions

Pinned exactly:

- `better-auth@1.7.3`
- `@better-auth/drizzle-adapter@1.7.3`

Do not install `@better-auth/cli` as a project dependency. One-time
schema generation may use `pnpm dlx auth@1.7.3` when needed.

## Schema and migrations

Canonical Better Auth core schema:

- `src/db/schema/auth.ts`

Exported through the single Drizzle entry:

- `src/db/schema/index.ts`

Core tables (Better Auth 1.7.3 generator output):

- `user`
- `session`
- `account`
- `verification`

No application `role`, admin, organization, or commerce fields are added
in Phase 2A.

Migrations remain Drizzle-managed under `drizzle/`. Do **not** run
Better Auth's database migrate command. Phase 2A migration:

- `drizzle/0001_phase2a_better_auth.sql`

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

## Explicitly not enabled in Phase 2A

- email/password authentication
- social providers
- Better Auth plugins
- client auth instance (`createAuthClient`)
- signup/login/logout UI
- email verification / Mailpit auth emails
- CUSTOMER / ADMIN roles
- authorization middleware / `proxy.ts` protection
- production cookies / production database auth

## Storefront independence

The public homepage must start and render without PostgreSQL.
Auth modules initialize lazily when `/api/auth` is invoked.
`pnpm build` must not require a running database.

## Next phases

- Phase 2B — customer/admin identity roles and server authorization model
- Phase 2C — auth lifecycle, UI, email verification, password reset, E2E
