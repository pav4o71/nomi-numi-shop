/**
 * Safe post-login / intended-navigation helpers for Phase 2C5.
 *
 * Only same-origin relative paths are accepted. Absolute URLs, protocol-
 * relative URLs, and other open-redirect shapes are rejected.
 */

/**
 * Returns a safe in-app path or null when the candidate is unsafe/missing.
 */
export function sanitizeNextPath(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 512) {
    return null;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return null;
  }

  if (!decoded.startsWith("/")) {
    return null;
  }
  if (decoded.startsWith("//") || decoded.startsWith("/\\")) {
    return null;
  }
  if (decoded.includes("\\") || decoded.includes("://") || decoded.includes("@")) {
    return null;
  }
  if (/[\u0000-\u001f\u007f]/.test(decoded)) {
    return null;
  }

  return decoded;
}

/**
 * Build `/login?next=…` only when `nextPath` sanitizes cleanly.
 * Otherwise return bare `/login` (no open-redirect vector).
 */
export function buildLoginHref(loginPath: string, nextPath: string): string {
  const safeNext = sanitizeNextPath(nextPath);
  if (!safeNext) {
    return loginPath;
  }
  const params = new URLSearchParams({ next: safeNext });
  return `${loginPath}?${params.toString()}`;
}

/**
 * Resolve post-login destination from a query value, defaulting to `/`.
 */
export function resolvePostLoginPath(rawNext: string | null | undefined): string {
  return sanitizeNextPath(rawNext) ?? "/";
}
