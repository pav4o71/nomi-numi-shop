/**
 * Map expected PostgreSQL unique/check violations to catalog conflicts.
 * Unrelated infrastructure errors are left untouched.
 */

import { conflict, type CatalogError } from "@/catalog/errors";

const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  products_slug_uidx: "Product slug already exists",
  categories_slug_uidx: "Category slug already exists",
  collections_slug_uidx: "Collection slug already exists",
  product_variants_sku_uidx: "Variant SKU already exists",
  variant_prices_variant_currency_uidx: "Variant already has a price for this currency",
  product_options_product_name_uidx: "Product option name already exists on this product",
  product_option_values_option_value_uidx: "Option value already exists on this option",
  product_categories_product_category_uidx: "Product is already assigned to this category",
  collection_products_collection_product_uidx: "Product is already in this collection",
};

const CHECK_CONSTRAINT_MESSAGES: Record<string, string> = {
  inventory_balances_on_hand_nonneg_chk: "Cannot reduce on-hand inventory below zero",
  inventory_balances_reserved_nonneg_chk: "Cannot release more reserved inventory than is held",
  inventory_balances_reserved_lte_on_hand_chk:
    "Cannot reserve more inventory than is available on-hand",
};

type PgLikeError = {
  code?: string;
  constraint_name?: string;
  constraint?: string;
  message?: string;
  cause?: unknown;
};

function asPgLikeError(error: unknown): PgLikeError | null {
  if (error === null || typeof error !== "object") {
    return null;
  }
  return error as PgLikeError;
}

/**
 * Walk DrizzleQueryError.cause (and nested causes) to find the Postgres error.
 */
function collectErrorChain(error: unknown): PgLikeError[] {
  const chain: PgLikeError[] = [];
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const pgError = asPgLikeError(current);
    if (pgError) {
      chain.push(pgError);
      current = pgError.cause;
      continue;
    }
    break;
  }
  return chain;
}

function constraintNameFromChain(
  error: unknown,
  code: string,
  knownNames: string[],
): string | null {
  for (const pgError of collectErrorChain(error)) {
    if (pgError.code !== code) {
      continue;
    }
    if (typeof pgError.constraint_name === "string" && pgError.constraint_name.length > 0) {
      return pgError.constraint_name;
    }
    if (typeof pgError.constraint === "string" && pgError.constraint.length > 0) {
      return pgError.constraint;
    }
    if (typeof pgError.message === "string") {
      for (const name of knownNames) {
        if (pgError.message.includes(name)) {
          return name;
        }
      }
    }
  }
  return null;
}

export function uniqueConstraintName(error: unknown): string | null {
  return constraintNameFromChain(error, "23505", Object.keys(UNIQUE_CONSTRAINT_MESSAGES));
}

export function checkConstraintName(error: unknown): string | null {
  return constraintNameFromChain(error, "23514", Object.keys(CHECK_CONSTRAINT_MESSAGES));
}

/**
 * Translate a known unique violation into CatalogError CONFLICT.
 * Returns null when the error is not a mapped uniqueness conflict.
 */
export function catalogConflictFromUniqueViolation(error: unknown): CatalogError | null {
  const name = uniqueConstraintName(error);
  if (name === null) {
    return null;
  }
  const message = UNIQUE_CONSTRAINT_MESSAGES[name] ?? "Catalog uniqueness conflict";
  return conflict(message, [{ message, code: name }]);
}

/**
 * Translate a known inventory CHECK violation (23514) into CatalogError CONFLICT.
 */
export function catalogConflictFromCheckViolation(error: unknown): CatalogError | null {
  const name = checkConstraintName(error);
  if (name === null) {
    return null;
  }
  const message = CHECK_CONSTRAINT_MESSAGES[name] ?? "Inventory constraint conflict";
  return conflict(message, [{ message, code: name }]);
}

function catalogConflictFromKnownViolation(error: unknown): CatalogError | null {
  return catalogConflictFromUniqueViolation(error) ?? catalogConflictFromCheckViolation(error);
}

/**
 * Run an operation and map known unique/check violations to CONFLICT.
 * All other errors propagate unchanged.
 */
export async function withUniqueConflictMapping<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const mapped = catalogConflictFromKnownViolation(error);
    if (mapped) {
      throw mapped;
    }
    throw error;
  }
}
