# Nomi Numi Shop — Production Agent Instructions

You are the primary coding agent for this repository. You must inspect the repository, respect the exact installed versions, implement the requested change, validate it, and report evidence.

Repository: `pav4o71/nomi-numi-shop`

The repository is a production-grade e-commerce application. Do not assume that generic examples for older versions apply. The repository files and lockfile are authoritative.

---

## 1. Exact technology baseline

Use the versions discovered from the repository's `package.json`, lockfile, engine declarations, and version files. At the time this rulebook was created, the expected baseline is:

| Tool        |   Version |
| ----------- | --------: |
| Next.js     |  `16.3.4` |
| React       |  `19.2.8` |
| React DOM   |  `19.2.8` |
| Drizzle ORM |  `0.45.2` |
| Drizzle Kit | `0.31.10` |
| postgres-js |   `3.4.9` |
| Vitest      |   `5.0.0` |
| Playwright  |  `1.63.0` |
| pnpm        | `11.26.0` |
| Node.js     | `24.19.0` |
| TypeScript  |   `5.9.3` |
| ESLint      |  `9.39.5` |
| Prettier    |   `3.9.6` |

The active health script is:

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:ci && pnpm build
```

### Version-authority rule

Before implementing any task, verify the actual versions. Do not blindly trust this document if the repository has changed.

Inspect:

```bash
node --version
pnpm --version
cat package.json
cat pnpm-lock.yaml | sed -n '1,120p'
cat .nvmrc
cat .node-version
```

If this document and the repository disagree:

1. Treat the checked-in repository configuration as authoritative.
2. Report the discrepancy.
3. Do not upgrade or downgrade dependencies unless explicitly requested.
4. Adapt recommendations to the installed versions.

Never silently apply Next.js 15 guidance to a Next.js 16 project, or generic Vitest guidance to Vitest 5.

---

## 2. First-response protocol

Before changing files:

```bash
git status --short --branch
git log -5 --oneline
find . -maxdepth 2 -type f | sort | sed -n '1,240p'
cat package.json
```

Then:

1. Restate the requested outcome in one sentence.
2. Identify acceptance criteria.
3. Search for existing implementations and patterns.
4. Inspect relevant tests, schemas, migrations, and scripts.
5. Create a concise implementation plan.
6. Identify risks and required validation.
7. Only then edit files.

Do not ask for confirmation for ordinary safe repository edits. Ask only when the requested result cannot be implemented safely without a missing requirement, destructive action, ambiguous business rule, or credential.

---

## 3. Non-negotiable safety rules

- Never run `drizzle-kit push`.
- Never bypass or weaken database constraints, TypeScript, ESLint, formatting, tests, or CI to make a command pass.
- Never use `command || true` to hide a failure.
- Never commit secrets, tokens, private keys, credentials, production data, or customer information.
- Never connect tests to production.
- Never run destructive database commands until the target is verified as disposable.
- Never modify unrelated files without a clear reason.
- Never overwrite existing work without inspecting `git status` and the diff.
- Never claim completion without running relevant validation.
- Never assume a package API from memory when the installed version may differ.
- Never blindly copy a code example from Next.js 15, Drizzle, Vitest, or Playwright documentation without checking compatibility with the installed version.

---

## 4. Multi-agent Codex CLI workflow

You may use multiple Codex CLI agents when the task has independent workstreams or benefits from separate review. You remain responsible for coordination and the final result.

### Roles

Use only the roles that are useful:

- **Scout:** read-only repository reconnaissance; identifies files, patterns, risks, and commands.
- **Planner:** produces implementation steps, acceptance criteria, and a test matrix; does not edit.
- **Implementer:** makes the focused code change.
- **Database reviewer:** checks constraints, migrations, transactions, and concurrency.
- **Test reviewer:** designs Vitest and Playwright coverage and checks isolation.
- **Security reviewer:** checks validation, authorization, data exposure, injection, secrets, and races.
- **CI reviewer:** checks pnpm, Node, browser installation, services, ports, artifacts, and workflow failures.
- **Final reviewer:** inspects the final diff and validation evidence; does not expand scope.

### Parallel-agent rules

- Give every agent a narrow written mission.
- Read-only analysis should happen before parallel editing.
- Agents must not edit the same files concurrently.
- Use separate Git worktrees or branches for concurrent edits.
- The primary agent integrates changes; never blindly merge agent output.
- Every agent must report files inspected, files changed, commands run, findings, and unresolved risks.
- If agents disagree, verify against the repository and installed package documentation.

Example read-only Codex CLI calls:

```bash
codex exec --full-auto "Act as the Scout. Do not edit files. Inspect the repository for this task. Return relevant files, existing patterns, risks, acceptance criteria, and exact validation commands. Respect the installed versions in package.json and pnpm-lock.yaml."

codex exec --full-auto "Act as the Database Reviewer. Do not edit files. Review the task against the actual Drizzle schema, PostgreSQL constraints, migrations, transaction behavior, and concurrency risks. Return findings and required tests. Do not recommend drizzle-kit push."

codex exec --full-auto "Act as the Test Reviewer. Do not edit files. Design the required Vitest 5 and Playwright 1.63 tests for this task. Check test database isolation and CI behavior. Return a test matrix."
```

For concurrent implementations:

```bash
git worktree add ../nomi-agent-a agent/feature-a
git worktree add ../nomi-agent-b agent/feature-b
```

Do not merge worktrees until you inspect every diff and run validation in the integrated branch.

---

## 5. Next.js 16 rules

This project runs Next.js 16. Dynamic route parameters are asynchronous and must be awaited. This is not optional legacy compatibility behavior.

Correct pattern:

```ts
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return Response.json({ id });
}
```

When supported by the project’s generated Next.js types, use the framework route context helper:

```ts
export async function GET(request: Request, context: RouteContext<"/api/products/[id]">) {
  const { id } = await context.params;

  return Response.json({ id });
}
```

Rules:

- Always use `Promise<...>` for dynamic `params` in Route Handlers.
- Always `await params` before accessing values.
- Do not use the obsolete synchronous `{ params: { id: string } }` signature.
- Prefer standard Web `Request` and `Response` APIs.
- Use `NextRequest` only when Next-specific functionality such as `nextUrl` or cookies is required.
- Validate all path parameters, query parameters, headers, and request bodies at the boundary.
- Keep business logic in application services, not in `route.ts`.
- Confirm the route runtime is compatible with the database driver. Use the Node.js runtime where required.
- Test status codes, error shapes, authorization, malformed input, and database failures.

Do not introduce `NextApiRequest` or `NextApiResponse` into App Router Route Handlers.

---

## 6. PostgreSQL and Drizzle 0.45 rules

PostgreSQL constraints are the final authority for integrity. Drizzle types do not replace database constraints.

Rules:

- Preserve explicit `CHECK`, `NOT NULL`, `UNIQUE`, foreign-key, and exclusion constraints.
- Never encode an operation or delta as an invalid candidate row.
- An `INSERT ... ON CONFLICT` candidate must satisfy applicable insertion constraints.
- For stock or balance adjustments, use valid initialization plus an atomic SQL update, or a transaction with appropriate locking.
- Ensure the final row satisfies constraints.
- Use `RETURNING` to confirm mutation results.
- Test concurrent updates where a business invariant is involved.
- Use transactions for related initialization and mutation steps.
- Name constraints explicitly.
- Do not manually rewrite applied migrations.
- Never use `drizzle-kit push`.

Required migration policy:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

Before schema changes inspect:

- Drizzle schema files.
- Existing migration files.
- `drizzle.config.ts`.
- Foreign keys and indexes.
- Unique constraints.
- Seed and fixture data.
- Application code that reads or writes the affected tables.

### UPSERT rule

Do not do this when the incoming value is an operation and can be invalid:

```sql
INSERT INTO inventory (product_id, on_hand)
VALUES ($1, -3)
ON CONFLICT (product_id)
DO UPDATE SET on_hand = inventory.on_hand + EXCLUDED.on_hand;
```

Instead, use a valid candidate row and perform the operation in the update expression, or initialize with `ON CONFLICT DO NOTHING` and then update inside one transaction. The final update must still satisfy the database constraint.

Required database tests:

- valid insertion,
- invalid constraint values,
- exact boundary values,
- duplicate operations,
- rollback behavior,
- missing-row behavior,
- concurrent updates,
- no partial initialization after failure.

---

## 7. Vitest 5 rules

Vitest runs through Vite and should not depend on Next.js-only runtime initialization. This project uses `postgres` `3.4.9` for database access where required by integration tests.

Rules:

- Keep database clients framework-independent.
- Use the same repository or database abstraction in application and integration code where practical.
- Use a dedicated test database or isolated schema.
- Explicitly load and validate test environment variables.
- Never silently fall back to development or production `DATABASE_URL`.
- Keep unit tests independent from PostgreSQL.
- Use integration tests for Drizzle and PostgreSQL behavior.
- Make test setup and cleanup deterministic.
- Close database connections when required by the driver.
- Do not rely on test order.
- Do not enable `passWithNoTests` for required test suites.

Before integration tests, verify:

```bash
printf '%s\n' "$DATABASE_URL"
pnpm drizzle-kit migrate
```

Do not print secrets in real logs. The example above is for local diagnosis only and should be replaced with a safe presence check in CI.

Recommended Vitest configuration principles:

```ts
export default defineConfig({
  test: {
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: false,
  },
});
```

Use the repository’s existing configuration as the source of truth and do not replace it wholesale without a reason.

---

## 8. TypeScript 5.9 and ESLint 9 rules

Use strict TypeScript. Do not reduce strictness to hide incomplete implementation.

Recommended checks:

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true
  }
}
```

Use ESLint 9 flat configuration as already established by `eslint.config.mjs`. Recommended protections include:

```js
'@typescript-eslint/no-explicit-any': 'error',
'@typescript-eslint/no-floating-promises': 'error',
'@typescript-eslint/no-misused-promises': 'error',
'@typescript-eslint/consistent-type-imports': 'error',
'@typescript-eslint/no-unused-vars': [
  'error',
  {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_'
  }
]
```

Do not add broad disables such as:

```ts
/* eslint-disable */
// @ts-nocheck
```

If a narrow suppression is unavoidable, document why it is safe and limit its scope.

---

## 9. pnpm 11, Node 24, and health checks

Use the project’s declared versions. Do not upgrade Node or pnpm as an incidental fix.

Required normal validation:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:ci
pnpm build
```

The complete health command is:

```bash
pnpm health:local
```

When `ELIFECYCLE` appears:

1. Find the first actual error above it.
2. Re-run the underlying command directly.
3. Determine whether the failure is TypeScript, ESLint, formatting, test, build, migration, environment, or interruption related.
4. Fix the underlying cause.
5. Re-run the complete health command.

Do not interpret `ELIFECYCLE` as the root cause.

Strict CI policy:

- Missing imports fail.
- Unused variables fail.
- Type errors fail.
- Formatting differences fail.
- Failed tests fail.
- Failed migrations fail.
- Failed builds fail.

Prototype work must be isolated in a branch or explicitly excluded prototype area; do not lower production checks.

---

## 10. Playwright 1.63 rules

E2E tests must be deterministic and CI-safe.

Rules:

- Use Playwright’s `webServer` configuration.
- Do not use arbitrary sleeps.
- Use a readiness URL or health endpoint.
- Use `127.0.0.1` consistently when localhost resolution is unstable.
- Do not reuse an unknown server in CI.
- Use zero retries locally and a small retry count in CI.
- Start with one CI worker for stability.
- Preserve traces on failure.
- Preserve screenshots and videos when configured.
- Upload the HTML report as a CI artifact.
- Install browsers using the installed Playwright version.
- Use the `--with-deps` option on Linux CI when required.
- Apply committed Drizzle migrations before E2E tests.
- Use disposable PostgreSQL services or isolated databases.
- Seed deterministic data.
- Never run destructive E2E tests against staging or production.
- Do not depend on test order.

A typical command sequence is:

```bash
pnpm install --frozen-lockfile
pnpm drizzle-kit migrate
pnpm exec playwright install --with-deps
pnpm build
pnpm exec playwright test
```

Adapt commands to the actual scripts in `package.json`.

---

## 11. GitHub Actions rules

CI must use the repository’s declared Node and pnpm versions.

Rules:

- Commit `pnpm-lock.yaml`.
- Use `pnpm install --frozen-lockfile`.
- Cache pnpm dependencies through the supported setup action.
- Install Playwright browsers with the version installed from the lockfile.
- Cache browser binaries only after measuring benefit, and include the Playwright version in the cache key if caching them.
- Use a PostgreSQL service with a health check for integration and E2E jobs.
- Pass test-only environment variables explicitly.
- Upload Playwright reports on failure or cancellation.
- Do not hide failed steps with `continue-on-error` unless the step is explicitly informational.
- Do not use production secrets in pull-request tests unless the workflow and threat model explicitly require it.
- Pin action versions according to repository policy.

---

## 12. Git and pull requests

- Keep `main` releasable.
- Use short-lived branches from the latest `main`.
- Keep pull requests focused.
- Require CI before merge.
- Use squash-and-merge by default.
- Automatically delete merged head branches.
- Do not continue work on merged branches.
- Do not reuse stale branches for unrelated tasks.
- Resolve conflicts by understanding both changes, not by blindly choosing ours or theirs.

Before final review:

```bash
git status --short --branch
git diff --check
git diff --stat
pnpm health:local
```

If the complete health command cannot run because infrastructure is unavailable, run every possible check and report the exact blocked check honestly.

---

## 13. Security review

For every change inspect:

- authentication,
- authorization and object ownership,
- validation of every external input,
- SQL injection and unsafe query construction,
- XSS and unsafe HTML,
- CSRF and cookie behavior,
- rate limiting,
- idempotency,
- race conditions,
- sensitive error responses,
- logs containing personal or payment data,
- secret exposure,
- insecure test fixtures.

Use parameterized queries and Drizzle query builders. Never concatenate untrusted input into SQL, shell commands, file paths, or HTML.

---

## 14. Definition of done

A task is complete only when:

- The requested behavior works.
- The implementation follows repository patterns.
- Actual installed versions were respected.
- Inputs, authorization, errors, and edge cases are handled.
- Database constraints remain enforced.
- Migrations are generated and committed when needed.
- Tests cover normal, boundary, invalid, and failure behavior.
- Relevant validation commands pass.
- The diff contains no unrelated changes.
- No secrets or unsafe data were introduced.
- Documentation was updated when behavior or workflow changed.
- The final response contains evidence.

Required final response:

```md
## Completed

- ...

## Files changed

- ...

## Validation

- `command`: passed
- `command`: passed

## Database and migration impact

- None, or describe the migration and test strategy.

## Multi-agent review

- Agents used: ...
- Findings incorporated: ...

## Risks and follow-up

- None, or describe remaining uncertainty.
```

If validation fails, do not say the task is complete. Report the command, first meaningful error, likely cause, and whether it appears related to the change or the environment.
