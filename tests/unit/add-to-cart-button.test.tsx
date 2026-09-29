/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { toast } from "sonner";

const mockOpenCart = vi.fn();
const mockAddItem = vi.fn();

vi.mock("@/cart/client", () => ({
  useCartUI: () => ({ openCart: mockOpenCart }),
  useCartApi: () => ({ addItem: mockAddItem }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("AddToCartButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it("calls addItem and openCart on successful add", async () => {
    mockAddItem.mockResolvedValueOnce({ ok: true });
    
    const user = userEvent.setup();
    render(<AddToCartButton variantId="var_1" />);
    
    const btn = screen.getByRole("button", { name: "Add to Cart" });
    await user.click(btn);
    
    expect(mockAddItem).toHaveBeenCalledWith("var_1", 1);
    await waitFor(() => {
      expect(mockOpenCart).toHaveBeenCalled();
    });
  });

  it("shows toast error on failed add", async () => {
    mockAddItem.mockResolvedValueOnce({ ok: false, error: "Out of stock" });
    
    const user = userEvent.setup();
    render(<AddToCartButton variantId="var_1" />);
    
    const btn = screen.getByRole("button", { name: "Add to Cart" });
    await user.click(btn);
    
    expect(mockAddItem).toHaveBeenCalledWith("var_1", 1);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Out of stock");
    });
    expect(mockOpenCart).not.toHaveBeenCalled();
  });

  it("shows generic toast error if addItem throws unexpectedly", async () => {
    mockAddItem.mockRejectedValueOnce(new Error("Network disconnect"));
    
    const user = userEvent.setup();
    render(<AddToCartButton variantId="var_1" />);
    
    const btn = screen.getByRole("button", { name: "Add to Cart" });
    await user.click(btn);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Could not add item to cart. Please try again.");
    });
    expect(mockOpenCart).not.toHaveBeenCalled();
  });
});
