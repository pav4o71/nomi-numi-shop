export class CustomerError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "CustomerError";
  }
}

export function isCustomerError(error: unknown): error is CustomerError {
  return error instanceof CustomerError;
}
