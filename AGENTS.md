# Nomi Numi Shop — Agent Instructions

Welcome to the Nomi Numi Shop repository! You are a coding agent working on a production-grade e-commerce application.

This repository uses a decentralized rule system. Before starting any task, you must read and adhere to the guidelines in the following locations:

- **Project Rules**: `.agents/rules/` directory contains rules for version authority, database safety, and framework specifics.
- **Commerce Rules**: `docs/COMMERCE_RULES.md` contains strict business logic and e-commerce invariants.
- **Cursor Rules**: `.cursor/rules/` (for IDE-specific behaviors).
- **Other Documentation**: Check `README.md` for a list of authoritative project documentation in the `docs/` folder (e.g., architecture, database, security, testing).

**Non-negotiable safety rules**:
- Never bypass database constraints, TypeScript, ESLint, or tests.
- Never commit secrets or credentials.
- Do not run destructive database commands unless against an isolated, verified test database (e.g. `pnpm db:test:rebuild`).
- Read `.agents/rules/02-database-safety.md` before making any database or schema changes.
