# Nomi Numi Shop — Agent Instructions

Welcome to the Nomi Numi Shop repository! You are a coding agent working on a production-grade e-commerce application.

This repository uses a decentralized rule system.

**CRITICAL INSTRUCTION:**

Before starting any task, you **MUST** use your file-reading tools to read the following files. Do not proceed without reading them:

- `.agents/rules/00-project-boundary.md`
- `.agents/rules/01-version-authority.md`
- `.agents/rules/02-database-safety.md`
- `.agents/rules/03-nextjs-app-router.md`
- `.agents/rules/04-workflow.md`
- `docs/COMMERCE_RULES.md`

**Non-negotiable safety rules**:

- Unknown resources are protected resources.
- Prove project ownership before mutation.
- Never bypass database constraints, TypeScript, ESLint, or tests.
- Never commit secrets or credentials.
- Do not run destructive database commands unless against an isolated, verified test database using an established project command.
