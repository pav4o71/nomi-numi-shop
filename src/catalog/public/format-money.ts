/**
 * Presentational money formatting for public catalog surfaces.
 * Never authoritative for commerce — display only.
 */

import type { PublicMoney } from "@/catalog/public/types";
import type { PriceDisplayMode } from "@/catalog/public/types";

export function formatPublicMoney(money: PublicMoney): string {
  const amount = money.amountMinor / 100;
  if (money.currency === "PHP") {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatListingPrice(money: PublicMoney, displayMode: PriceDisplayMode): string {
  const formatted = formatPublicMoney(money);
  return displayMode === "from" ? `From ${formatted}` : formatted;
}
