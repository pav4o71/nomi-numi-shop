/**
 * Minimal local SMTP client for Mailpit (no auth, loopback only).
 * Intentionally tiny: Phase 2C1 does not introduce a production MTA SDK.
 */

import { Socket } from "node:net";

export type SmtpSendInput = {
  host: string;
  port: number;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  timeoutMs?: number;
};

function encodeSubject(subject: string): string {
  if (/^[\x20-\x7E]*$/.test(subject)) {
    return subject;
  }
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

function buildMimeMessage(input: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}): string {
  const date = new Date().toUTCString();
  const subject = encodeSubject(input.subject);

  if (!input.html) {
    return [
      `From: ${input.from}`,
      `To: ${input.to}`,
      `Subject: ${subject}`,
      `Date: ${date}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="utf-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      input.text,
    ].join("\r\n");
  }

  const boundary = `nomi-numi-${Date.now().toString(16)}`;
  return [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    input.text,
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    input.html,
    `--${boundary}--`,
  ].join("\r\n");
}

function dotStuff(body: string): string {
  return body.replace(/^\./gm, "..");
}

class SmtpSession {
  private buffer = "";

  constructor(private readonly socket: Socket) {}

  async expect(expectedCode: number, commandLabel: string): Promise<void> {
    const reply = await this.readReply();
    const code = Number(reply.slice(0, 3));
    if (code !== expectedCode) {
      throw new Error(`SMTP ${commandLabel} failed: expected ${expectedCode}, got ${reply.trim()}`);
    }
  }

  async command(line: string, expectedCode: number, label: string): Promise<void> {
    await this.write(`${line}\r\n`);
    await this.expect(expectedCode, label);
  }

  async write(payload: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.socket.write(payload, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  private async readReply(): Promise<string> {
    const collected: string[] = [];

    while (true) {
      while (!this.buffer.includes("\n")) {
        const chunk = await this.readChunk();
        this.buffer += chunk.toString("utf8");
      }

      const newlineIndex = this.buffer.indexOf("\n");
      let line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) {
        line = line.slice(0, -1);
      }

      collected.push(line);

      if (/^[0-9]{3}-/.test(line)) {
        continue;
      }

      if (/^[0-9]{3} /.test(line) || /^[0-9]{3}$/.test(line)) {
        return collected.join("\n");
      }

      throw new Error(`Unexpected SMTP reply line: ${line}`);
    }
  }

  private readChunk(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const onData = (data: Buffer) => {
        cleanup();
        resolve(data);
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const onClose = () => {
        cleanup();
        reject(new Error("SMTP connection closed before reply"));
      };
      const cleanup = () => {
        this.socket.off("data", onData);
        this.socket.off("error", onError);
        this.socket.off("close", onClose);
      };
      this.socket.on("data", onData);
      this.socket.on("error", onError);
      this.socket.on("close", onClose);
    });
  }
}

/**
 * Send one message over unauthenticated SMTP to a local Mailpit listener.
 */
export async function sendSmtpMessage(input: SmtpSendInput): Promise<void> {
  if (input.host !== "127.0.0.1") {
    throw new Error("SMTP host must be 127.0.0.1");
  }
  if (input.port !== 11025) {
    throw new Error("SMTP port must be 11025");
  }

  const timeoutMs = input.timeoutMs ?? 10_000;
  const mime = buildMimeMessage(input);
  const stuffed = dotStuff(mime);
  const socket = new Socket();

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("SMTP connection timed out"));
      }, timeoutMs);

      socket.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      socket.connect(input.port, input.host, () => {
        clearTimeout(timer);
        resolve();
      });
    });

    const session = new SmtpSession(socket);
    await session.expect(220, "banner");
    await session.command("EHLO nomi-numi-shop.local", 250, "EHLO");
    await session.command(`MAIL FROM:<${input.from}>`, 250, "MAIL FROM");
    await session.command(`RCPT TO:<${input.to}>`, 250, "RCPT TO");
    await session.command("DATA", 354, "DATA");
    await session.write(`${stuffed}\r\n.\r\n`);
    await session.expect(250, "message body");
    await session.command("QUIT", 221, "QUIT");
  } finally {
    socket.destroy();
  }
}
