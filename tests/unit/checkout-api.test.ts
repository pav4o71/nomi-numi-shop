import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/checkout/route";

const { cookieGetMock, cookieSetMock, createOrderFromCartMock } = vi.hoisted(() => ({
  cookieGetMock: vi.fn(() => ({ value: "sess_123" })),
  cookieSetMock: vi.fn(),
  createOrderFromCartMock: vi.fn(),
}));

vi.mock("@/auth/authorization", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/auth/authorization")>();
  return {
    ...actual,
    getAuthorizationPrincipal: vi.fn(),
  };
});

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
  cookies: vi.fn(() => ({
    get: cookieGetMock,
    set: cookieSetMock,
    delete: vi.fn(),
  })),
}));

vi.mock("@/checkout/service", () => {
  return {
    CheckoutService: vi.fn().mockImplementation(function MockCheckoutService() {
      return { createOrderFromCart: createOrderFromCartMock };
    }),
  };
});
vi.mock("@/cart/service", () => ({ CartService: vi.fn() }));
vi.mock("@/catalog/service", () => ({ CatalogService: vi.fn() }));
vi.mock("@/cart/repository", () => ({ DrizzleCartRepository: vi.fn() }));
vi.mock("@/checkout/repository", () => ({ DrizzleCheckoutRepository: vi.fn() }));
vi.mock("@/catalog/repository", () => ({ DrizzleCatalogRepository: vi.fn() }));
vi.mock("@/db/runtime", () => ({ getRuntimeDb: vi.fn() }));
vi.mock("@/checkout/mock-payment", () => ({
  MockPaymentProvider: { deliverPayment: vi.fn() },
}));

describe("Checkout API route error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieGetMock.mockReturnValue({ value: "sess_123" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("POST /api/checkout returns 400 on malformed JSON", async () => {
    const res = await POST(
      new Request("http://localhost", { method: "POST", body: "invalid json" }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON");
  });

  it("POST /api/checkout returns 400 on missing email", async () => {
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ idempotencyKey: "ik_123" }),
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid input");
  });

  it("POST /api/checkout returns 400 on invalid email", async () => {
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email", idempotencyKey: "ik_123" }),
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid input");
  });

  it("sets the order-specific guest capability cookie without exposing it in JSON", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const rawCapability = "test-only-raw-guest-capability";
    createOrderFromCartMock.mockResolvedValueOnce({
      order: {
        id: "order_123",
        customerId: null,
        email: "guest@example.com",
        currency: "USD",
        orderStatus: "confirmed",
        paymentStatus: "paid",
        fulfillmentStatus: "unfulfilled",
        subtotalAmount: 2000,
        shippingAmount: 0,
        taxAmount: 0,
        totalAmount: 2000,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      guestAccessToken: rawCapability,
      created: true,
    });

    const response = await POST(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          email: "guest@example.com",
          idempotencyKey: "guest-cookie-attempt",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(cookieSetMock).toHaveBeenCalledWith({
      name: "nomi_order_access_order_123",
      value: rawCapability,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    const body = await response.json();
    expect(body).toMatchObject({
      order: { id: "order_123" },
      successPath: "/checkout/order_123/success",
    });
    expect(JSON.stringify(body)).not.toContain(rawCapability);
  });
});
