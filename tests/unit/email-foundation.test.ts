import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  EmailEnvValidationError,
  LOCAL_EMAIL_FROM_DEFAULT,
  LOCAL_EMAIL_PROVIDER_ID,
  LOCAL_MAILPIT_UI_ORIGIN,
  LOCAL_SMTP_HOST,
  LOCAL_SMTP_PORT,
  parseLocalEmailEnv,
} from "@/email/env";
import {
  createLocalEmailProvider,
  emailFoundationConstants,
  MailpitEmailProvider,
} from "@/email/index";
import { authFoundationConstants } from "@/auth/server";

interface PackageManifest {
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

const packageManifest = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as PackageManifest;

const envExample = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
const mailpitCompose = readFileSync(
  new URL("../../infra/docker/mailpit.compose.yml", import.meta.url),
  "utf8",
);
const authServerSource = readFileSync(new URL("../../src/auth/server.ts", import.meta.url), "utf8");

function validEmailEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    EMAIL_PROVIDER: LOCAL_EMAIL_PROVIDER_ID,
    EMAIL_FROM: LOCAL_EMAIL_FROM_DEFAULT,
    SMTP_HOST: LOCAL_SMTP_HOST,
    SMTP_PORT: String(LOCAL_SMTP_PORT),
    ...overrides,
  };
}

describe("Phase 2C1 local email foundation", () => {
  it("exposes Mailpit lifecycle scripts only through project wrappers", () => {
    expect(packageManifest.scripts["email:up"]).toBe("./scripts/email-local.sh up");
    expect(packageManifest.scripts["email:stop"]).toBe("./scripts/email-local.sh stop");
    expect(packageManifest.scripts["email:status"]).toBe("./scripts/email-local.sh status");
    expect(packageManifest.scripts["email:up"]).not.toContain("docker compose");
    expect(packageManifest.scripts["email:stop"]).not.toContain("down -v");
  });

  it("does not add a production email SDK dependency", () => {
    expect(packageManifest.dependencies).not.toHaveProperty("nodemailer");
    expect(packageManifest.dependencies).not.toHaveProperty("@aws-sdk/client-ses");
    expect(packageManifest.dependencies).not.toHaveProperty("resend");
    expect(packageManifest.dependencies).not.toHaveProperty("postmark");
    expect(packageManifest.dependencies).not.toHaveProperty("sendgrid");
    expect(packageManifest.dependencies).not.toHaveProperty("@sendgrid/mail");
    expect(packageManifest.devDependencies).not.toHaveProperty("nodemailer");
    expect(emailFoundationConstants.productionProviderConfigured).toBe(false);
  });

  it("pins Mailpit compose to loopback reserved ports and owned labels", () => {
    expect(mailpitCompose).toContain("axllent/mailpit:v1.31.1");
    expect(mailpitCompose).toContain('"127.0.0.1:11025:1025"');
    expect(mailpitCompose).toContain('"127.0.0.1:18025:8025"');
    expect(mailpitCompose).toContain("network_mode: bridge");
    expect(mailpitCompose).toContain('"0.0.0.0:1025"');
    expect(mailpitCompose).toContain('"0.0.0.0:8025"');
    // Host publishes must stay loopback-only (container listen may be 0.0.0.0).
    expect(mailpitCompose).not.toMatch(/- ["']0\.0\.0\.0:\d+:/);
    expect(mailpitCompose).not.toMatch(/- ["']\d+:\d+["']/);
    expect(mailpitCompose).toContain("com.nomimumi.project: nomi-numi-shop");
    expect(mailpitCompose).toContain("com.nomimumi.environment:");
    expect(mailpitCompose).toContain('["CMD", "/mailpit", "readyz"]');
  });

  it("documents safe local-only email placeholders", () => {
    expect(envExample).toContain("EMAIL_PROVIDER=mailpit");
    expect(envExample).toContain("EMAIL_FROM=noreply@nomi-numi.local");
    expect(envExample).toContain("SMTP_HOST=127.0.0.1");
    expect(envExample).toContain("SMTP_PORT=11025");
    expect(envExample).not.toMatch(/api[_-]?key\s*=\s*[A-Za-z0-9]/i);
    expect(envExample).not.toContain("sk_live");
  });

  it("accepts the fixed local Mailpit transport identity", () => {
    const config = parseLocalEmailEnv(validEmailEnv());
    expect(config).toEqual({
      provider: "mailpit",
      from: "noreply@nomi-numi.local",
      smtp: { host: "127.0.0.1", port: 11025 },
      mailpitUiOrigin: "http://127.0.0.1:18025",
    });
    expect(emailFoundationConstants.smtpHost).toBe("127.0.0.1");
    expect(emailFoundationConstants.smtpPort).toBe(11025);
    expect(emailFoundationConstants.mailpitUiOrigin).toBe(LOCAL_MAILPIT_UI_ORIGIN);
  });

  it("refuses production environments and non-Mailpit providers", () => {
    expect(() => parseLocalEmailEnv(validEmailEnv({ NODE_ENV: "production" }))).toThrow(
      EmailEnvValidationError,
    );
    expect(() => parseLocalEmailEnv(validEmailEnv({ VERCEL: "1" }))).toThrow(
      EmailEnvValidationError,
    );
    expect(() => parseLocalEmailEnv(validEmailEnv({ EMAIL_PROVIDER: "resend" }))).toThrow(
      EmailEnvValidationError,
    );
    expect(() => parseLocalEmailEnv(validEmailEnv({ SMTP_HOST: "smtp.example.com" }))).toThrow(
      EmailEnvValidationError,
    );
    expect(() => parseLocalEmailEnv(validEmailEnv({ SMTP_PORT: "587" }))).toThrow(
      EmailEnvValidationError,
    );
    expect(() => parseLocalEmailEnv(validEmailEnv({ SMTP_PORT: "5433" }))).toThrow(
      EmailEnvValidationError,
    );
    expect(() => parseLocalEmailEnv(validEmailEnv({ EMAIL_FROM: "not-an-email" }))).toThrow(
      EmailEnvValidationError,
    );
  });

  it("creates a Mailpit provider without wiring Better Auth email/password", () => {
    const provider = createLocalEmailProvider(validEmailEnv());
    expect(provider).toBeInstanceOf(MailpitEmailProvider);
    expect(provider.providerId).toBe("mailpit");
    expect(emailFoundationConstants.betterAuthEmailWired).toBe(false);
    expect(authFoundationConstants.emailAndPasswordEnabled).toBe(false);
    expect(authServerSource).not.toMatch(/emailAndPassword\s*:/);
    expect(authServerSource).not.toMatch(/createLocalEmailProvider|MailpitEmailProvider/);
  });

  it("delivers a probe message to local Mailpit over SMTP when available", async () => {
    let mailpitUp = false;
    try {
      const probe = await fetch("http://127.0.0.1:18025/api/v1/info");
      mailpitUp = probe.ok;
    } catch {
      mailpitUp = false;
    }

    if (!mailpitUp) {
      // CI and cold workstations skip live SMTP; lifecycle coverage is local.
      expect(emailFoundationConstants.smtpPort).toBe(11025);
      return;
    }

    const provider = createLocalEmailProvider(validEmailEnv());
    const marker = `phase-2c1-${Date.now()}`;
    await provider.send({
      to: "tester@example.com",
      subject: marker,
      text: "hello from local mailpit probe",
    });

    const response = await fetch("http://127.0.0.1:18025/api/v1/messages");
    expect(response.ok).toBe(true);
    const payload = (await response.json()) as {
      messages?: Array<{ Subject?: string }>;
    };
    expect(payload.messages?.some((message) => message.Subject === marker)).toBe(true);
  });
});
