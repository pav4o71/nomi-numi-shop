import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthorizationError } from "@/auth/authorization";
import { GET as getAddresses, POST as postAddresses } from "@/app/api/account/addresses/route";
import { GET as getWishlist, POST as postWishlist } from "@/app/api/account/wishlist/route";
import * as auth from "@/auth/authorization";

vi.mock("@/auth/authorization", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/auth/authorization")>();
  return {
    ...actual,
    requireCustomer: vi.fn(),
  };
});

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

describe("Account API route error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const unauthenticatedError = new AuthorizationError("UNAUTHENTICATED", "Authentication required");
  const forbiddenError = new AuthorizationError(
    "FORBIDDEN",
    "Required application role not granted",
  );

  it("GET addresses returns 401 on unauthenticated", async () => {
    vi.mocked(auth.requireCustomer).mockRejectedValueOnce(unauthenticatedError);
    const res = await getAddresses();
    expect(res.status).toBe(401);
  });

  it("POST addresses returns 401 on unauthenticated", async () => {
    vi.mocked(auth.requireCustomer).mockRejectedValueOnce(unauthenticatedError);
    const res = await postAddresses(
      new Request("http://localhost", { method: "POST", body: "{}" }),
    );
    expect(res.status).toBe(401);
  });

  it("GET addresses returns 403 on forbidden", async () => {
    vi.mocked(auth.requireCustomer).mockRejectedValueOnce(forbiddenError);
    const res = await getAddresses();
    expect(res.status).toBe(403);
  });

  it("POST addresses returns 400 on malformed JSON", async () => {
    vi.mocked(auth.requireCustomer).mockResolvedValueOnce({ userId: "u_1", role: "customer" });
    const res = await postAddresses(
      new Request("http://localhost", { method: "POST", body: "invalid json" }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON");
  });

  it("GET wishlist returns 401 on unauthenticated", async () => {
    vi.mocked(auth.requireCustomer).mockRejectedValueOnce(unauthenticatedError);
    const res = await getWishlist();
    expect(res.status).toBe(401);
  });

  it("POST wishlist returns 401 on unauthenticated", async () => {
    vi.mocked(auth.requireCustomer).mockRejectedValueOnce(unauthenticatedError);
    const res = await postWishlist(new Request("http://localhost", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
  });

  it("GET wishlist returns 403 on forbidden", async () => {
    vi.mocked(auth.requireCustomer).mockRejectedValueOnce(forbiddenError);
    const res = await getWishlist();
    expect(res.status).toBe(403);
  });

  it("POST wishlist returns 400 on malformed JSON", async () => {
    vi.mocked(auth.requireCustomer).mockResolvedValueOnce({ userId: "u_1", role: "customer" });
    const res = await postWishlist(
      new Request("http://localhost", { method: "POST", body: "invalid json" }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON");
  });
});
