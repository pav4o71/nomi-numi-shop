import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/auth/server";

export const runtime = "nodejs";

/**
 * Lazy Better Auth handler: initializes auth only when /api/auth is invoked.
 * Public catalog browsing uses DATABASE_URL-only DB runtime and does not
 * require Better Auth secrets; auth routes still validate auth env.
 */
async function handler(request: Request): Promise<Response> {
  return getAuth().handler(request);
}

export const { GET, POST } = toNextJsHandler(handler);
