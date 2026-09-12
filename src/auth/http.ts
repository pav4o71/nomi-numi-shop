/**
 * Map Phase 2B authorization errors to HTTP responses for route handlers.
 *
 * Infrastructure/`getSession` failures must not be translated into auth denial.
 */
import { AuthorizationError } from "@/auth/authorization";

export type AuthorizationHttpBody = {
  code: AuthorizationError["code"];
};

/**
 * Returns a 401/403 JSON response for AuthorizationError, or null so callers
 * can rethrow infrastructure failures unchanged.
 */
export function authorizationErrorResponse(error: unknown): Response | null {
  if (!(error instanceof AuthorizationError)) {
    return null;
  }

  const body: AuthorizationHttpBody = { code: error.code };

  if (error.code === "UNAUTHENTICATED") {
    return Response.json(body, { status: 401 });
  }

  // FORBIDDEN and INVALID_AUTHORIZATION_STATE both fail closed as 403.
  return Response.json(body, { status: 403 });
}
