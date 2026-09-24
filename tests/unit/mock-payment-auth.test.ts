import { afterEach, describe, expect, it } from "vitest";
import { authenticateMockWebhook } from "@/checkout/mock-payment";

const originalSecret = process.env.MOCK_PAYMENT_WEBHOOK_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.MOCK_PAYMENT_WEBHOOK_SECRET;
  else process.env.MOCK_PAYMENT_WEBHOOK_SECRET = originalSecret;
});

describe("mock payment webhook authentication", () => {
  it("accepts only the exact configured bearer secret", () => {
    const secret = "a-secure-local-secret-with-32-characters";
    process.env.MOCK_PAYMENT_WEBHOOK_SECRET = secret;
    expect(authenticateMockWebhook(`Bearer ${secret}`)).toBe(true);
    expect(authenticateMockWebhook("Bearer wrong-secret")).toBe(false);
    expect(authenticateMockWebhook(null)).toBe(false);
  });

  it("fails closed when the configured secret is too short", () => {
    process.env.MOCK_PAYMENT_WEBHOOK_SECRET = "short";
    expect(authenticateMockWebhook("Bearer short")).toBe(false);
  });
});
