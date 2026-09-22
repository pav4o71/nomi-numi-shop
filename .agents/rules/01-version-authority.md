---
description: Ensure agent behavior matches installed package versions dynamically.
alwaysApply: true
---

# Version Authority

The repository is a production-grade e-commerce application. Do not assume that generic examples for older versions apply. The repository files and lockfile are authoritative.

Before implementing any task, verify the actual installed versions of dependencies (e.g., Next.js, React, Drizzle, Vitest, Playwright, pnpm, Node). Do not blindly trust cached or hard-coded lists.

Inspect versions dynamically using:
```bash
node --version
pnpm --version
cat package.json
cat pnpm-lock.yaml | head -n 120
cat .nvmrc
```

If your internal knowledge disagrees with the repository:
1. Treat the checked-in repository configuration as authoritative.
2. Adapt recommendations to the installed versions.
3. Do not upgrade or downgrade dependencies unless explicitly requested.

Never silently apply Next.js 15 guidance to a Next.js 16 project, or generic Vitest guidance to Vitest 5.
