/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartDrawer } from "@/components/cart-drawer";
import { toast } from "sonner";
import * as checkoutApi from "@/lib/api/checkout-api";

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock hooks
const mockUseCartUI = {
  isCartOpen: true,
  closeCart: vi.fn(),
};

const mockUseCartData = {
  cart: {
    id: "cart_123",
    items: [
      {
        id: "item_1",
        variantId: "var_1",
        productId: "prod_1",
        title: "Test Product",
        quantity: 2,
        unitPrice: 1500,
        available: 10,
        isActive: true,
      },
    ],
    totalAmount: 3000,
    currency: "USD",
  },
  isLoading: false,
};

const mockUpdateItem = vi.fn().mockResolvedValue({ ok: true });
const mockRemoveItem = vi.fn().mockResolvedValue({ ok: true });

vi.mock("@/cart/client", () => ({
  useCartUI: () => mockUseCartUI,
  useCartData: () => mockUseCartData,
  useCartApi: () => ({
    updateItem: mockUpdateItem,
    removeItem: mockRemoveItem,
  }),
}));

vi.mock("@/lib/api/checkout-api", () => ({
  submitCheckout: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("CartDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it("renders cart items correctly", () => {
    render(<CartDrawer />);
    
    // Check item title
    expect(screen.getByText("Test Product")).toBeTruthy();
    
    // Check quantity is displayed
    expect(screen.getByText("2", { selector: "span" })).toBeTruthy();
    
    // Check price formatting (assuming $15.00 for 1500 amountMinor in USD)
    expect(screen.getByText("$15.00")).toBeTruthy();
    expect(screen.getByText("$30.00")).toBeTruthy(); // Total
  });

  it("calls updateItem when increasing quantity", async () => {
    const user = userEvent.setup();
    render(<CartDrawer />);
    
    const increaseBtn = screen.getByLabelText("Increase quantity of Test Product");
    await user.click(increaseBtn);
    
    expect(mockUpdateItem).toHaveBeenCalledWith("item_1", 3);
  });

  it("displays toast error if updateItem fails", async () => {
    mockUpdateItem.mockResolvedValueOnce({ ok: false, error: "Network Error" });
    const user = userEvent.setup();
    render(<CartDrawer />);
    
    const decreaseBtn = screen.getByLabelText("Decrease quantity of Test Product");
    await user.click(decreaseBtn);
    
    expect(mockUpdateItem).toHaveBeenCalledWith("item_1", 1);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Network Error");
    });
  });

  it("displays inline error if checkout email is empty", async () => {
    const user = userEvent.setup();
    render(<CartDrawer />);
    
    const proceedBtn = screen.getByText("Proceed to Checkout");
    await user.click(proceedBtn);
    
    expect(screen.getByText("Enter the email address for your receipt.")).toBeTruthy();
    expect(checkoutApi.submitCheckout).not.toHaveBeenCalled();
  });

  it("displays inline error if checkout returns inventory conflict", async () => {
    vi.mocked(checkoutApi.submitCheckout).mockResolvedValueOnce({
      ok: false,
      status: 409,
      isInventoryConflict: true,
      error: "Item no longer available.",
    });

    const user = userEvent.setup();
    render(<CartDrawer />);
    
    const emailInput = screen.getByLabelText("Receipt email");
    await user.type(emailInput, "test@example.com");
    
    const proceedBtn = screen.getByText("Proceed to Checkout");
    await user.click(proceedBtn);
    
    await waitFor(() => {
      expect(screen.getByText("Item no longer available.")).toBeTruthy();
    });
  });
});
