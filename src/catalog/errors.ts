/**
 * Phase 3B catalog domain error boundaries.
 *
 * Domain failures use CatalogError. Unexpected PostgreSQL / Drizzle /
 * infrastructure failures must not be rewritten into these codes.
 * HTTP status mapping is intentionally out of scope for Phase 3B.
 */

export type CatalogErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "CONFLICT";

export type CatalogErrorIssue = {
  path?: Array<string | number>;
  message: string;
  code?: string;
};

export class CatalogError extends Error {
  readonly code: CatalogErrorCode;
  readonly issues: CatalogErrorIssue[];

  constructor(code: CatalogErrorCode, message: string, issues: CatalogErrorIssue[] = []) {
    super(message);
    this.name = "CatalogError";
    this.code = code;
    this.issues = issues;
  }
}

export function isCatalogError(error: unknown): error is CatalogError {
  return error instanceof CatalogError;
}

export function invalidInput(message: string, issues: CatalogErrorIssue[] = []): CatalogError {
  return new CatalogError("INVALID_INPUT", message, issues);
}

export function notFound(message: string): CatalogError {
  return new CatalogError("NOT_FOUND", message);
}

export function conflict(message: string, issues: CatalogErrorIssue[] = []): CatalogError {
  return new CatalogError("CONFLICT", message, issues);
}
