import { requireAdmin } from "@/auth/authorization";
import { authorizationErrorResponse } from "@/auth/http";

/**
 * Minimal admin-protected API. Exact `admin` role via `requireAdmin`.
 * Unauthenticated → 401 UNAUTHENTICATED; wrong/invalid role → 403.
 */
export async function GET(request: Request) {
  try {
    const principal = await requireAdmin(request.headers);
    return Response.json({
      ok: true,
      role: principal.role,
      userId: principal.userId,
    });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }
    throw error;
  }
}
