/**
 * Phase 4A admin catalog API helpers.
 *
 * Maps CatalogError codes to HTTP status codes and provides
 * request body parsing with structured error responses.
 * Individual admin route files stay thin by delegating to these helpers.
 */

import { authorizationErrorResponse } from "@/auth/http";
import { type CatalogErrorCode, isCatalogError } from "@/catalog/errors";

/** Map CatalogError codes to HTTP status codes. */
const CATALOG_ERROR_STATUS: Record<CatalogErrorCode, number> = {
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

/**
 * Build a JSON error response from a CatalogError.
 * Returns null for non-catalog errors so infrastructure failures
 * are not masked as domain errors.
 */
export function catalogErrorResponse(error: unknown): Response | null {
  if (!isCatalogError(error)) return null;
  const status = CATALOG_ERROR_STATUS[error.code];
  return Response.json(
    { code: error.code, message: error.message, issues: error.issues },
    { status },
  );
}

/**
 * Unified admin catalog route error handler.
 * Checks authorization errors first, then catalog domain errors.
 * Unknown errors are re-thrown (Next.js will produce 500).
 */
export function adminCatalogErrorResponse(error: unknown): Response {
  const authResp = authorizationErrorResponse(error);
  if (authResp) return authResp;
  const catalogResp = catalogErrorResponse(error);
  if (catalogResp) return catalogResp;
  throw error;
}

/**
 * Parse JSON request body. Returns null if body is empty or malformed.
 */
export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
