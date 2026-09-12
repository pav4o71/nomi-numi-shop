import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const EXPECTED_ROOT = "/home/pav4o71/Projects/nomi-numi-shop";

const emailLocalHelper = readFileSync(
  new URL("../../scripts/email-local.sh", import.meta.url),
  "utf8",
);
const dbLocalHelper = readFileSync(new URL("../../scripts/db-local.sh", import.meta.url), "utf8");
const mailpitCompose = readFileSync(
  new URL("../../infra/docker/mailpit.compose.yml", import.meta.url),
  "utf8",
);

function runEmailLocal(args: string[]) {
  return spawnSync("./scripts/email-local.sh", args, {
    cwd: EXPECTED_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
    },
  });
}

describe("Phase 2C1 Mailpit lifecycle safety", () => {
  it("locks Mailpit to the owned DEV compose project and reserved ports", () => {
    expect(emailLocalHelper).toContain('EXPECTED_ROOT="/home/pav4o71/Projects/nomi-numi-shop"');
    expect(emailLocalHelper).toContain('COMPOSE_PROJECT="nomi-numi-shop-dev"');
    expect(emailLocalHelper).toContain('ENV_ID="dev"');
    expect(emailLocalHelper).toContain('COMPOSE_SERVICE_NAME="mailpit"');
    expect(emailLocalHelper).toContain('SMTP_HOST_PORT="11025"');
    expect(emailLocalHelper).toContain('UI_HOST_PORT="18025"');
    expect(emailLocalHelper).toContain('PROTECTED_HOST_PORT="5433"');
    expect(emailLocalHelper).toContain("infra/docker/mailpit.compose.yml");
    expect(emailLocalHelper).toContain("com.nomimumi.project");
    expect(emailLocalHelper).toContain("com.nomimumi.environment");
    expect(emailLocalHelper).not.toContain("compose down");
    expect(emailLocalHelper).not.toContain("docker rm");
    expect(emailLocalHelper).not.toContain("volume prune");
    expect(emailLocalHelper).not.toContain("5433:1025");
    expect(mailpitCompose).toContain("127.0.0.1:11025:1025");
    expect(mailpitCompose).toContain("127.0.0.1:18025:8025");
  });

  it("keeps PostgreSQL ownership checks tolerant of sibling Mailpit resources on DEV", () => {
    expect(dbLocalHelper).toContain("is_allowed_compose_service");
    expect(dbLocalHelper).toContain("is_allowed_compose_network");
    expect(dbLocalHelper).toContain("postgres | mailpit");
    expect(dbLocalHelper).toContain("postgres_net | mailpit_net");
    expect(dbLocalHelper).toContain("postgres_data");
    expect(emailLocalHelper).toContain('EXPECTED_COMPOSE_NETWORK="mailpit_net"');
    expect(mailpitCompose).toContain("mailpit_net");
    expect(mailpitCompose).not.toContain("network_mode:");
    // TEST must remain PostgreSQL-only in the allowlist branches.
    expect(dbLocalHelper).toContain('case "$ENV_ID" in');
    expect(dbLocalHelper).toMatch(/test\)[\s\S]*?postgres\) return 0 ;;[\s\S]*?\*\) return 1 ;;/);
  });

  it("refuses unsupported actions and ambient compose identity swaps", () => {
    const usage = runEmailLocal([]);
    expect(usage.status).not.toBe(0);
    expect(`${usage.stdout}${usage.stderr}`).toMatch(/action is required|Usage:/);

    const badAction = runEmailLocal(["destroy"]);
    expect(badAction.status).not.toBe(0);
    expect(`${badAction.stdout}${badAction.stderr}`).toMatch(/unsupported action/);

    expect(emailLocalHelper).toContain("-u COMPOSE_FILE");
    expect(emailLocalHelper).toContain("-u COMPOSE_PROJECT_NAME");
    expect(emailLocalHelper).toContain('NOMI_ENVIRONMENT="$ENV_ID"');
  });
});
