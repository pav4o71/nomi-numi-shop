/**
 * Typed client-side fetch wrapper for POST /api/checkout.
 *
 * Preserves the idempotency key contract exactly as the server expects it.
 * The caller is responsible for generating and retaining the idempotency key.
 */

// ─── Request / Response shapes ────────────────────────────────────────────────

export type CheckoutRequest = {
  email: string;
  /** UUID generated once per checkout attempt; must be retained across retries. */
  idempotencyKey: string;
};

export type CheckoutSuccess = {
  ok: true;
  /** Server-provided path; use `router.push(result.successPath)`. */
  successPath: string;
};

export type CheckoutApiError = {
  ok: false;
  status: number;
  error: string;
  /** 409 means inventory conflict — caller should refresh cart and show error. */
  isInventoryConflict: boolean;
};

export type CheckoutResult = CheckoutSuccess | CheckoutApiError;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Submit a checkout attempt.
 *
 * Returns `{ ok: true, successPath }` on success.
 * Returns `{ ok: false, isInventoryConflict: true }` on 409 (stock issue).
 * Returns `{ ok: false, isInventoryConflict: false }` on other errors.
 * Throws on network failure.
 */
export async function submitCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: req.email, idempotencyKey: req.idempotencyKey }),
  });

  if (response.ok) {
    const body = (await response.json()) as { successPath: string };
    return { ok: true, successPath: body.successPath };
  }

  let errorMessage = response.statusText ?? "Checkout failed";
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) errorMessage = body.error;
  } catch {
    // ignore parse failure
  }

  return {
    ok: false,
    status: response.status,
    error: errorMessage,
    isInventoryConflict: response.status === 409,
  };
}
