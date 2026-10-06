# Nomi Numi Shop — Agent Instructions

Welcome to the Nomi Numi Shop repository! You are a coding agent working on a production-grade e-commerce application.

Read all shared rules in `.agents/rules/` before beginning a repository task. These rules apply to every coding agent, including Codex and Cursor. Read the referenced domain documentation when relevant.

- **Project Boundary**: `.agents/rules/00-project-boundary.md` defines repository ownership, protected resources, mutation boundaries, and cross-project safety.
- **Version Authority**: `.agents/rules/01-version-authority.md` defines installed-version authority.
- **Database Safety**: `.agents/rules/02-database-safety.md` defines database, migration, and test-isolation rules.
- **Next.js Rules**: `.agents/rules/03-nextjs-app-router.md` defines framework-specific requirements.
- **Workflow Rules**: `.agents/rules/04-workflow.md` defines the pre-edit protocol and Definition of Done.
- **Security Rules**: `.agents/rules/05-security.md` defines secret handling, authorization, input validation, uploads, and authentication requirements.
- **Commerce Rules**: `docs/COMMERCE_RULES.md` contains strict business logic and e-commerce invariants.
- **Resource Registry**: `docs/PROTECTED_RESOURCES.md` defines project resource identities and resource-specific restrictions.
- **Cursor Adapters**: `.cursor/rules/` instructs Cursor to read and follow the shared rules; it does not define alternative shared policies.
- **Operational Guide**: `README.md` provides command examples and links to relevant domain documentation.

## Authority and applicability

`docs/PROTECTED_RESOURCES.md` is authoritative for project resource identities and resource-specific restrictions. `docs/COMMERCE_RULES.md` and its explicitly referenced contracts are authoritative for commerce behavior. `.agents/rules/` is authoritative for shared agent procedures. `.cursor/rules/` contains Cursor loading adapters and must not define alternative shared policies. README.md is an operational guide.

A general permission or example does not waive a specific prohibition. If canonical sources conflict, stop the dependent action and report the conflict; do not choose a more permissive interpretation. These repository rules do not override higher-priority session instructions.

The `alwaysApply` metadata in shared Markdown files is retained for compatibility. Generic agents must explicitly read the files listed here; do not assume that metadata automatically loads them. Cursor adapters retain their `alwaysApply: true` metadata.

## Critical safety summary

- Unknown resources are protected resources.
- Prove project ownership before mutation.
- Never bypass database constraints, TypeScript, ESLint, or tests.
- Never commit secrets or credentials.
- Do not run destructive database commands unless against an isolated, verified test database using an established project command.
- Read `.agents/rules/00-project-boundary.md` before modifying repository, Docker, database, filesystem, Git, external, or deployment resources.
- Read `.agents/rules/02-database-safety.md` before making any database or schema changes.
