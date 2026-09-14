# Nomi Numi Shop — Git Workflow

## Stable branch

`main` is the stable integration branch.

Normal development must not occur directly on `main`.

GitHub server-side branch protection is enabled for `main`:

- Required status check: `PR Quality Gate` (strict / up-to-date with base)
- Required pull request reviews: 0 (solo owner; human remains merge authority)
- Dismiss stale reviews: true
- Enforce for admins: true
- Block force pushes: true
- Block deletions: true
- Require conversation resolution: true

The local pre-push hook provides additional workstation-level protection.

## Local hook activation

The hook file is version-controlled under:

- `.githooks/pre-push`

Git's `core.hooksPath` setting is repository-local configuration and is
not transferred automatically by clone.

After a fresh clone, activate the project hooks with:

    git config --local core.hooksPath .githooks

Then verify:

    git config --local --get core.hooksPath

Expected value:

    .githooks

Do not configure this globally because other repositories have their
own workflows.

## Branch types

Use narrowly scoped branches:

- `feature/*` for product functionality
- `fix/*` for defects
- `chore/*` for tooling and maintenance
- `docs/*` for documentation-only changes

Examples:

- `feature/catalog-foundation`
- `fix/inventory-reservation`
- `chore/ci-foundation`
- `docs/checkout-rules`

## Start work

Before creating a branch:

1. switch to `main`
2. fetch/update from `origin`
3. verify the working tree is clean
4. verify local `main` matches `origin/main`
5. create a new scoped branch

Do not begin feature work from a stale branch.

## Commit discipline

Commits should be small and coherent.

Before committing inspect:

- `git status --short`
- `git diff`
- staged diff
- recent Git history

Do not include unrelated changes.

Do not commit secrets or generated runtime data.

## Push discipline

Push the working branch, not `main`.

Example:

    git push -u origin feature/example

The repository-local pre-push hook rejects pushes targeting remote
`main`.

Do not bypass the hook during normal development.

## Pull Requests

All normal integration into `main` occurs through a Pull Request.

### Standard review model

| Role             | Responsibility                                           |
| ---------------- | -------------------------------------------------------- |
| Cursor Agent     | Implementation and remediation                           |
| GitHub Actions   | Deterministic PR quality gate (`PR Quality Gate`)        |
| Nomi PR Verifier | Automatic independent SHA-bound PR review for normal PRs |
| Human owner      | Sole merge authority                                     |

Nomi PR Verifier runs for normal Pull Requests. It is not limited to
security-sensitive phases.

### Exact-SHA merge evidence

Every new PR HEAD invalidates prior review evidence.

Merge evidence requires all three of the following to refer to the same
commit:

```
current PR HEAD SHA
=
successful PR Quality Gate SHA
=
latest Nomi PR Verifier reviewed SHA
```

Rules:

- the latest SHA-bound Nomi PR comment is the review source of truth
- older SHA verdicts remain historical but are stale
- `PASS` permits human merge consideration
- `BLOCK` requires remediation
- `HOLD` is not `PASS`
- do not manually create dummy commits merely to retrigger review
- do not treat a successful verifier routine execution by itself as
  `PASS`; the SHA-bound PR verdict/comment must exist
- the human owner remains the only merge authority

Do not invent unsupported review commands. Use the repository's
configured review mechanisms only.

### Before merge

- inspect changed files
- inspect the complete diff
- confirm GitHub Actions `PR Quality Gate` succeeded on the current PR
  HEAD SHA
- confirm CodeQL scans (if triggered) passed for the current HEAD SHA
- confirm the latest Nomi PR Verifier SHA-bound verdict is `PASS` for
  that same HEAD SHA
- run local quality checks when they cover workstation-only concerns
  that CI intentionally omits
- resolve discovered defects
- verify no unrelated changes
- verify the branch is based on current `main`

If validation finds a problem:

1. fix it on the same feature branch
2. commit the fix
3. push the branch
4. wait for CI and Nomi PR Verifier to re-run on the new HEAD
5. review again against the new HEAD SHA only

Do not merge known defects merely to continue to the next phase.

### Required status checks

The following GitHub Actions checks must pass on the exact PR HEAD SHA
before merge consideration:

- `PR Quality Gate` — aggregator job that depends on:
  - **static**: portable format, lint, typecheck
  - **unit-build**: `pnpm test:ci` + `pnpm build`
  - **e2e**: Chromium Playwright smoke tests (skipped for docs-only
    changes; uploaded artifacts on failure)
- CodeQL security analysis (when triggered by schedule or PR changes
  affecting code/workflows)

The aggregator job is the required status check for branch protection.
Individual jobs run in parallel for faster feedback. E2E tests are
path-filtered and skipped when only docs/markdown/config-doc paths change.

Local-only validation (workstation canonical root, owned Docker/Postgres
required):

- `./scripts/preflight.sh phase1` — verifies repository ownership,
  Docker resource isolation, database safety guards
- `pnpm test` — full unit coverage including path-locked
  `*-local.test.ts` suites that require the workstation canonical root
  and owned PostgreSQL on `127.0.0.1:55432` / `127.0.0.1:55433`

### Branch protection (enabled)

Branch protection is active for `main` with the following enforcement:

- ✅ Require pull request before merge
- ✅ Require status checks to pass before merge:
  - `PR Quality Gate` (strict / must be up-to-date with base)
- ✅ Require conversation resolution before merge
- ✅ Enforce for administrators
- ✅ Block force pushes
- ✅ Block branch deletion

Pull request reviews are not required (solo owner repository; human owner
remains sole merge authority). The Nomi PR Verifier provides SHA-bound
evidence but is not a required GitHub approval.

These settings enforce the exact-SHA contract and prevent accidental
direct commits to `main`.

## Merge method

GitHub repository policy:

- squash merge: enabled
- merge commits: disabled
- rebase merge: disabled
- delete branch after merge: enabled

Each Pull Request should therefore result in one coherent integration
commit on `main`.

## After merge

After GitHub merges the Pull Request:

    git switch main
    git pull --ff-only origin main

Then verify:

- local `main` matches `origin/main`
- working tree is clean
- merged feature branch is no longer needed
- required preflight/quality checks pass

## Prohibited normal operations

Do not use during normal development:

- direct pushes to `main`
- force pushes
- `git reset --hard` as a conflict shortcut
- blind `ours` or `theirs` conflict resolution
- rewriting published `main` history
- deleting `main`
- modifying sibling repositories

Emergency recovery must be separately analyzed and explicitly approved.
