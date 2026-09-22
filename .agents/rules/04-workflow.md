---
description: First-response protocol and Definition of Done
alwaysApply: true
---

# Workflow & Pre-edit Protocol

## First-response protocol
Before changing files, you must inspect the repository state:
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

## Definition of done
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

## Database and migration impact
- None, or describe the migration and test strategy.

## Risks and follow-up
- None, or describe remaining uncertainty.
```
