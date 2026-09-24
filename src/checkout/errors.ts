export type CheckoutErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "CONFLICT";

export class CheckoutError extends Error {
  constructor(
    readonly code: CheckoutErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

export function isCheckoutError(error: unknown): error is CheckoutError {
  return error instanceof CheckoutError;
}

export function invalidCheckoutInput(message: string): CheckoutError {
  return new CheckoutError("INVALID_INPUT", message);
}

export function checkoutNotFound(message = "Order not found"): CheckoutError {
  return new CheckoutError("NOT_FOUND", message);
}

export function checkoutConflict(message: string): CheckoutError {
  return new CheckoutError("CONFLICT", message);
}
