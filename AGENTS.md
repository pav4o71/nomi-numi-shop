# Nomi Numi Shop — Agent Instructions

Welcome to the Nomi Numi Shop repository! You are a coding agent working on a production-grade e-commerce application.

This repository uses a decentralized rule system. Before starting any task, you must read and adhere to the guidelines in the following locations:

- **Project Boundary**: `.agents/rules/00-project-boundary.md` defines repository ownership, protected resources, mutation boundaries, and cross-project safety.
- **Version Authority**: `.agents/rules/01-version-authority.md` defines installed-version authority.
- **Database Safety**: `.agents/rules/02-database-safety.md` defines database, migration, and test-isolation rules.
- **Next.js Rules**: `.agents/rules/03-nextjs-app-router.md` defines framework-specific requirements.
- **Workflow Rules**: `.agents/rules/04-workflow.md` defines the pre-edit protocol and Definition of Done.
- **Commerce Rules**: `docs/COMMERCE_RULES.md` contains strict business logic and e-commerce invariants.
- **Cursor Rules**: `.cursor/rules/` contains IDE-specific behavior.
- **Other Documentation**: Check `README.md` for the authoritative documentation in the `docs/` folder.

**Non-negotiable safety rules**:

- Unknown resources are protected resources.
- Prove project ownership before mutation.
- Never bypass database constraints, TypeScript, ESLint, or tests.
- Never commit secrets or credentials.
- Do not run destructive database commands unless against an isolated, verified test database using an established project command.
- Read `.agents/rules/00-project-boundary.md` before modifying repository, Docker, database, filesystem, Git, external, or deployment resources.
- Read `.agents/rules/02-database-safety.md` before making any database or schema changes.
