/**
 * Catalog money helpers — integer minor units only (docs/STORE_CATALOG.md §6).
 *
 * No FX conversion. Floating-point is never authoritative.
 */

import { invalidInput, type CatalogErrorIssue } from "@/catalog/errors";

export const CATALOG_CURRENCIES = ["PHP", "USD"] as const;
export type CatalogCurrency = (typeof CATALOG_CURRENCIES)[number];

/** PostgreSQL `integer` inclusive maximum used by variant_prices.amount_minor. */
export const PG_INTEGER_MAX = 2_147_483_647;

export type CatalogMoneyInput = {
  currency: CatalogCurrency;
  amountMinor: number;
  compareAtAmountMinor?: number | null;
};

export type CatalogMoney = {
  currency: CatalogCurrency;
  amountMinor: number;
  compareAtAmountMinor: number | null;
};

export function isCatalogCurrency(value: unknown): value is CatalogCurrency {
  return value === "PHP" || value === "USD";
}

function moneyIssues(
  pathPrefix: Array<string | number>,
  message: string,
  code: string,
): CatalogErrorIssue[] {
  return [{ path: pathPrefix, message, code }];
}

/**
 * Validate a catalog price before persistence.
 * Ensures integer minor units within PostgreSQL integer range.
 */
export function parseCatalogMoney(
  input: unknown,
  pathPrefix: Array<string | number> = [],
): CatalogMoney {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw invalidInput(
      "Price must be an object",
      moneyIssues(pathPrefix, "Price must be an object", "invalid_type"),
    );
  }

  const record = input as Record<string, unknown>;
  const { currency, amountMinor, compareAtAmountMinor } = record;

  if (!isCatalogCurrency(currency)) {
    throw invalidInput("Unsupported catalog currency", [
      ...moneyIssues(
        [...pathPrefix, "currency"],
        "Currency must be PHP or USD",
        "unsupported_currency",
      ),
    ]);
  }

  if (typeof amountMinor !== "number" || !Number.isInteger(amountMinor)) {
    throw invalidInput("amountMinor must be an integer", [
      ...moneyIssues(
        [...pathPrefix, "amountMinor"],
        "amountMinor must be an integer minor-unit value",
        "non_integer",
      ),
    ]);
  }

  if (amountMinor <= 0) {
    throw invalidInput("amountMinor must be greater than zero", [
      ...moneyIssues(
        [...pathPrefix, "amountMinor"],
        "amountMinor must be greater than zero",
        "non_positive",
      ),
    ]);
  }

  if (amountMinor > PG_INTEGER_MAX) {
    throw invalidInput("amountMinor exceeds PostgreSQL integer range", [
      ...moneyIssues(
        [...pathPrefix, "amountMinor"],
        `amountMinor must be <= ${PG_INTEGER_MAX}`,
        "pg_integer_range",
      ),
    ]);
  }

  if (compareAtAmountMinor === undefined || compareAtAmountMinor === null) {
    return { currency, amountMinor, compareAtAmountMinor: null };
  }

  if (typeof compareAtAmountMinor !== "number" || !Number.isInteger(compareAtAmountMinor)) {
    throw invalidInput("compareAtAmountMinor must be an integer when present", [
      ...moneyIssues(
        [...pathPrefix, "compareAtAmountMinor"],
        "compareAtAmountMinor must be an integer minor-unit value",
        "non_integer",
      ),
    ]);
  }

  if (compareAtAmountMinor > PG_INTEGER_MAX) {
    throw invalidInput("compareAtAmountMinor exceeds PostgreSQL integer range", [
      ...moneyIssues(
        [...pathPrefix, "compareAtAmountMinor"],
        `compareAtAmountMinor must be <= ${PG_INTEGER_MAX}`,
        "pg_integer_range",
      ),
    ]);
  }

  if (compareAtAmountMinor <= amountMinor) {
    throw invalidInput("compareAtAmountMinor must be greater than amountMinor", [
      ...moneyIssues(
        [...pathPrefix, "compareAtAmountMinor"],
        "compareAtAmountMinor must be greater than amountMinor",
        "compare_at_not_greater",
      ),
    ]);
  }

  return { currency, amountMinor, compareAtAmountMinor };
}
