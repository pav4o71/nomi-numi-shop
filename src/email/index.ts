/**
 * Email provider abstraction for Phase 2C1 / 2C2.
 * Local Mailpit is the only implemented provider. Production providers later.
 */

import {
  LOCAL_EMAIL_FROM_DEFAULT,
  LOCAL_EMAIL_PROVIDER_ID,
  LOCAL_MAILPIT_UI_ORIGIN,
  LOCAL_SMTP_HOST,
  LOCAL_SMTP_PORT,
  type LocalEmailRuntimeConfig,
  parseLocalEmailEnv,
} from "@/email/env";
import { sendSmtpMessage } from "@/email/smtp-send";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
};

export interface EmailProvider {
  readonly providerId: typeof LOCAL_EMAIL_PROVIDER_ID | string;
  send(message: EmailMessage): Promise<void>;
}

export class MailpitEmailProvider implements EmailProvider {
  readonly providerId = LOCAL_EMAIL_PROVIDER_ID;
  private readonly config: LocalEmailRuntimeConfig;

  constructor(config: LocalEmailRuntimeConfig) {
    this.config = config;
  }

  async send(message: EmailMessage): Promise<void> {
    const to = message.to.trim();
    if (!to || to.includes("\n") || to.includes("\r")) {
      throw new Error("email recipient is invalid");
    }

    const subject = message.subject.trim();
    if (!subject || subject.includes("\n") || subject.includes("\r")) {
      throw new Error("email subject is invalid");
    }

    const from = (message.from ?? this.config.from).trim();

    await sendSmtpMessage({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      from,
      to,
      subject,
      text: message.text,
      html: message.html,
    });
  }
}

/**
 * Create the local Mailpit email provider from validated env input.
 * Phase 2C2 wires this provider into Better Auth verification/reset.
 */
export function createLocalEmailProvider(
  input: Parameters<typeof parseLocalEmailEnv>[0] = process.env,
): MailpitEmailProvider {
  const config = parseLocalEmailEnv(input);
  return new MailpitEmailProvider(config);
}

/** Constants for tests and documentation alignment. */
export const emailFoundationConstants = {
  providerId: LOCAL_EMAIL_PROVIDER_ID,
  smtpHost: LOCAL_SMTP_HOST,
  smtpPort: LOCAL_SMTP_PORT,
  mailpitUiOrigin: LOCAL_MAILPIT_UI_ORIGIN,
  defaultFrom: LOCAL_EMAIL_FROM_DEFAULT,
  productionProviderConfigured: false,
  betterAuthEmailWired: true,
} as const;
