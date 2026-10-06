---
description: Shared planning, Git authorization, validation, and Definition of Done.
alwaysApply: true
---

# Workflow & Pre-edit Protocol

## First-response protocol

Before changing files, inspect the repository root, current branch, Git status, relevant diff, and recent history. Confirm the canonical root according to `.agents/rules/00-project-boundary.md`.

```bash
git status --short --branch
git diff
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
6. Identify risks, failure cases, and required validation.
7. Only then edit files.

Do not ask for confirmation for ordinary safe repository edits. Ask only when the requested result cannot be implemented safely without a missing requirement, destructive action, ambiguous business rule, or credential.

## Branch discipline and scope

`main` is the stable integration branch. Normal implementation must happen on a narrowly scoped `feature/...`, `fix/...`, `chore/...`, or `docs/...` branch.

Bootstrap work may occur on `main` only when the current explicitly approved project phase says so. This exception does not authorize ordinary feature work on `main` or waive resource-specific prohibitions.

A branch should represent one coherent change. Do not mix unrelated features, refactors, dependency upgrades, formatting rewrites, documentation changes, or infrastructure modifications unless the approved step explicitly requires them together.

## Git and publishing authorization

Do not create commits, push, open pull requests, merge, tag, publish releases, deploy, or create remote resources unless the current task explicitly authorizes the specific operation. Authorization to edit files or generate migrations does not authorize these operations.

Generate and review migrations when required by an authorized schema change. Commit them only when committing is explicitly authorized. An otherwise completed implementation may be delivered with reviewed, uncommitted changes; report that state accurately. If committing is part of the requested deliverable, the task remains incomplete until the authorized commit is created.

Before an authorized commit, inspect:

- `git status --short`
- `git diff`
- `git diff --staged` when staged changes exist

Verify that only intended source changes are included, no secrets or unrelated files are staged, and required validation passed.

Stage only intended source changes when staging is authorized as part of the task. Generated source artifacts required by the change, including reviewed Drizzle migrations and metadata, may be included. Do not stage runtime output, caches, credentials, secrets, or unrelated generated artifacts.

Do not routinely use `git reset --hard`, `git clean -fd`, `git clean -fdx`, force push, or history rewriting as repair shortcuts. Never blindly resolve conflicts using `ours` or `theirs`. Investigate unexpected Git state rather than destroying it.

Read and obey the specific prohibitions in `docs/PROTECTED_RESOURCES.md`, including no force push to `main`, no published-history rewrites, no unrelated branch deletion, and no mutations in protected sibling repositories. General authorization does not waive these prohibitions.

## Pull request review

When a PR exists:

1. Inspect the complete diff.
2. Run the required validation within the task's authorized scope.
3. Resolve review findings.
4. Rerun validation affected by the fixes.
5. Merge only when review and CI are clean and merging is explicitly authorized.

Never bypass failed validation just to progress to the next phase. Nomi PR Verifier PASS permits human merge consideration only; it does not grant merge authority.

## Validation and failure handling

Every implementation step must be validated according to its scope. Understand the requested behavior, affected modules, existing tests, relevant architecture, and expected failure cases before implementation.

Never bypass database constraints, TypeScript, ESLint, or tests. Do not modify tests merely to make an incorrect implementation pass.

Select relevant checks from formatting, lint, TypeScript, unit tests, integration tests, Playwright E2E, and production build. Follow `docs/TESTING.md` for established commands and `.agents/rules/02-database-safety.md` for data-mutating test isolation. Do not run checks whose side effects exceed the task's authorization. State which checks were unavailable or not run; never invent success.

When fixing a reproducible bug, add or update a regression test when practical.

If validation fails:

1. Investigate the cause.
2. Fix only within approved scope.
3. Rerun the failed validation.
4. Rerun affected broader validation.
5. Inspect the final diff.

Do not continue to the next phase while known relevant validation failures remain.

After implementation, inspect Git status/diff, unexpected files, generated artifacts, unrelated changes, security-sensitive changes, database migrations, and environment changes. Prefer small validated steps.

## Evidence and review claims

Never claim that tests, build, lint, deployment, or Nomi PR Verifier PASS succeeded unless the action actually ran and produced the stated result for the exact current commit SHA. Stale SHA-bound review verdicts do not count.

Report uncommitted changes and the scope of local checks accurately. Static inspection is not evidence that runtime behavior, CI, deployment, or an agent's automatic rule loading succeeded.

## Definition of done

A task is complete only when:

- The requested behavior works.
- The implementation follows repository patterns.
- Actual installed versions were respected.
- Inputs, authorization, errors, and edge cases are handled.
- Database constraints remain enforced.
- Required migrations are generated and reviewed; they are committed only when committing is explicitly authorized.
- Tests cover normal, boundary, invalid, and failure behavior where applicable.
- Required validation checks that were not run because of explicit task constraints, missing prerequisites, unavailable services, or authorization limits must be reported as not run, with the reason.
- A failed check is not a limitation. Failed checks must be reported as failed with the command, relevant output, and impact on completion.
- Do not claim completion or success when required checks failed.
- The diff contains no unrelated changes.
- No secrets or unsafe data were introduced.
- Documentation was updated when behavior or workflow changed.
- The final response contains evidence and accurately reports Git state.

An authorized read-only or documentation-only task does not require executing runtime or data-mutating checks outside its scope. Report the resulting verification limits.

Required final response:

```md
## Completed

- ...

## Files changed

- ...

## Validation

- `command`: passed

## Database and migration impact

- None, or describe the migration and test strategy.

## Risks and follow-up

- None, or describe remaining uncertainty.
```
