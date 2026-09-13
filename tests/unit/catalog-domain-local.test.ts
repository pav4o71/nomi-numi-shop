/**
 * Path-locked / TEST-DB Phase 3B catalog repository + service coverage.
 * Excluded from portable `pnpm test:ci` (see package.json).
 */
import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  CatalogError,
  CatalogService,
  DrizzleCatalogRepository,
  catalogConflictFromUniqueViolation,
} from "@/catalog";
import * as schema from "@/db/schema";
import {
  EXPECTED_ROOT,
  PROTECTED_HOST_PORT,
  loadValidatedCredentials,
} from "../../scripts/drizzle-credentials.mjs";

const credentials = loadValidatedCredentials("test");

function sku(label: string) {
  return `SKU-${label}-${randomUUID()}`;
}

describe("Phase 3B catalog domain against TEST database", () => {
  let sql: ReturnType<typeof postgres>;
  let service: CatalogService;
  let repo: DrizzleCatalogRepository;

  beforeAll(async () => {
    expect(EXPECTED_ROOT).toBe("/home/pav4o71/Projects/nomi-numi-shop");
    expect(credentials.database).toBe("nomi_numi_shop_test");
    expect(credentials.port).toBe(55433);
    expect(String(credentials.port)).not.toBe(PROTECTED_HOST_PORT);

    sql = postgres({
      host: credentials.host,
      port: credentials.port,
      database: credentials.database,
      username: credentials.user,
      password: credentials.password,
      max: 5,
      idle_timeout: 5,
      connect_timeout: 10,
      prepare: false,
    });

    const identity = await sql`
      SELECT current_database() AS database_name, current_user AS database_user
    `;
    expect(identity[0]?.database_name).toBe("nomi_numi_shop_test");
    expect(identity[0]?.database_user).toBe("nomi_numi_test");

    const db = drizzle(sql, { schema });
    repo = new DrizzleCatalogRepository(db);
    service = new CatalogService(repo);
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  beforeEach(async () => {
    await sql`DELETE FROM product_media`;
    await sql`DELETE FROM variant_prices`;
    await sql`DELETE FROM product_variant_option_values`;
    await sql`DELETE FROM product_option_values`;
    await sql`DELETE FROM product_options`;
    await sql`DELETE FROM product_variants`;
    await sql`DELETE FROM product_categories`;
    await sql`DELETE FROM collection_products`;
    await sql`DELETE FROM products`;
    await sql`DELETE FROM categories`;
    await sql`DELETE FROM collections`;
    await sql`DELETE FROM store_settings`;
  });

  it("persists products, categories, and collections as distinct concepts", async () => {
    const product = await service.createProduct({
      slug: "Shared Name",
      title: "Plush",
    });
    const category = await service.createCategory({
      slug: "Shared Name",
      name: "Plushies",
    });
    const collection = await service.createCollection({
      slug: "Shared Name",
      name: "Seasonal",
    });

    expect(product.slug).toBe("shared-name");
    expect(category.slug).toBe("shared-name");
    expect(collection.slug).toBe("shared-name");
    expect(product.id).not.toBe(category.id);
    expect(category.id).not.toBe(collection.id);

    await expect(service.getProductBySlug("shared-name")).resolves.toMatchObject({
      id: product.id,
    });
    await expect(service.getCategoryBySlug("shared-name")).resolves.toMatchObject({
      id: category.id,
    });
    await expect(service.getCollectionBySlug("shared-name")).resolves.toMatchObject({
      id: collection.id,
    });
  });

  it("maps duplicate slug conflicts and preserves not-found errors", async () => {
    await service.createProduct({ slug: "dup-product", title: "One" });
    await expect(
      service.createProduct({ slug: "dup-product", title: "Two" }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
    });

    await expect(service.getProductById("missing")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.getCategoryById("missing")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.getCollectionById("missing")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("applies product status values without an invented transition matrix", async () => {
    const product = await service.createProduct({ slug: "lifecycle", title: "Lifecycle" });
    expect(product.status).toBe("draft");

    const published = await service.changeProductStatus(product.id, { status: "published" });
    expect(published.status).toBe("published");
    expect(published.publishedAt).toBeInstanceOf(Date);
    expect(published.archivedAt).toBeNull();

    const draftAgain = await service.changeProductStatus(product.id, { status: "draft" });
    expect(draftAgain.status).toBe("draft");
    expect(draftAgain.archivedAt).toBeNull();

    // Direct published -> archived (missing coverage from initial 3B review).
    await service.changeProductStatus(product.id, { status: "published" });
    const archivedFromPublished = await service.changeProductStatus(product.id, {
      status: "archived",
    });
    expect(archivedFromPublished.status).toBe("archived");
    expect(archivedFromPublished.archivedAt).toBeInstanceOf(Date);

    // archived -> published is allowed; Phase 2D did not lock a restrictive matrix.
    const republished = await service.changeProductStatus(product.id, { status: "published" });
    expect(republished.status).toBe("published");
    expect(republished.archivedAt).toBeNull();
    expect(republished.publishedAt).toBeInstanceOf(Date);

    const archived = await service.changeProductStatus(product.id, { status: "archived" });
    expect(archived.status).toBe("archived");

    const reopened = await service.changeProductStatus(product.id, { status: "draft" });
    expect(reopened.status).toBe("draft");
    expect(reopened.archivedAt).toBeNull();
  });

  it("refuses defineProductOptions once variants exist and leaves definitions unchanged", async () => {
    const product = await service.createProduct({ slug: "options-safe", title: "Options" });
    const initial = await service.defineProductOptions(product.id, {
      options: [{ name: "Size", values: [{ value: "M" }, { value: "L" }] }],
    });
    expect(initial).toHaveLength(1);
    expect(initial[0].values).toHaveLength(2);

    const created = await service.createVariant(product.id, {
      sku: sku("opts"),
      optionSelections: [{ optionId: initial[0].id, optionValueId: initial[0].values[0].id }],
    });

    await expect(
      service.defineProductOptions(product.id, {
        options: [{ name: "Color", values: [{ value: "Red" }] }],
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const optionsAfter = await repo.transaction(async (tx) =>
      repo.listProductOptionsWithValues(tx, product.id),
    );
    expect(optionsAfter).toHaveLength(1);
    expect(optionsAfter[0].id).toBe(initial[0].id);
    expect(optionsAfter[0].name).toBe("Size");
    expect(optionsAfter[0].values.map((value) => value.value).sort()).toEqual(["L", "M"]);

    const selections = await repo.transaction(async (tx) =>
      repo.listVariantSelections(tx, created.variant.id),
    );
    expect(selections).toEqual([
      { optionId: initial[0].id, optionValueId: initial[0].values[0].id },
    ]);
  });

  it("serializes concurrent defineProductOptions against variant creation", async () => {
    const product = await service.createProduct({ slug: "options-race", title: "Race Options" });
    await service.defineProductOptions(product.id, {
      options: [{ name: "Size", values: [{ value: "M" }] }],
    });
    const options = await repo.transaction(async (tx) =>
      repo.listProductOptionsWithValues(tx, product.id),
    );

    const results = await Promise.allSettled([
      service.createVariant(product.id, {
        sku: sku("race-opt"),
        optionSelections: [{ optionId: options[0].id, optionValueId: options[0].values[0].id }],
      }),
      service.defineProductOptions(product.id, {
        options: [{ name: "Color", values: [{ value: "Blue" }] }],
      }),
    ]);

    expect(results).toHaveLength(2);

    const variantCount = await repo.transaction(async (tx) =>
      repo.countVariantsForProduct(tx, product.id),
    );
    const optionsAfter = await repo.transaction(async (tx) =>
      repo.listProductOptionsWithValues(tx, product.id),
    );

    // Product-row locking serializes the two mutations. A successful option
    // redefine can only leave the product with zero variants.
    if (variantCount > 0) {
      expect(optionsAfter.map((option) => option.name)).toEqual(["Size"]);
      expect(
        results.some(
          (result) =>
            result.status === "rejected" &&
            (result.reason as { code?: string }).code === "CONFLICT",
        ),
      ).toBe(true);
    } else {
      expect(optionsAfter.map((option) => option.name)).toEqual(["Color"]);
    }

    for (const variantRow of await sql`
      SELECT id FROM product_variants WHERE product_id = ${product.id}
    `) {
      const selections = await repo.transaction(async (tx) =>
        repo.listVariantSelections(tx, String(variantRow.id)),
      );
      expect(selections).toHaveLength(optionsAfter.length);
    }
  });
  it("maps duplicate SKU to CONFLICT and does not mislabel unrelated DB errors", async () => {
    const productA = await service.createProduct({ slug: "sku-product-a", title: "SKU A" });
    const productB = await service.createProduct({ slug: "sku-product-b", title: "SKU B" });
    const sharedSku = sku("shared");
    await service.createVariant(productA.id, { sku: sharedSku });

    // Store-wide SKU uniqueness across products (same empty combination is
    // product-scoped, so a second product is required to exercise SKU conflict).
    await expect(service.createVariant(productB.id, { sku: sharedSku })).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/SKU/i),
    });

    const unrelated = { code: "57014", message: "canceling statement due to statement timeout" };
    expect(catalogConflictFromUniqueViolation(unrelated)).toBeNull();
    await expect(
      Promise.reject(Object.assign(new Error("statement timeout"), unrelated)),
    ).rejects.not.toBeInstanceOf(CatalogError);
  });

  it("rejects duplicate ACTIVE option combinations regardless of selection order", async () => {
    const product = await service.createProduct({ slug: "combo-product", title: "Combo" });
    const options = await service.defineProductOptions(product.id, {
      options: [
        {
          name: "Size",
          values: [{ value: "M" }, { value: "L" }],
        },
        {
          name: "Color",
          values: [{ value: "Red" }, { value: "Blue" }],
        },
      ],
    });

    const size = options.find((option) => option.name === "Size")!;
    const color = options.find((option) => option.name === "Color")!;
    const sizeM = size.values.find((value) => value.value === "M")!;
    const sizeL = size.values.find((value) => value.value === "L")!;
    const colorRed = color.values.find((value) => value.value === "Red")!;
    const colorBlue = color.values.find((value) => value.value === "Blue")!;

    await service.createVariant(product.id, {
      sku: sku("m-red"),
      optionSelections: [
        { optionId: size.id, optionValueId: sizeM.id },
        { optionId: color.id, optionValueId: colorRed.id },
      ],
    });

    await expect(
      service.createVariant(product.id, {
        sku: sku("m-red-reorder"),
        optionSelections: [
          { optionId: color.id, optionValueId: colorRed.id },
          { optionId: size.id, optionValueId: sizeM.id },
        ],
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await expect(
      service.createVariant(product.id, {
        sku: sku("m-blue"),
        optionSelections: [
          { optionId: size.id, optionValueId: sizeM.id },
          { optionId: color.id, optionValueId: colorBlue.id },
        ],
      }),
    ).resolves.toBeTruthy();

    await expect(
      service.createVariant(product.id, {
        sku: sku("l-red"),
        optionSelections: [
          { optionId: size.id, optionValueId: sizeL.id },
          { optionId: color.id, optionValueId: colorRed.id },
        ],
      }),
    ).resolves.toBeTruthy();
  });

  it("allows the same option combination on different products", async () => {
    const productA = await service.createProduct({ slug: "combo-a", title: "A" });
    const productB = await service.createProduct({ slug: "combo-b", title: "B" });

    const optionsA = await service.defineProductOptions(productA.id, {
      options: [{ name: "Size", values: [{ value: "M" }] }],
    });
    const optionsB = await service.defineProductOptions(productB.id, {
      options: [{ name: "Size", values: [{ value: "M" }] }],
    });

    await service.createVariant(productA.id, {
      sku: sku("a"),
      optionSelections: [{ optionId: optionsA[0].id, optionValueId: optionsA[0].values[0].id }],
    });
    await expect(
      service.createVariant(productB.id, {
        sku: sku("b"),
        optionSelections: [{ optionId: optionsB[0].id, optionValueId: optionsB[0].values[0].id }],
      }),
    ).resolves.toBeTruthy();
  });

  it("enforces option ownership, completeness, and inactive-variant exemption", async () => {
    const product = await service.createProduct({ slug: "ownership", title: "Ownership" });
    const options = await service.defineProductOptions(product.id, {
      options: [
        { name: "Size", values: [{ value: "M" }, { value: "L" }] },
        { name: "Color", values: [{ value: "Red" }] },
      ],
    });
    const size = options[0];
    const color = options[1];

    await expect(
      service.createVariant(product.id, {
        sku: sku("incomplete"),
        optionSelections: [{ optionId: size.id, optionValueId: size.values[0].id }],
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });

    await expect(
      service.createVariant(product.id, {
        sku: sku("wrong-value"),
        optionSelections: [
          { optionId: size.id, optionValueId: color.values[0].id },
          { optionId: color.id, optionValueId: color.values[0].id },
        ],
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });

    await service.createVariant(product.id, {
      sku: sku("active"),
      optionSelections: [
        { optionId: size.id, optionValueId: size.values[0].id },
        { optionId: color.id, optionValueId: color.values[0].id },
      ],
    });

    const inactive = await service.createVariant(product.id, {
      sku: sku("inactive"),
      isActive: false,
      optionSelections: [
        { optionId: size.id, optionValueId: size.values[0].id },
        { optionId: color.id, optionValueId: color.values[0].id },
      ],
    });
    expect(inactive.variant.isActive).toBe(false);

    const noOptions = await service.createProduct({ slug: "default-variant", title: "Default" });
    await expect(
      service.createVariant(noOptions.id, { sku: sku("default") }),
    ).resolves.toBeTruthy();
    await expect(
      service.createVariant(noOptions.id, {
        sku: sku("default-2"),
        optionSelections: [{ optionId: size.id, optionValueId: size.values[0].id }],
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("serializes concurrent active combination creates so only one succeeds", async () => {
    const product = await service.createProduct({ slug: "race-combo", title: "Race" });
    const options = await service.defineProductOptions(product.id, {
      options: [{ name: "Size", values: [{ value: "M" }] }],
    });
    const selection = [{ optionId: options[0].id, optionValueId: options[0].values[0].id }];

    const results = await Promise.allSettled([
      service.createVariant(product.id, { sku: sku("race-1"), optionSelections: selection }),
      service.createVariant(product.id, { sku: sku("race-2"), optionSelections: selection }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({ code: "CONFLICT" });
  });

  it("keeps a single primary category under concurrent updates", async () => {
    const product = await service.createProduct({ slug: "primary-cat", title: "Primary" });
    const categoryA = await service.createCategory({ slug: "cat-a", name: "A" });
    const categoryB = await service.createCategory({ slug: "cat-b", name: "B" });

    await service.replaceProductCategories(product.id, {
      categories: [
        { categoryId: categoryA.id, isPrimary: true },
        { categoryId: categoryB.id, isPrimary: false },
      ],
    });

    await Promise.all([
      service.setPrimaryCategory(product.id, { categoryId: categoryA.id }),
      service.setPrimaryCategory(product.id, { categoryId: categoryB.id }),
    ]);

    const rows = await sql`
      SELECT category_id, is_primary
      FROM product_categories
      WHERE product_id = ${product.id}
    `;
    const primaries = rows.filter((row) => row.is_primary === true);
    expect(primaries).toHaveLength(1);
  });

  it("preserves validation vs conflict vs infrastructure error boundaries", async () => {
    await expect(service.createProduct({ slug: "", title: "Bad" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });

    const product = await service.createProduct({ slug: "errors", title: "Errors" });
    await service.createVariant(product.id, { sku: sku("once") });
    await expect(service.createVariant(product.id, { sku: sku("once") })).rejects.toMatchObject({
      // SKUs differ; empty combination on no-option product conflicts instead
      code: "CONFLICT",
    });

    const boom = Object.assign(new Error("connection reset"), { code: "ECONNRESET" });
    expect(catalogConflictFromUniqueViolation(boom)).toBeNull();
    expect(boom).not.toBeInstanceOf(CatalogError);
  });

  it("persists validated prices and rejects invalid compare-at at the service boundary", async () => {
    const product = await service.createProduct({ slug: "priced", title: "Priced" });
    const created = await service.createVariant(product.id, {
      sku: sku("priced"),
      prices: [
        { currency: "PHP", amountMinor: 179900, compareAtAmountMinor: 199900 },
        { currency: "USD", amountMinor: 3499 },
      ],
    });
    expect(created.prices).toHaveLength(2);

    await expect(
      service.setVariantPrices(created.variant.id, {
        prices: [{ currency: "USD", amountMinor: 100, compareAtAmountMinor: 50 }],
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});
