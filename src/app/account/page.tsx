import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { requireCustomerPage } from "@/auth/guards";
import { AUTH_UI_ROUTES, PROTECTED_SURFACE_ROUTES } from "@/auth/routes";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { AccountDashboard } from "@/components/account/account-dashboard";
import { getRuntimeDb } from "@/db/runtime";
import { type CustomerDb } from "@/customer/db";
import { DrizzleCustomerRepository } from "@/customer/repository";
import { CustomerService } from "@/customer/service";
import { type CheckoutDb } from "@/checkout/db";
import { DrizzleCheckoutRepository } from "@/checkout/repository";

export const metadata: Metadata = {
  title: "Account · Nomi Numi",
  description: "Your Nomi Numi customer account.",
};

/**
 * Minimal customer protected surface. Exact `customer` role required.
 * Admin is not implicitly a customer.
 */
export default async function AccountPage() {
  const headerList = await headers();
  // Exact-role gate; principal identity is not rendered in the DOM.
  const principal = await requireCustomerPage(headerList, PROTECTED_SURFACE_ROUTES.account);
  const db = getRuntimeDb();
  const customer = new CustomerService(new DrizzleCustomerRepository(db as unknown as CustomerDb));
  const checkout = new DrizzleCheckoutRepository(db as unknown as CheckoutDb);
  const [addresses, wishlist, orders] = await Promise.all([
    customer.listAddresses(principal.userId),
    customer.getWishlist(principal.userId),
    checkout.transaction((tx) => checkout.listOrdersForCustomer(tx, principal.userId)),
  ]);

  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="max-w-4xl space-y-8">
        <div className="space-y-2">
          <p className="font-display text-2xl font-semibold tracking-tight text-primary">
            Nomi Numi
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Customer account
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Manage your orders, delivery details, and saved products.
          </p>
        </div>

        <div data-testid="customer-account-surface">
          <AccountDashboard
            initialAddresses={addresses.map((address) => ({
              id: address.id,
              type: address.type,
              name: address.name,
              street: address.street,
              city: address.city,
              postalCode: address.postalCode,
              country: address.country,
              isDefault: address.isDefault,
            }))}
            initialWishlist={wishlist.map((item) => ({
              id: item.id,
              variantId: item.variantId,
            }))}
            orders={orders.map((order) => ({
              id: order.id,
              currency: order.currency,
              totalAmount: order.totalAmount,
              orderStatus: order.orderStatus,
              paymentStatus: order.paymentStatus,
              createdAt: order.createdAt.toISOString(),
            }))}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/">Back to storefront</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={AUTH_UI_ROUTES.logout}>Sign out</Link>
          </Button>
        </div>
      </Container>
    </main>
  );
}
