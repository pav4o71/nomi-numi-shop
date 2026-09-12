import { requireCustomer } from "@/auth/authorization";
import { authorizationErrorResponse } from "@/auth/http";

/**
 * Minimal customer-protected API. Exact `customer` role required.
 * Unauthenticated → 401 UNAUTHENTICATED; wrong/invalid role → 403.
 */
export async function GET(request: Request) {
  try {
    const principal = await requireCustomer(request.headers);
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
