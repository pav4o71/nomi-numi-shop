export type CartErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "CONFLICT";

export class CartError extends Error {
  constructor(
    readonly code: CartErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CartError";
  }
}

export function isCartError(error: unknown): error is CartError {
  return error instanceof CartError;
}

export function invalidCartInput(message: string): CartError {
  return new CartError("INVALID_INPUT", message);
}

export function cartNotFound(message = "Cart not found"): CartError {
  return new CartError("NOT_FOUND", message);
}

export function cartConflict(message: string): CartError {
  return new CartError("CONFLICT", message);
}
