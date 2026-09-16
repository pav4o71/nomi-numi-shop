import { describe, expect, it } from "vitest";

import { catalogConflictFromCheckViolation, checkConstraintName } from "@/catalog/pg-errors";

describe("inventory CHECK violation mapping (portable)", () => {
  it("maps Postgres 23514 inventory check names to CONFLICT", () => {
    const error = {
      code: "23514",
      constraint_name: "inventory_balances_reserved_lte_on_hand_chk",
      message: 'new row for relation "inventory_balances" violates check constraint',
    };

    expect(checkConstraintName(error)).toBe("inventory_balances_reserved_lte_on_hand_chk");
    const mapped = catalogConflictFromCheckViolation(error);
    expect(mapped?.code).toBe("CONFLICT");
    expect(mapped?.message).toContain("reserve more inventory");
  });

  it("maps nested drizzle cause chains for on-hand nonneg check", () => {
    const error = {
      message: "Failed query",
      cause: {
        code: "23514",
        constraint: "inventory_balances_on_hand_nonneg_chk",
      },
    };

    const mapped = catalogConflictFromCheckViolation(error);
    expect(mapped?.code).toBe("CONFLICT");
    expect(mapped?.issues[0]?.code).toBe("inventory_balances_on_hand_nonneg_chk");
  });

  it("ignores unrelated postgres errors", () => {
    expect(
      catalogConflictFromCheckViolation({ code: "23505", constraint: "products_slug_uidx" }),
    ).toBeNull();
    expect(catalogConflictFromCheckViolation(new Error("boom"))).toBeNull();
  });
});
