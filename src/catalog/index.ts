/**
 * Phase 3B catalog domain public surface.
 *
 * Server-side repository/service foundations for products, variants/options,
 * categories, collections, and prices. No HTTP/UI surfaces in this phase.
 */

export {
  CatalogError,
  conflict,
  invalidInput,
  isCatalogError,
  notFound,
  type CatalogErrorCode,
  type CatalogErrorIssue,
} from "@/catalog/errors";
export type { CatalogDb, CatalogExecutor, CatalogTx } from "@/catalog/db";
export {
  CATALOG_CURRENCIES,
  PG_INTEGER_MAX,
  isCatalogCurrency,
  parseCatalogMoney,
  type CatalogCurrency,
  type CatalogMoney,
  type CatalogMoneyInput,
} from "@/catalog/money";
export { optionCombinationKey, type OptionSelection } from "@/catalog/option-combination";
export { catalogConflictFromUniqueViolation, uniqueConstraintName } from "@/catalog/pg-errors";
export { DrizzleCatalogRepository } from "@/catalog/repository";
export { CatalogService } from "@/catalog/service";
export { normalizeCatalogSlug } from "@/catalog/slug";
export { parseCatalogInput, productStatusSchema, type ProductStatus } from "@/catalog/validators";
