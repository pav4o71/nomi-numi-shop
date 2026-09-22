import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/checkout/route";
import * as auth from "@/auth/authorization";

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
    get: vi.fn(() => ({ value: "sess_123" })),
  })),
}));

vi.mock("@/checkout/service", () => {
  return {
    CheckoutService: vi.fn().mockImplementation(() => ({
      createOrderFromCart: vi.fn().mockResolvedValue({ id: "order_123" }),
    })),
  };
});
vi.mock("@/cart/service", () => ({ CartService: vi.fn() }));
vi.mock("@/catalog/service", () => ({ CatalogService: vi.fn() }));
vi.mock("@/cart/repository", () => ({ DrizzleCartRepository: vi.fn() }));
vi.mock("@/checkout/repository", () => ({ DrizzleCheckoutRepository: vi.fn() }));
vi.mock("@/catalog/repository", () => ({ DrizzleCatalogRepository: vi.fn() }));
vi.mock("@/db/runtime", () => ({ getRuntimeDb: vi.fn() }));

describe("Checkout API route error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
