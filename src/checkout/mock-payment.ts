import { timingSafeEqual } from "node:crypto";

function requireLocalMockConfiguration() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Mock payments are disabled in production");
  }
  const secret = process.env.MOCK_PAYMENT_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("MOCK_PAYMENT_WEBHOOK_SECRET must contain at least 32 characters");
  }
  const outcome = process.env.MOCK_PAYMENT_OUTCOME ?? "success";
  if (outcome !== "success" && outcome !== "failure") {
    throw new Error("MOCK_PAYMENT_OUTCOME must be success or failure");
  }
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3100";
  return { secret, outcome, baseUrl } as const;
}

export function authenticateMockWebhook(authorization: string | null): boolean {
  const secret = process.env.MOCK_PAYMENT_WEBHOOK_SECRET;
  if (!secret || secret.length < 32 || !authorization?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export class MockPaymentProvider {
  static async deliverPayment(orderId: string): Promise<void> {
    const { secret, outcome, baseUrl } = requireLocalMockConfiguration();
    const response = await fetch(`${baseUrl}/api/webhooks/mock-payment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        status: outcome === "success" ? "PAID" : "FAILED",
        transactionId: `mock:${orderId}:${outcome}`,
      }),
    });
    if (!response.ok) throw new Error(`Mock payment webhook failed with status ${response.status}`);
  }
}
