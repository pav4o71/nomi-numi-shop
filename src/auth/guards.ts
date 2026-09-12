/**
 * Phase 2C5 server page guards.
 *
 * Pages must call these (or the underlying authorization primitives) on the
 * server. Client `useSession` is never authorization.
 */
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireAdmin,
  requireCustomer,
  type AuthorizationPrincipal,
} from "@/auth/authorization";
import { AUTH_UI_ROUTES, PROTECTED_SURFACE_ROUTES } from "@/auth/routes";
import { buildLoginHref } from "@/auth/safe-navigation";

function handlePageAuthorizationFailure(error: unknown, intendedPath: string): never {
  if (error instanceof AuthorizationError) {
    if (error.code === "UNAUTHENTICATED") {
      redirect(buildLoginHref(AUTH_UI_ROUTES.login, intendedPath));
    }
    // Wrong role and invalid/missing role fail closed — not a login prompt.
    redirect(PROTECTED_SURFACE_ROUTES.forbidden);
  }
  // Preserve infrastructure-error identity (do not map to auth denial).
  throw error;
}

export async function requireCustomerPage(
  headers: Headers,
  intendedPath: string = PROTECTED_SURFACE_ROUTES.account,
): Promise<AuthorizationPrincipal> {
  try {
    return await requireCustomer(headers);
  } catch (error) {
    handlePageAuthorizationFailure(error, intendedPath);
  }
}

export async function requireAdminPage(
  headers: Headers,
  intendedPath: string = PROTECTED_SURFACE_ROUTES.admin,
): Promise<AuthorizationPrincipal> {
  try {
    return await requireAdmin(headers);
  } catch (error) {
    handlePageAuthorizationFailure(error, intendedPath);
  }
}
