---
description: Mandatory secret handling, authorization, upload, and security requirements
alwaysApply: true
---

# Security and Secrets

Security is part of implementation scope, not a later optional cleanup.

## Secrets

Never commit or expose real:

- passwords
- API keys
- authentication secrets
- payment secrets
- database credentials
- private keys
- access tokens
- webhook secrets

Never expose or commit private customer data or production data.

Do not print secrets into:

- terminal output intended for sharing
- logs
- tests
- documentation
- commits
- Pull Requests

Safe environment templates may contain variable names and non-secret
placeholder values only.

Do not weaken `.gitignore` or `.cursorignore` to access protected files.

## Authorization

Never rely only on hidden UI controls.

Sensitive actions require server-side authorization.

Admin functionality must verify server-side ownership/role.

Customer-owned resources must verify ownership before access.

Examples include:

- orders
- addresses
- reviews
- wishlists
- custom videos
- uploaded private files

## Input validation

Validate untrusted input server-side.

Use strict validation for:

- forms
- route handlers
- query parameters
- IDs
- uploads
- webhook payloads
- payment data
- discount inputs

## Commerce and money

Read and follow `docs/COMMERCE_RULES.md` and its referenced contracts for money, server-authoritative commerce values, purchased-item eligibility, and private custom videos. These rules are authoritative for commercial behavior.

## Uploads

Validate:

- MIME type
- allowed extension where relevant
- file size
- ownership
- destination path

Do not trust client filenames.

Private custom videos must not become public static assets.

Prevent path traversal.

## Authentication

Authentication and authorization failures must fail closed.

Do not create temporary bypasses that could accidentally survive into
production.

## Logging

Do not log:

- passwords
- reset tokens
- session secrets
- full payment credentials
- private authentication headers

## Dependencies

Do not introduce a new security-sensitive dependency without explaining
why it is required and confirming it fits the approved architecture.
