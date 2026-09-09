# Nomi Numi Shop — Environment Baseline

## 1. Canonical repository

Project:

- nomi-numi-shop

Canonical root:

- /home/pav4o71/Projects/nomi-numi-shop

Stable integration branch:

- main

Planned GitHub repository:

- pav4o71/nomi-numi-shop

Planned visibility:

- PRIVATE

## 2. Runtime

Node:

- 24.19.0

pnpm:

- 11.26.0

Runtime pin files:

- .nvmrc
- .node-version

Do not change the machine-wide NVM default merely for this project.

## 3. Development environment

Application:

- 127.0.0.1:3100

PostgreSQL:

- 127.0.0.1:55432

Database:

- nomi_numi_shop_dev

Compose project:

- nomi-numi-shop-dev

## 4. Test / E2E environment

Application:

- 127.0.0.1:3101

PostgreSQL:

- 127.0.0.1:55433

Database:

- nomi_numi_shop_test

Compose project:

- nomi-numi-shop-test

## 5. Mailpit

SMTP:

- 127.0.0.1:11025

Web UI:

- 127.0.0.1:18025

## 6. Environment files

Real environment values are never committed.

Expected pattern later:

- .env.example
- ignored local development environment
- ignored local test environment

Production secrets are outside Phase 0.

## 7. Local network exposure

Local infrastructure should bind to:

- 127.0.0.1

unless an explicitly approved requirement needs wider network exposure.

Development PostgreSQL and Mailpit must not be exposed on 0.0.0.0 by
default.

## 8. Protected external database

Existing container:

- beautybook3-pg

Existing host port:

- 5433

This resource does not belong to nomi-numi-shop.

See:

- docs/PROTECTED_RESOURCES.md

## 9. Preflight modes

Currently supported:

- phase0
- baseline-local
- baseline-remote

Mode meaning:

- `phase0` — before the first commit and before a Git remote exists
- `baseline-local` — committed local foundation before a Git remote exists
- `baseline-remote` — committed foundation synchronized with canonical GitHub main

Currently unsupported:

- dev
- test
- ci
- production

Unsupported modes must fail instead of making assumptions.

Additional modes are added only after those environments exist and have
defined invariants.

## 10. Production

Current status:

UNDECIDED — INSPECT HETZNER LATER

No existing:

- server
- domain
- DNS configuration
- reverse proxy
- production database
- production storage
- production Docker stack

is considered owned by nomi-numi-shop until explicitly audited and
documented.
