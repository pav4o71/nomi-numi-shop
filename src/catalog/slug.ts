/**
 * Deterministic catalog slug normalization (docs/STORE_CATALOG.md §13).
 *
 * Locked Phase 3B contract:
 * - trim surrounding whitespace
 * - lowercase
 * - allow only letters, digits, spaces, hyphens, and underscores as input
 * - reject empty input and Unicode control / format characters
 * - reject any other character (no transliteration)
 * - spaces and underscores become hyphens
 * - collapse repeated hyphens; strip leading/trailing hyphens
 * - reject when the normalized result is empty
 */

import { invalidInput } from "@/catalog/errors";

const CONTROL_OR_FORMAT = /\p{Cc}|\p{Cf}/u;
const ALLOWED_INPUT = /^[A-Za-z0-9 _-]+$/u;

/**
 * Normalize a public catalog slug or throw CatalogError INVALID_INPUT.
 */
export function normalizeCatalogSlug(raw: unknown): string {
  if (typeof raw !== "string") {
    throw invalidInput("Slug must be a string", [
      { path: ["slug"], message: "Slug must be a string", code: "invalid_type" },
    ]);
  }

  if (CONTROL_OR_FORMAT.test(raw)) {
    throw invalidInput("Slug contains unsafe control characters", [
      {
        path: ["slug"],
        message: "Slug contains unsafe control characters",
        code: "unsafe_characters",
      },
    ]);
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw invalidInput("Slug must not be empty", [
      { path: ["slug"], message: "Slug must not be empty", code: "empty" },
    ]);
  }

  if (!ALLOWED_INPUT.test(trimmed)) {
    throw invalidInput("Slug contains unsupported characters", [
      {
        path: ["slug"],
        message: "Slug may only contain letters, digits, spaces, hyphens, and underscores",
        code: "unsupported_characters",
      },
    ]);
  }

  const normalized = trimmed
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized.length === 0) {
    throw invalidInput("Slug must not be empty after normalization", [
      {
        path: ["slug"],
        message: "Slug must not be empty after normalization",
        code: "empty",
      },
    ]);
  }

  return normalized;
}
