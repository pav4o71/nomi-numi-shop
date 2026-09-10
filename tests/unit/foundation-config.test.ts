import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

interface PackageManifest {
  name: string;
  private: boolean;
  packageManager: string;
  scripts: Record<string, string>;
}

const packageManifest = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as PackageManifest;

describe("application foundation configuration", () => {
  it("keeps Next.js agent rule rewriting disabled", () => {
    expect(nextConfig.agentRules).toBe(false);
  });

  it("keeps the canonical package identity and package manager", () => {
    expect(packageManifest.name).toBe("nomi-numi-shop");
    expect(packageManifest.private).toBe(true);
    expect(packageManifest.packageManager).toBe("pnpm@11.26.0");
  });

  it("binds normal and E2E application scripts to their reserved loopback ports", () => {
    expect(packageManifest.scripts.dev).toBe("next dev --hostname 127.0.0.1 --port 3100");
    expect(packageManifest.scripts.start).toBe("next start --hostname 127.0.0.1 --port 3100");
    expect(packageManifest.scripts["dev:e2e"]).toBe("next dev --hostname 127.0.0.1 --port 3101");
  });
});
