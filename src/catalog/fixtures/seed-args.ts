/**
 * Phase 3C DEV catalog seed CLI argument parsing (portable, no DB I/O).
 */

import { DEV_CATALOG_SEED_CONFIRMATION } from "@/catalog/fixtures/manifest";

export type ParsedDevSeedArgs = {
  confirmation: string;
};

export function parseDevCatalogSeedArgs(argv: string[]): ParsedDevSeedArgs {
  let confirmation: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    const next = argv[index + 1];

    if (token === "--") {
      // pnpm / shell may forward the argument separator; ignore it.
      continue;
    }

    if (token === "--confirm") {
      if (next === undefined) {
        throw new Error("confirmation token missing; refusing DEV catalog seed");
      }
      confirmation = next;
      index += 1;
      continue;
    }

    if (
      token === "--env" ||
      token === "--host" ||
      token === "--port" ||
      token === "--database" ||
      token === "--user" ||
      token === "--url" ||
      token.startsWith("--env=") ||
      token.startsWith("--host=") ||
      token.startsWith("--port=") ||
      token.startsWith("--database=") ||
      token.startsWith("--user=") ||
      token.startsWith("--url=")
    ) {
      throw new Error(
        `forbidden target-selection argument '${token}'; DEV catalog seed has a fixed DEV target`,
      );
    }

    throw new Error(`unexpected argument '${token}'; refusing DEV catalog seed`);
  }

  if (confirmation === undefined) {
    throw new Error(`usage: --confirm ${DEV_CATALOG_SEED_CONFIRMATION}`);
  }

  if (confirmation !== DEV_CATALOG_SEED_CONFIRMATION) {
    throw new Error("confirmation token mismatch; refusing DEV catalog seed");
  }

  return { confirmation };
}
