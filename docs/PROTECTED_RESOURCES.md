# Nomi Numi Shop — Resource Boundaries

This document defines which local resources belong to `nomi-numi-shop`
and which resources are external and therefore protected.

These rules apply to:

- humans
- Cursor agents
- Grok Bot
- Bugbot
- scripts
- CI/CD tooling
- development utilities

The default rule is:

> If a resource is not explicitly owned by `nomi-numi-shop`, treat it as protected.

Unknown does NOT mean unused.

---

## 1. Project identity

Canonical project name:

`nomi-numi-shop`

Canonical local root:

`/home/pav4o71/Projects/nomi-numi-shop`

Expected Git branch for stable integration:

`main`

Planned GitHub repository:

`pav4o71/nomi-numi-shop`

Planned GitHub visibility:

`PRIVATE`

Agents must not operate from:

`/home/pav4o71/Projects`

or any parent directory as though it were the webshop repository.

Before modifying files, an agent must verify the Git root is exactly:

`/home/pav4o71/Projects/nomi-numi-shop`

---

## 2. Resources reserved for nomi-numi-shop

These resources are reserved for this project.

### Application ports

Development application:

`127.0.0.1:3100`

E2E application:

`127.0.0.1:3101`

### PostgreSQL ports

Development PostgreSQL:

`127.0.0.1:55432`

Test PostgreSQL:

`127.0.0.1:55433`

### Mailpit ports

SMTP:

`127.0.0.1:11025`

Web UI:

`127.0.0.1:18025`

### Planned database names

Development:

`nomi_numi_shop_dev`

Test:

`nomi_numi_shop_test`

### Planned Docker Compose namespaces

Development:

`nomi-numi-shop-dev`

Test:

`nomi-numi-shop-test`

Only Docker resources explicitly created by these project namespaces may
be modified by webshop automation.

---

## 3. Protected external Git repositories

The following repositories belong to other work and are outside the
authority of `nomi-numi-shop`:

- `/home/pav4o71/Projects/beautybook3`
- `/home/pav4o71/Projects/beautybook3-current`
- `/home/pav4o71/Projects/biz-research`
- `/home/pav4o71/Projects/game_of_night`
- `/home/pav4o71/Projects/thirty-three`

Agents may inspect these paths only when explicitly required for
read-only conflict diagnostics.

Agents must never:

- edit files in these repositories
- delete files in these repositories
- create files in these repositories
- commit in these repositories
- change branches in these repositories
- merge or rebase these repositories
- reset these repositories
- clean these repositories
- alter their remotes
- push their branches
- modify their configuration

Other repositories discovered later are protected by default.

---

## 4. Protected Docker container

The following existing Docker container belongs to another project:

`beautybook3-pg`

Observed state during environment preparation:

- image: `postgres:16`
- host port: `5433`
- container PostgreSQL port: `5432`

`nomi-numi-shop` must never:

- stop `beautybook3-pg`
- restart `beautybook3-pg`
- remove `beautybook3-pg`
- rename `beautybook3-pg`
- reconfigure `beautybook3-pg`
- execute migrations against it
- connect webshop development or test databases to it

Read-only inspection for conflict diagnostics is allowed.

---

## 5. Protected host port

Host port:

`5433`

is currently owned by another project's PostgreSQL container.

The webshop must never bind a service to host port `5433`.

---

## 6. Protected Docker networks

Existing networks discovered before webshop initialization include:

- `local-network`
- `manila-leads-vpn`

These networks are external to `nomi-numi-shop`.

The webshop must not:

- remove them
- rename them
- reconfigure them
- attach its services to them without an explicit architecture decision

Docker's built-in networks are also not owned by this project:

- `bridge`
- `host`
- `none`

---

## 7. Protected Docker volumes

Existing volumes discovered before webshop initialization include:

- `gmaps-playwright-cache`
- `gmaps-playwright-cache-preview`
- `supabase_db_dog_shop_test`
- `supabase_edge_runtime_dog_shop_test`
- `supabase_storage_dog_shop_test`

An additional anonymous Docker volume was also observed.

All existing Docker volumes are protected unless they were explicitly
created and documented as belonging to `nomi-numi-shop`.

Agents must never use cleanup commands to decide that an unfamiliar
volume is disposable.

---

## 8. Destructive Docker operations

The following operations require special caution and must never be run
against unknown or external resources:

- `docker rm`
- `docker rmi`
- `docker volume rm`
- `docker network rm`
- `docker system prune`
- `docker volume prune`
- `docker network prune`
- `docker container prune`
- `docker compose down -v`

Before a destructive Docker operation, ownership must first be proven.

A matching name alone is not sufficient if ownership is ambiguous.

---

## 9. Database safety boundary

Development database target:

- host: `127.0.0.1`
- port: `55432`
- database: `nomi_numi_shop_dev`

Test database target:

- host: `127.0.0.1`
- port: `55433`
- database: `nomi_numi_shop_test`

Database migrations, resets, truncation, seeds, and destructive tests
must refuse to run if the target does not match the expected
environment.

In particular, webshop tooling must refuse any database target using:

`5433`

because that port is currently associated with another project.

---

## 10. Filesystem safety boundary

Webshop automation may modify files only beneath:

`/home/pav4o71/Projects/nomi-numi-shop`

unless the user explicitly approves a specific external operation.

The following are never implicitly writable:

- `/home/pav4o71/Projects`
- sibling project directories
- `/etc`
- `/usr`
- `/var/lib/docker`
- SSH configuration
- shell configuration
- systemd configuration
- unrelated user files

External-file access for diagnostics should remain read-only.

---

## 11. Git safety boundary

`main` is the stable integration branch.

Feature implementation will occur on dedicated branches such as:

- `feature/...`
- `fix/...`
- `docs/...`
- `chore/...`

Agents must not:

- force-push `main`
- rewrite published history
- use `git reset --hard` as a routine repair mechanism
- use `git clean -fd` without explicit approval
- delete unrelated branches
- modify another repository
- blindly resolve conflicts using `ours` or `theirs`

Before implementation, agents must inspect:

- `git status`
- `git diff`
- recent Git history
- current branch
- repository root

---

## 12. Unknown-resource rule

This is mandatory:

> Unknown resources are protected resources.

If an agent discovers an unfamiliar:

- directory
- Git repository
- Docker container
- Docker image
- Docker volume
- Docker network
- database
- port
- process
- service
- server
- credential
- remote

it must not delete, modify, stop, reset, migrate, overwrite, or repurpose
that resource merely because its purpose is unclear.

The agent must stop and report the ambiguity.

---

## 13. Production boundary

Production infrastructure has not yet been selected.

Current status:

`UNDECIDED — inspect Hetzner later`

Therefore no development agent may assume:

- an existing Hetzner server belongs to this webshop
- an existing production database may be reused
- an existing reverse proxy may be reconfigured
- an existing domain may be assigned
- an existing Docker stack may be modified

Production changes require a separate infrastructure audit and explicit
approval.

---

## 14. Safety principle

The project follows this rule:

> Prove ownership before mutation.

Read-only inspection may be used to determine ownership.

If ownership cannot be proven, stop rather than modify the resource.
