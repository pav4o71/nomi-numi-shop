# Nomi Numi Shop — Git Workflow

## Stable branch

`main` is the stable integration branch.

Normal development must not occur directly on `main`.

GitHub server-side branch protection is not currently available for
this private repository under the active GitHub plan.

The project therefore uses repository policy plus a local pre-push
guard to prevent normal direct pushes to `main`.

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

Before merge:

- inspect changed files
- inspect the complete diff
- run available quality checks
- review Bugbot findings when available
- resolve discovered defects
- verify no unrelated changes
- verify the branch is based on current `main`

If validation finds a problem:

1. fix it on the same feature branch
2. commit the fix
3. push the branch
4. review again

Do not merge known defects merely to continue to the next phase.

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
