import type { Metadata } from "next";

import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = {
  title: "New Product",
};

/**
 * Phase 4C admin product creation page.
 * Authorization is enforced by the admin layout.
 */
export default function AdminNewProductPage() {
  return (
    <div data-testid="admin-product-new">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        New Product
      </h1>
      <ProductForm action="create" />
    </div>
  );
}
