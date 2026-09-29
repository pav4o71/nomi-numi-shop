/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountDashboard } from "@/components/account/account-dashboard";
import { toast } from "sonner";
import * as accountApi from "@/lib/api/account-api";

vi.mock("@/lib/api/account-api", () => ({
  createAddress: vi.fn(),
  deleteAddress: vi.fn(),
  toggleWishlistItem: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockOrder = {
  id: "order_1",
  email: "test@example.com",
  currency: "USD",
  orderStatus: "open",
  paymentStatus: "paid",
  fulfillmentStatus: "unfulfilled",
  subtotalAmount: 1500,
  shippingAmount: 0,
  taxAmount: 0,
  totalAmount: 1500,
  createdAt: "2023-01-01T00:00:00.000Z",
  updatedAt: "2023-01-01T00:00:00.000Z",
};

const mockAddress = {
  id: "addr_1",
  type: "shipping" as const,
  name: "John Doe",
  street: "123 Main St",
  city: "Cityville",
  postalCode: "12345",
  country: "Country",
  isDefault: true,
  createdAt: "2023-01-01T00:00:00.000Z",
  updatedAt: "2023-01-01T00:00:00.000Z",
};

describe("AccountDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it("renders orders with formatted money", () => {
    render(
      <AccountDashboard
        initialAddresses={[]}
        initialWishlist={[]}
        orders={[mockOrder]}
      />
    );
    expect(screen.getByText("order_1")).toBeTruthy();
    expect(screen.getByText("paid · open")).toBeTruthy();
    // 1500 in USD is $15.00
    expect(screen.getByText("$15.00")).toBeTruthy();
  });

  it("handles address creation and success toast", async () => {
    vi.mocked(accountApi.createAddress).mockResolvedValueOnce({
      ok: true,
      address: { ...mockAddress, id: "addr_2", street: "456 New St" },
    });

    const user = userEvent.setup();
    render(
      <AccountDashboard
        initialAddresses={[]}
        initialWishlist={[]}
        orders={[]}
      />
    );

    await user.type(screen.getByPlaceholderText("Full name"), "Jane Doe");
    await user.type(screen.getByPlaceholderText("Street"), "456 New St");
    await user.type(screen.getByPlaceholderText("City"), "Townsville");
    await user.type(screen.getByPlaceholderText("Postal code"), "54321");
    await user.type(screen.getByPlaceholderText("Country"), "Country");
    
    await user.click(screen.getByRole("button", { name: "Add address" }));

    expect(accountApi.createAddress).toHaveBeenCalled();
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Address saved.");
      expect(screen.getByText(/456 New St/)).toBeTruthy();
    });
  });

  it("handles address deletion and error toast", async () => {
    vi.mocked(accountApi.deleteAddress).mockResolvedValueOnce({
      ok: false,
      status: 500,
      error: "Server Error",
    });

    const user = userEvent.setup();
    render(
      <AccountDashboard
        initialAddresses={[mockAddress]}
        initialWishlist={[]}
        orders={[]}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(deleteBtn);

    expect(accountApi.deleteAddress).toHaveBeenCalledWith("addr_1");
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Server Error");
    });
    // Address should still be visible
    expect(screen.getByText(/123 Main St/)).toBeTruthy();
  });

  it("handles wishlist item removal", async () => {
    vi.mocked(accountApi.toggleWishlistItem).mockResolvedValueOnce({ ok: true });

    const user = userEvent.setup();
    render(
      <AccountDashboard
        initialAddresses={[]}
        initialWishlist={[{ id: "w_1", variantId: "var_1", createdAt: "" }]}
        orders={[]}
      />
    );

    const removeBtn = screen.getByRole("button", { name: "Remove" });
    await user.click(removeBtn);

    expect(accountApi.toggleWishlistItem).toHaveBeenCalledWith("var_1", false);
    await waitFor(() => {
      expect(screen.queryByText("Variant var_1")).toBeNull();
    });
  });
});
