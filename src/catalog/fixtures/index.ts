/**
 * Phase 3C DEV catalog fixtures — public domain exports.
 */

export {
  DEV_CATALOG_FIXTURE_MANIFEST,
  DEV_CATALOG_SEED_CONFIRMATION,
  DEV_FIXTURE_SKU_PREFIX,
  DEV_FIXTURE_SLUG_PREFIX,
  assertFixtureOwnershipKeys,
  type DevCatalogFixtureManifest,
  type FixtureCategory,
  type FixtureCollection,
  type FixturePrice,
  type FixtureProduct,
  type FixtureVariant,
} from "@/catalog/fixtures/manifest";
export {
  classifyDevCatalogFixtures,
  summarizePreflight,
  type FixtureClassification,
  type FixtureComponentReport,
  type FixturePreflightReport,
  type FixtureSeedContext,
} from "@/catalog/fixtures/preflight";
export { installDevCatalogFixtures, type FixtureInstallResult } from "@/catalog/fixtures/install";
export { parseDevCatalogSeedArgs } from "@/catalog/fixtures/seed-args";
