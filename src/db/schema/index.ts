/**
 * Canonical Drizzle schema export boundary for Nomi Numi Shop.
 *
 * Phase 2A/2B Better Auth tables remain isolated in ./auth.ts.
 * Phase 3A catalog tables live in ./catalog.ts.
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

export {
  categories,
  categoriesRelations,
  collectionProducts,
  collectionProductsRelations,
  collections,
  collectionsRelations,
  productCategories,
  productCategoriesRelations,
  productMedia,
  productMediaRelations,
  productOptionValues,
  productOptionValuesRelations,
  productOptions,
  productOptionsRelations,
  productVariantOptionValues,
  productVariantOptionValuesRelations,
  productVariants,
  productVariantsRelations,
  products,
  productsRelations,
  storeSettings,
  storeSettingsRelations,
  variantPrices,
  variantPricesRelations,
  inventoryBalances,
  inventoryBalancesRelations,
  inventoryMovements,
  inventoryMovementsRelations,
} from "./catalog";

export {
  customerAddresses,
  customerAddressesRelations,
  wishlists,
  wishlistsRelations,
} from "./customer";

export {
  carts,
  cartsRelations,
  cartItems,
  cartItemsRelations,
  orders,
  ordersRelations,
  guestOrderAccessCapabilities,
  guestOrderAccessCapabilitiesRelations,
  orderItems,
  orderItemsRelations,
  inventoryReservations,
  inventoryReservationsRelations,
  paymentEvents,
  paymentEventsRelations,
} from "./checkout";

export type { OrderItemOptionSnapshot } from "./checkout";
