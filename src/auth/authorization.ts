/**
 * Phase 2B server authorization foundation.
 *
 * Authorizes only from a server-validated Better Auth session.
 * Cookie existence and client-visible role claims are never sufficient.
 */
import { getAuth } from "@/auth/server";
import { isAppRole, type AppRole } from "@/auth/roles";

export type AuthorizationPrincipal = {
  userId: string;
  role: AppRole;
};

export type AuthorizationErrorCode =
  "UNAUTHENTICATED" | "FORBIDDEN" | "INVALID_AUTHORIZATION_STATE";

export class AuthorizationError extends Error {
  readonly code: AuthorizationErrorCode;

  constructor(code: AuthorizationErrorCode, message: string) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
  }
}

type SessionLike = {
  user: {
    id: string;
    role?: unknown;
  };
} | null;

/**
 * Pure principal extraction from an already-validated session object.
 * Returns null when unauthenticated. Fails closed on missing/unknown role.
 */
export function principalFromSession(session: SessionLike): AuthorizationPrincipal | null {
  if (session === null) {
    return null;
  }

  const { id: userId, role } = session.user;
  if (typeof userId !== "string" || userId.length === 0) {
    throw new AuthorizationError(
      "INVALID_AUTHORIZATION_STATE",
      "Authenticated session is missing a valid user identity",
    );
  }

  if (!isAppRole(role)) {
    throw new AuthorizationError(
      "INVALID_AUTHORIZATION_STATE",
      "Authenticated session has an invalid application role",
    );
  }

  return { userId, role };
}

/**
 * Pure authentication gate: any valid principal passes.
 */
export function assertAuthenticated(
  principal: AuthorizationPrincipal | null,
): AuthorizationPrincipal {
  if (principal === null) {
    throw new AuthorizationError("UNAUTHENTICATED", "Authentication required");
  }
  return principal;
}

/**
 * Pure exact-role gate. No role hierarchy.
 */
export function assertRole(
  principal: AuthorizationPrincipal,
  requiredRole: AppRole,
): AuthorizationPrincipal {
  if (principal.role !== requiredRole) {
    throw new AuthorizationError("FORBIDDEN", "Required application role not granted");
  }
  return principal;
}

/**
 * Resolve a minimal authorization principal from request headers via
 * Better Auth `auth.api.getSession`. Infrastructure failures propagate.
 */
export async function getAuthorizationPrincipal(
  headers: Headers,
): Promise<AuthorizationPrincipal | null> {
  const session = await getAuth().api.getSession({ headers });
  return principalFromSession(session);
}

export async function requireAuthenticated(headers: Headers): Promise<AuthorizationPrincipal> {
  return assertAuthenticated(await getAuthorizationPrincipal(headers));
}

export async function requireCustomer(headers: Headers): Promise<AuthorizationPrincipal> {
  return assertRole(await requireAuthenticated(headers), "customer");
}

export async function requireAdmin(headers: Headers): Promise<AuthorizationPrincipal> {
  return assertRole(await requireAuthenticated(headers), "admin");
}
