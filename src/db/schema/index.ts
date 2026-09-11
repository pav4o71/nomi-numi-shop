/**
 * Canonical Drizzle schema export boundary for Nomi Numi Shop.
 *
 * Phase 2A adds Better Auth core tables only.
 * Catalog/commerce domain tables remain intentionally absent.
 */

export {
  account,
  accountRelations,
  session,
  sessionRelations,
  user,
  userRelations,
  verification,
} from "./auth";
