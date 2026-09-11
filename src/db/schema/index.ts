/**
 * Canonical Drizzle schema export boundary for Nomi Numi Shop.
 *
 * Phase 2A/2B Better Auth tables only (including server-owned role).
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
