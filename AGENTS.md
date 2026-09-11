# Nomi Numi Shop — Agent Instructions

## 1. Project identity

Canonical project:

`nomi-numi-shop`

Canonical local repository root:

`/home/pav4o71/Projects/nomi-numi-shop`

Planned GitHub repository:

`pav4o71/nomi-numi-shop`

Stable integration branch:

`main`

Before making any modification, verify the repository root.

If the current Git root is not exactly:

`/home/pav4o71/Projects/nomi-numi-shop`

STOP.

Do not attempt to repair, relocate, initialize, or modify another repository.

---

## 2. Project boundary

This agent is authorized to modify only resources explicitly owned by
`nomi-numi-shop`.

The authoritative external-resource registry is:

`docs/PROTECTED_RESOURCES.md`

Read that document before any work involving:

- Docker
- databases
- ports
- filesystem paths outside this repository
- Git repositories
- external servers
- production infrastructure

Mandatory rule:

> Unknown resources are protected resources.

If ownership cannot be proven, stop and report the ambiguity.

---

## 3. Existing projects are untouchable

Do not modify any sibling project.

Known protected repositories include:

- `/home/pav4o71/Projects/beautybook3`
- `/home/pav4o71/Projects/beautybook3-current`
- `/home/pav4o71/Projects/biz-research`
- `/home/pav4o71/Projects/game_of_night`
- `/home/pav4o71/Projects/thirty-three`

Read-only inspection is allowed only when necessary for conflict
diagnostics.

Never edit, clean, reset, switch branches, commit, push, delete, migrate,
or reconfigure these repositories.

---

## 4. Protected existing infrastructure

The existing Docker container:

`beautybook3-pg`

is external to this project.

Host port:

`5433`

is external to this project.

Never stop, restart, remove, rename, migrate against, or repurpose
`beautybook3-pg`.

Never bind a webshop service to host port `5433`.

Other external Docker resources are documented in
`docs/PROTECTED_RESOURCES.md`.

---

## 5. Reserved webshop development resources

Application development port:

`127.0.0.1:3100`

E2E application port:

`127.0.0.1:3101`

Development PostgreSQL:

`127.0.0.1:55432`

Development database:

`nomi_numi_shop_dev`

Test PostgreSQL:

`127.0.0.1:55433`

Test database:

`nomi_numi_shop_test`

Mailpit SMTP:

`127.0.0.1:11025`

Mailpit UI:

`127.0.0.1:18025`

Development Docker Compose namespace:

`nomi-numi-shop-dev`

Test Docker Compose namespace:

`nomi-numi-shop-test`

Do not silently substitute standard ports such as 3000, 5432, 5433,
1025, or 8025.

---

## 6. Development workflow

`main` is the stable integration branch.

Do not implement normal features directly on `main`.

Feature work should use narrowly scoped branches such as:

- `feature/...`
- `fix/...`
- `chore/...`
- `docs/...`

Before implementation:

1. verify repository root;
2. inspect current branch;
3. inspect `git status`;
4. inspect relevant diff/history;
5. read applicable project documentation;
6. identify the exact scope of the requested step.

Implement only the requested step.

Do not opportunistically redesign unrelated areas.

After implementation:

1. inspect `git diff`;
2. inspect `git status`;
3. run the validations required for the affected area;
4. review for unrelated changes;
5. fix discovered issues;
6. rerun validation.

Do not commit, push, merge, deploy, or create remote resources unless the
current step explicitly authorizes it.

---

## 7. Destructive operations

Destructive operations require explicit justification and proven project
ownership.

Do not routinely use:

- `rm -rf`
- `git reset --hard`
- `git clean -fd`
- force push
- Docker prune commands
- `docker compose down -v`
- Docker volume deletion
- database dropping
- filesystem deletion outside this repository

Never use a destructive command as a shortcut for understanding an
unexpected state.

Investigate first.

---

## 8. Database safety

Never run migrations, seeds, resets, truncation, or destructive tests
against an unverified database target.

Development database operations must target:

- host: `127.0.0.1`
- port: `55432`
- database: `nomi_numi_shop_dev`

Test database operations must target:

- host: `127.0.0.1`
- port: `55433`
- database: `nomi_numi_shop_test`

A mismatch must cause the operation to stop.

Port `5433` must never be accepted as a webshop database target.

Production database operations are not authorized during local project
bootstrap.

---

## 9. Secrets

Never commit real secrets.

Never print secret values into chat, logs, test output, commits, or
documentation.

Real environment files are local-only.

Safe templates such as:

`.env.example`

may be committed if they contain variable names and non-secret examples
only.

Do not weaken `.gitignore` or `.cursorignore` to gain access to secrets.

---

## 10. Production safety

Production infrastructure is currently:

`UNDECIDED — inspect Hetzner later`

Do not assume any existing Hetzner server, domain, reverse proxy,
database, Docker stack, credential, or deployment belongs to this
project.

No production mutation is authorized until a separate infrastructure
audit is completed.

---

## 11. Scope discipline

Work in small validated steps.

If a requested action requires an unplanned architectural change:

1. stop implementation;
2. explain the dependency;
3. propose the smallest safe change;
4. wait for approval if it expands scope.

Do not hide scope expansion inside a feature implementation.

---

## 12. Shell safety

The development shell may be Zsh.

Do not use shell special/reserved parameter names such as `path` as
generic variables.

Use descriptive names such as:

- `target_file`
- `protected_repo`
- `reserved_port`
- `service_name`

Scripts must fail safely rather than corrupting the shell environment.

---

## 13. Current phase restriction

Phase 0 through Phase 1F and Phase 2A are complete. The project is in
Phase 2B — Customer/Admin Identity Roles and Server Authorization
Foundation.

Further application development is allowed only when explicitly
authorized by the current approved phase or step. Obey scoped phase
instructions and do not begin future modules early.

Normal implementation must occur on an approved non-`main` branch
following `docs/GIT_WORKFLOW.md`.

Until a dedicated production phase authorizes it:

- do not create or mutate production infrastructure;
- do not deploy to production;
- do not connect real payment or courier credentials or production
  integrations.

External and sibling project mutation remains forbidden. Unknown
external resources remain protected.
