/**
 * Active-variant option combination identity (Phase 3B).
 *
 * Comparison is order-independent, deterministic, and scoped to one product.
 * Only ACTIVE variants participate in uniqueness (locked contract).
 */

export type OptionSelection = {
  optionId: string;
  optionValueId: string;
};

/**
 * Build a deterministic combination key from option/value identity pairs.
 * Empty selections (default variant, no options) yield an empty string.
 */
export function optionCombinationKey(selections: readonly OptionSelection[]): string {
  return [...selections]
    .map((selection) => ({
      optionId: selection.optionId,
      optionValueId: selection.optionValueId,
    }))
    .sort((left, right) => {
      if (left.optionId < right.optionId) return -1;
      if (left.optionId > right.optionId) return 1;
      if (left.optionValueId < right.optionValueId) return -1;
      if (left.optionValueId > right.optionValueId) return 1;
      return 0;
    })
    .map((selection) => `${selection.optionId}=${selection.optionValueId}`)
    .join("|");
}
