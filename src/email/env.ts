/**
 * Local-only email transport configuration (Phase 2C1).
 * Fail closed. Never log credential-bearing values.
 */

export const LOCAL_EMAIL_PROVIDER_ID = "mailpit" as const;
export const LOCAL_SMTP_HOST = "127.0.0.1" as const;
export const LOCAL_SMTP_PORT = 11025 as const;
export const LOCAL_MAILPIT_UI_ORIGIN = "http://127.0.0.1:18025" as const;
export const LOCAL_EMAIL_FROM_DEFAULT = "noreply@nomi-numi.local" as const;

export type LocalEmailEnvInput = {
  EMAIL_PROVIDER?: string | undefined;
  EMAIL_FROM?: string | undefined;
  SMTP_HOST?: string | undefined;
  SMTP_PORT?: string | undefined;
  NODE_ENV?: string | undefined;
  VERCEL?: string | undefined;
  VERCEL_ENV?: string | undefined;
};

export type LocalEmailRuntimeConfig = {
  provider: typeof LOCAL_EMAIL_PROVIDER_ID;
  from: string;
  smtp: {
    host: typeof LOCAL_SMTP_HOST;
    port: typeof LOCAL_SMTP_PORT;
  };
  mailpitUiOrigin: typeof LOCAL_MAILPIT_UI_ORIGIN;
};

export class EmailEnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailEnvValidationError";
  }
}

function reject(message: string): never {
  throw new EmailEnvValidationError(message);
}

/**
 * Validate Phase 2C1 local-only Mailpit email transport environment.
 * Does not connect to SMTP. Production providers are refused.
 */
export function parseLocalEmailEnv(input: LocalEmailEnvInput): LocalEmailRuntimeConfig {
  if (
    input.NODE_ENV === "production" ||
    input.VERCEL === "1" ||
    input.VERCEL_ENV === "production"
  ) {
    reject("Phase 2C1 email refuses production deployment environments");
  }

  const providerRaw = input.EMAIL_PROVIDER;
  if (typeof providerRaw !== "string" || providerRaw.length === 0) {
    reject("EMAIL_PROVIDER is required");
  }
  if (providerRaw !== LOCAL_EMAIL_PROVIDER_ID) {
    reject(`EMAIL_PROVIDER must be exactly ${LOCAL_EMAIL_PROVIDER_ID}`);
  }

  const fromRaw = input.EMAIL_FROM;
  if (typeof fromRaw !== "string" || fromRaw.trim().length === 0) {
    reject("EMAIL_FROM is required");
  }
  const from = fromRaw.trim();
  if (from.includes("\n") || from.includes("\r") || from.includes("<") || from.includes(">")) {
    reject("EMAIL_FROM must be a plain mailbox address without headers or angle brackets");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) {
    reject("EMAIL_FROM must look like a simple email address");
  }

  const hostRaw = input.SMTP_HOST;
  if (typeof hostRaw !== "string" || hostRaw.length === 0) {
    reject("SMTP_HOST is required");
  }
  if (hostRaw !== LOCAL_SMTP_HOST) {
    reject(`SMTP_HOST must be exactly ${LOCAL_SMTP_HOST}`);
  }

  const portRaw = input.SMTP_PORT;
  if (typeof portRaw !== "string" || portRaw.length === 0) {
    reject("SMTP_PORT is required");
  }
  if (!/^\d+$/.test(portRaw)) {
    reject("SMTP_PORT must be an integer");
  }
  const port = Number(portRaw);
  if (port === 5433) {
    reject("SMTP_PORT must not target protected port 5433");
  }
  if (port !== LOCAL_SMTP_PORT) {
    reject(`SMTP_PORT must be exactly ${LOCAL_SMTP_PORT}`);
  }

  return {
    provider: LOCAL_EMAIL_PROVIDER_ID,
    from,
    smtp: {
      host: LOCAL_SMTP_HOST,
      port: LOCAL_SMTP_PORT,
    },
    mailpitUiOrigin: LOCAL_MAILPIT_UI_ORIGIN,
  };
}
