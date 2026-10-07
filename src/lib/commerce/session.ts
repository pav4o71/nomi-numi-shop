import { headers, cookies } from "next/headers";
import { getAuthorizationPrincipal } from "@/auth/authorization";

export const CART_SESSION_COOKIE = "nomi_cart_session";
export const DEFAULT_CURRENCY = "USD";

export async function getCartIdentity() {
  const reqHeaders = await headers();
  const principal = await getAuthorizationPrincipal(reqHeaders);

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(CART_SESSION_COOKIE);

  return {
    customerId: principal?.role === "customer" ? principal.userId : null,
    sessionId: sessionCookie?.value ?? null,
  };
}
