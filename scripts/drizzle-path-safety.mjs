import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { EXPECTED_ROOT, MIGRATIONS_FOLDER, fail } from "./drizzle-credentials.mjs";

export const DRIZZLE_CONFIG_PATH = path.join(EXPECTED_ROOT, "drizzle.config.ts");
export const SCHEMA_PATH = path.join(EXPECTED_ROOT, "src/db/schema/index.ts");
export const MIGRATIONS_META_FOLDER = path.join(MIGRATIONS_FOLDER, "meta");

export const FIXED_MIGRATE_TRANSPORT = Object.freeze({
  host: "127.0.0.1",
  port: 5432,
});

function isUnderRoot(resolvedPath) {
  return resolvedPath === EXPECTED_ROOT || resolvedPath.startsWith(`${EXPECTED_ROOT}${path.sep}`);
}

function pathExists(targetPath) {
  try {
    fs.lstatSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

function requireRegularFileUnderRoot(targetPath, label) {
  if (!pathExists(targetPath)) {
    fail(`${label} missing: ${targetPath}`);
  }

  const lstat = fs.lstatSync(targetPath);
  if (lstat.isSymbolicLink()) {
    fail(`${label} must not be a symlink: ${targetPath}`);
  }

  if (!lstat.isFile()) {
    fail(`${label} must be a regular file: ${targetPath}`);
  }

  const resolved = fs.realpathSync(targetPath);
  if (!isUnderRoot(resolved)) {
    fail(`${label} must resolve under ${EXPECTED_ROOT}: ${targetPath}`);
  }
}

function requireDirectoryExact(targetPath, label) {
  if (!pathExists(targetPath)) {
    fail(`${label} missing: ${targetPath}`);
  }

  const lstat = fs.lstatSync(targetPath);
  if (lstat.isSymbolicLink()) {
    fail(`${label} must not be a symlink: ${targetPath}`);
  }

  if (!lstat.isDirectory()) {
    fail(`${label} must be a directory: ${targetPath}`);
  }

  const resolved = fs.realpathSync(targetPath);
  if (resolved !== targetPath) {
    fail(`${label} realpath must exactly match project path: ${targetPath}`);
  }

  if (!isUnderRoot(resolved)) {
    fail(`${label} must resolve under ${EXPECTED_ROOT}: ${targetPath}`);
  }
}

function walkAndAssertSafe(rootDir) {
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const childPath = path.join(current, entry.name);

      if (entry.isSymbolicLink()) {
        fail(`symlink forbidden in migration tree: ${childPath}`);
      }

      if (entry.isDirectory()) {
        const resolved = fs.realpathSync(childPath);
        if (resolved !== childPath || !isUnderRoot(resolved)) {
          fail(`migration directory escaped repository root: ${childPath}`);
        }
        stack.push(childPath);
        continue;
      }

      if (entry.isFile()) {
        const resolved = fs.realpathSync(childPath);
        if (!isUnderRoot(resolved)) {
          fail(`migration file escaped repository root: ${childPath}`);
        }
        continue;
      }

      fail(`special filesystem object forbidden in migration tree: ${childPath}`);
    }
  }
}

export function assertProjectToolingPathsSafe() {
  requireRegularFileUnderRoot(DRIZZLE_CONFIG_PATH, "drizzle.config.ts");
  requireRegularFileUnderRoot(SCHEMA_PATH, "canonical schema");
}

export function assertMigrationsTreeSafe({ requireExisting = true } = {}) {
  if (!pathExists(MIGRATIONS_FOLDER)) {
    if (requireExisting) {
      fail(`migrations directory missing: ${MIGRATIONS_FOLDER}`);
    }
    return;
  }

  requireDirectoryExact(MIGRATIONS_FOLDER, "migrations directory");

  if (pathExists(MIGRATIONS_META_FOLDER)) {
    requireDirectoryExact(MIGRATIONS_META_FOLDER, "migrations meta directory");
  }

  walkAndAssertSafe(MIGRATIONS_FOLDER);
}

export function requireCanonicalMigrationsFolder() {
  assertMigrationsTreeSafe({ requireExisting: true });
  return fs.realpathSync(MIGRATIONS_FOLDER);
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return pathToFileURL(path.resolve(entry)).href === import.meta.url;
}

if (isMainModule()) {
  const mode = process.argv[2] ?? "all";
  if (process.argv.length > 3) {
    fail("drizzle-path-safety accepts at most one mode argument");
  }

  assertProjectToolingPathsSafe();

  if (mode === "tooling") {
    process.exit(0);
  }

  if (mode === "migrations-optional") {
    assertMigrationsTreeSafe({ requireExisting: false });
    process.exit(0);
  }

  if (mode === "migrations" || mode === "all") {
    assertMigrationsTreeSafe({ requireExisting: true });
    process.exit(0);
  }

  fail(`unsupported path-safety mode '${mode}'`);
}
