# Nomi Numi Shop — Workflow Guide

This guide explains how CI workflows and code review work in this
project.

If you're new to the project, start here to understand how your changes
move from a local branch to `main`.

---

## What is a workflow?

A workflow is a YAML recipe that lives under `.github/workflows/`.

When you open a Pull Request, push new commits to an open PR, or merge
to `main`, GitHub automatically runs these workflows on a clean hosted
runner (a fresh Ubuntu virtual machine that GitHub provides).

You do not need to run these CI commands yourself — GitHub Actions
handles them automatically.

This project has one main workflow:

**PR Quality Gate** (`.github/workflows/pr-quality.yml`) — the merge gate

---

## What happens when you open or update a Pull Request?

When you push a branch and open a Pull Request to `main`, or when you
push new commits to an existing PR, GitHub automatically starts the
**PR Quality Gate** workflow.

This workflow runs several checks in parallel:

1. **Format check** — ensures all code is properly formatted with Prettier
2. **Lint** — runs ESLint to catch common errors and enforce code style
3. **Typecheck** — runs TypeScript compiler to verify type correctness
4. **Unit tests** — runs `pnpm test:ci` (the portable unit test suite)
5. **Production build** — runs `pnpm build` to verify the app can be built
6. **E2E tests** — installs Chromium and runs Playwright E2E tests with `pnpm test:e2e`

All of these checks must pass for the workflow to succeed.

The workflow job that branch protection watches is named exactly:

**`PR Quality Gate`**

This is the required status check that must be green before you can merge.

### What E2E tests run in CI?

The E2E suite in CI runs portable smoke tests that don't require local
Docker infrastructure:

- `tests/e2e/auth-ui.spec.ts` — public auth page smoke tests
- `tests/e2e/storefront.spec.ts` — homepage smoke tests

Tests that require local PostgreSQL or Mailpit (like
`tests/e2e/auth-security.spec.ts` and `tests/e2e/catalog-public.spec.ts`)
automatically skip when `CI=true` is set.

### What unit tests run in CI?

The `pnpm test:ci` command runs all portable unit tests that don't
require the workstation's canonical repository root or local Docker
resources.

It excludes path-locked tests like:

- `database-safety.test.ts`
- `drizzle-foundation.test.ts`
- `email-local-safety.test.ts`
- `auth-first-admin-bootstrap-local.test.ts`
- `catalog-schema-local.test.ts`
- `catalog-domain-local.test.ts`
- `catalog-fixtures-local.test.ts`
- `catalog-factories-local.test.ts`
- `catalog-public-local.test.ts`

These path-locked tests run locally with `pnpm test` but are skipped in CI.

---

## What is Nomi PR Verifier?

**Nomi PR Verifier** is an automated code review system that runs after
the PR Quality Gate succeeds.

### How it works

1. You open or update a Pull Request
2. GitHub Actions runs the PR Quality Gate workflow
3. When the Quality Gate passes, Nomi PR Verifier automatically reviews
   the changes
4. Nomi posts a comment on your PR with a verdict for that exact commit SHA

### Nomi verdicts

Nomi posts a comment that starts with `## Nomi PR Verifier` and includes
one of three verdicts:

- **PASS** — the changes look good; you may consider merging (but the
  human owner still makes the final decision)
- **HOLD** — Nomi has questions or suggestions; review them before merging
- **BLOCK** — Nomi found issues that should be fixed before merging

### Important: SHA-bound review

Every Nomi verdict is bound to a specific commit SHA (the PR HEAD at the
time of review).

If you push new commits to the PR, the old Nomi verdict becomes stale
and invalid. You must wait for a new Nomi review of the new HEAD commit.

**The latest Nomi comment is always the source of truth.**

Older comments remain visible for history but are no longer valid review
evidence.

### Nomi is advisory

Nomi PR Verifier provides automated review evidence, but it does not have
merge authority.

The human repository owner is the only one who can merge Pull Requests.

Even a `PASS` verdict means "you may consider merging," not "you must
merge now."

---

## Branch protection rules

The `main` branch has protection rules enabled:

- **Pull Requests required** — you cannot push directly to `main`
- **Required status check** — the `PR Quality Gate` job must pass
- **Require branches to be up to date** — your PR branch must be based
  on the latest `main`
- **Require conversation resolution** — all review conversations must be
  resolved
- **Enforce for administrators** — even admins must follow these rules
- **Do not allow force pushes** — cannot rewrite `main` history
- **Do not allow deletions** — cannot delete the `main` branch

### Approval requirements

Currently, the branch protection does not require approving reviews
(because this is a solo-owner project).

However, you should still wait for Nomi PR Verifier to review your changes.

### Helper labels

These labels can help organize PRs but are not enforced by GitHub:

- `ready-to-merge` — PR is ready for final review and merge
- `low-risk` — small, low-risk change
- `high-risk` — large or sensitive change that needs extra attention

---

## When is a PR ready to merge?

A Pull Request is ready to merge when all of the following are true:

1. ✅ The **PR Quality Gate** check is green on the current HEAD commit
2. ✅ **Nomi PR Verifier** has posted a `PASS` verdict for that same HEAD commit
3. ✅ All review conversations are resolved
4. ✅ The branch is up to date with the latest `main`
5. ✅ You have reviewed the complete diff and are satisfied with the changes

### Exact-SHA merge evidence

Merge evidence requires all three of these to point to the same commit:

```
current PR HEAD SHA
=
successful PR Quality Gate SHA
=
latest Nomi PR Verifier reviewed SHA
```

If they don't match, you need to wait for CI and Nomi to re-run on the
current HEAD.

### Don't merge if...

- ❌ The PR Quality Gate failed
- ❌ Nomi posted `BLOCK` or `HOLD` (fix the issues first)
- ❌ The latest Nomi verdict is for an older commit (wait for new review)
- ❌ You haven't reviewed the changes yourself
- ❌ There are unresolved review conversations

---

## Local development commands

While CI runs automatically on GitHub, you can (and should) run quality
checks locally before pushing.

### Quick health check

```bash
pnpm health
```

This runs the portable quality checks:

- Format check
- Lint
- Typecheck
- `pnpm test:ci` (portable unit tests)
- `pnpm build`

This does **not** run E2E tests.

### Full local health check

```bash
pnpm health:local
```

This runs `pnpm health` plus path-locked local tests that require the
workstation canonical root and owned Docker resources.

### Local E2E tests

```bash
pnpm test:e2e
```

Runs all Playwright tests, including those that require local PostgreSQL
and Mailpit.

For full E2E coverage, you need:

- Development PostgreSQL running (`pnpm db:dev:up`)
- Mailpit running (`pnpm email:up`)
- DEV catalog fixtures seeded (`pnpm catalog:seed:dev -- --confirm SEED-NOMI-DEV-CATALOG`)
- `.env.local` configured with auth secrets

### Force CI environment locally

```bash
CI=true pnpm test:e2e
```

This runs only the portable E2E tests, skipping tests that require local
infrastructure (same as what runs in GitHub Actions).

### Preflight checks

Before opening a PR, you can run the preflight script:

```bash
./scripts/preflight.sh phase1
```

This verifies:

- Repository ownership and state
- Git configuration
- Node/pnpm versions
- Cursor rules are present
- Docker resources are not conflicting
- Database safety guards
- Format, lint, typecheck, tests, and build all pass

### Wait for CI and Nomi

There is no automated script to wait for CI and Nomi yet.

After pushing, you need to:

1. Open your PR on GitHub
2. Watch the Actions tab for the PR Quality Gate to complete
3. Wait for Nomi PR Verifier to post its review comment

---

## Day-to-day development workflow

Here's the typical workflow from start to merge:

### 1. Create a branch

```bash
git switch main
git pull --ff-only origin main
git checkout -b feature/my-feature
```

### 2. Make your changes

Edit files, write tests, run local checks:

```bash
pnpm health
pnpm test:e2e  # if you changed UI or API behavior
```

### 3. Commit and push

```bash
git add .
git commit -m "feat: add my feature"
git push -u origin feature/my-feature
```

### 4. Open a Pull Request

Go to GitHub and open a Pull Request from your branch to `main`.

### 5. Wait for CI

GitHub Actions will automatically run the PR Quality Gate.

Watch the "Checks" tab on your PR to see progress.

### 6. Wait for Nomi

After the PR Quality Gate passes, Nomi PR Verifier will automatically
review your changes and post a comment.

### 7. Address feedback

If Nomi posts `HOLD` or `BLOCK`, or if you notice issues during review:

```bash
# Fix the issues
git add .
git commit -m "fix: address review feedback"
git push
```

This will trigger CI and Nomi again on the new HEAD.

### 8. Merge when ready

When everything is green and Nomi has posted `PASS` for the current HEAD:

1. Review the complete diff one more time
2. Make sure all conversations are resolved
3. Click "Squash and merge" on GitHub

GitHub will squash all your commits into one and merge to `main`.

### 9. Clean up

After the PR is merged:

```bash
git switch main
git pull --ff-only origin main
```

GitHub automatically deletes the merged branch on the remote.

---

## Understanding CI failures

### Format check failed

Your code is not formatted correctly.

**Fix:**

```bash
pnpm format
git add .
git commit -m "style: format code"
git push
```

### Lint failed

ESLint found issues in your code.

**Fix:**

```bash
pnpm lint
# Fix the issues manually
git add .
git commit -m "fix: resolve lint issues"
git push
```

### Typecheck failed

TypeScript found type errors.

**Fix:**

```bash
pnpm typecheck
# Fix the type errors
git add .
git commit -m "fix: resolve type errors"
git push
```

### Unit tests failed

One or more tests failed.

**Fix:**

```bash
pnpm test:ci
# Fix the failing tests or the code
git add .
git commit -m "fix: resolve test failures"
git push
```

### Build failed

The production build failed.

**Fix:**

```bash
pnpm build
# Fix the build errors
git add .
git commit -m "fix: resolve build errors"
git push
```

### E2E tests failed

Playwright tests failed.

**Fix:**

```bash
pnpm test:e2e
# Fix the failing tests or the code
git add .
git commit -m "fix: resolve E2E test failures"
git push
```

---

## Common questions

### Do I need to run CI commands myself?

No. GitHub Actions runs them automatically when you push to a PR.

However, you should run `pnpm health` and `pnpm test:e2e` locally before
pushing to catch issues early.

### What if CI is green but Nomi says BLOCK?

You should fix the issues Nomi identified. Nomi often catches problems
that automated tests miss.

Even though Nomi is advisory, a `BLOCK` verdict means Nomi found
something that could cause problems.

### Can I merge if Nomi says HOLD?

Technically yes (Nomi is advisory), but you should review Nomi's feedback
first.

`HOLD` means Nomi has questions or suggestions that you should consider
before merging.

### What if I push new commits while CI is running?

GitHub Actions will cancel the old workflow run and start a new one for
the new HEAD commit.

You don't need to do anything — just wait for the new run to complete.

### How long does CI take?

Typically 5-10 minutes for the full PR Quality Gate workflow.

Format, lint, and typecheck are fast (under 1 minute).
Tests and build take longer (3-5 minutes).
E2E tests can take a few minutes depending on the suite.

### Why do some tests skip in CI?

Some tests require the workstation's canonical repository root
(`/home/pav4o71/Projects/nomi-numi-shop`) or local Docker resources
(PostgreSQL, Mailpit).

These path-locked tests run in local `pnpm test` but are skipped in CI
because GitHub Actions doesn't have access to your local infrastructure.

### Can I re-run CI without pushing new commits?

Yes. On the GitHub PR page, go to the "Checks" tab, find the failed
workflow run, and click "Re-run all jobs."

However, if the failure is deterministic, re-running won't help — you
need to fix the issue and push a new commit.

### Do I need to wait for Nomi on every commit?

Yes. Every new commit invalidates the previous Nomi verdict.

You must wait for Nomi to review the current HEAD before considering the
PR ready to merge.

---

## Related documentation

For more detailed information:

- **README.md** — project overview and getting started
- **AGENTS.md** — agent instructions and safety rules
- **docs/GIT_WORKFLOW.md** — Git branching and PR workflow
- **docs/TESTING.md** — detailed testing guide
- **docs/ARCHITECTURE.md** — system architecture
- **docs/PROJECT_PLAN.md** — project phases and roadmap
