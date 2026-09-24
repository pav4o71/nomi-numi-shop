import { createHash, randomBytes } from "node:crypto";

export function createOrderAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function digestOrderAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
