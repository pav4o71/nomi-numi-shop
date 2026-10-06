---
description: Mandatory repository, resource ownership, and cross-project safety boundary for nomi-numi-shop.
alwaysApply: true
---

# Project Boundary & Resource Ownership

You are operating on `nomi-numi-shop`.

Canonical local repository root:

`/home/pav4o71/Projects/nomi-numi-shop`

Before modifying anything, confirm that the Git root is exactly the canonical repository root. If it is not, STOP. Do not repair, initialize, relocate, clean, reset, or modify another repository.

Read and follow:

- `docs/PROTECTED_RESOURCES.md` for resource identities and resource-specific restrictions.
- `.agents/rules/02-database-safety.md` before database or schema work.
- `.agents/rules/04-workflow.md` for Git authorization, branch discipline, planning, and validation.
- `.agents/rules/05-security.md` before beginning any task, including when this rule is loaded through another agent entry point.

## Core safety rule

Unknown resources are protected resources.

Prove project ownership before mutation.

If ownership cannot be proven or a safety check fails, STOP and report the ambiguity. Do not guess or automatically repair external state.

## External projects and filesystem boundaries

Never mutate the protected sibling repositories listed in `docs/PROTECTED_RESOURCES.md`, including their files, Git state, remotes, and configuration. Inspect them only when explicitly required for read-only conflict diagnostics.

Modify files only within this repository unless the user explicitly approves a specific external operation. Such approval does not waive a specific protected-resource prohibition. System directories, shell/SSH configuration, and unrelated user files are not implicitly writable.

## Resource identities and endpoints

Use the exact endpoints, database names, Compose namespaces, networks, and volumes in `docs/PROTECTED_RESOURCES.md`. Do not silently substitute standard or unrelated ports, or reuse external resources merely to save configuration.

Critical resource warning: `beautybook3-pg` and host port `5433` belong to another project. Never stop, restart, remove, rename, reconfigure, migrate against, repurpose, or attach webshop services to that container. Never bind webshop services to that port.

## Mutation restrictions

Do not perform destructive or external mutations merely to resolve an unexpected state. Investigate before attempting repair.

Do not use destructive shortcuts such as:

- `git reset --hard`
- `git clean -fd` or `git clean -fdx`
- force push
- Docker prune commands
- unknown Docker volume deletion
- `docker compose down -v`
- database dropping
- filesystem deletion outside this repository

unless the specific operation is explicitly authorized, project ownership is proven, and its destructive impact is understood. General authorization does not waive resource-specific prohibitions, including the ban on force-pushing `main` or rewriting published history.

Implement only the requested scope. Read `.agents/rules/04-workflow.md` before Git mutations or publishing operations.

## Docker ownership and inspection

Only mutate Docker resources proven to belong to the project's namespaces. A matching name alone is insufficient. A stopped, old, unfamiliar, or apparently unused resource, or one without Docker labels, is not thereby disposable.

Before Docker mutation, inspect relevant state with read-only operations such as `docker ps`, `docker ps -a`, `docker inspect`, `docker compose config`, and `docker compose ps`. These examples do not authorize container lifecycle operations or override task constraints.

Preserve the protected networks, volumes, and built-in network exclusions in `docs/PROTECTED_RESOURCES.md`. Do not attach services to external networks without the required explicit architecture decision. Mailpit must remain on its owned network and use its project lifecycle wrappers.

Bind local infrastructure only to documented endpoints; prefer loopback binding over `0.0.0.0`. Stop if ownership or a target is ambiguous.

## Production

Production infrastructure is not selected yet; its status and exclusions are recorded in `docs/PROTECTED_RESOURCES.md`.

Do not assume any existing server, domain, DNS record, reverse proxy, database, Docker resource, credential, or deployment belongs to this project. Do not create or mutate production infrastructure unless a later explicitly authorized production phase permits it after the required infrastructure audit.
