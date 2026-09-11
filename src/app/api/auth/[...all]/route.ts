import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/auth/server";

export const runtime = "nodejs";

/**
 * Lazy Better Auth handler: initializes auth only when /api/auth is invoked.
 * Storefront rendering remains independent of DATABASE_URL / secrets.
 */
async function handler(request: Request): Promise<Response> {
  return getAuth().handler(request);
}

export const { GET, POST } = toNextJsHandler(handler);
