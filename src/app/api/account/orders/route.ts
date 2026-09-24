import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { requireCustomer } from "@/auth/authorization";
import { authorizationErrorResponse } from "@/auth/http";
import { CartService } from "@/cart/service";
import { DrizzleCartRepository } from "@/cart/repository";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { type CheckoutDb } from "@/checkout/db";
import { toPublicOrder } from "@/checkout/public";
import { DrizzleCheckoutRepository } from "@/checkout/repository";
import { CheckoutService } from "@/checkout/service";
import { getRuntimeDb } from "@/db/runtime";

export async function GET() {
  try {
    const principal = await requireCustomer(await headers());
    const db = getRuntimeDb();
    const catalog = new CatalogService(new DrizzleCatalogRepository(db));
    const service = new CheckoutService(
      new DrizzleCheckoutRepository(db as unknown as CheckoutDb),
      new CartService(new DrizzleCartRepository(db as unknown as CheckoutDb), catalog),
      catalog,
    );
    const orders = await service.listCustomerOrders(principal.userId);
    return NextResponse.json(orders.map(toPublicOrder));
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Customer orders error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
