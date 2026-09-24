import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const projectBoundary = readProjectFile(".agents/rules/00-project-boundary.md");
const agents = readProjectFile("AGENTS.md");
const claude = readProjectFile("CLAUDE.md");
const preflight = readProjectFile("scripts/preflight.sh");

const invariant = "Unknown resources are protected resources.";
const ownershipRule = "Prove project ownership before mutation.";
const canonicalBoundary = ".agents/rules/00-project-boundary.md";

describe("generic-agent safety contract", () => {
  it("keeps the safety invariant in the canonical always-on rule", () => {
    expect(projectBoundary).toContain("alwaysApply: true");
    expect(projectBoundary).toContain(invariant);
    expect(projectBoundary).toContain(ownershipRule);
    expect(projectBoundary).toContain("docs/PROTECTED_RESOURCES.md");
  });

  it("makes generic agent entry points load the canonical rule", () => {
    expect(agents).toContain(canonicalBoundary);
    expect(claude).toContain(canonicalBoundary);
  });

  it("makes preflight validate the canonical rule instead of AGENTS.md placement", () => {
    expect(preflight).toContain(`GENERIC_PROJECT_BOUNDARY="${canonicalBoundary}"`);
    expect(preflight).toContain(`grep -Fq "${invariant}" "$GENERIC_PROJECT_BOUNDARY"`);

    expect(preflight).not.toMatch(
      /grep\s+-Fq\s+["']Unknown resources are protected resources\.["']\s+["']?AGENTS\.md["']?/,
    );
  });
});
