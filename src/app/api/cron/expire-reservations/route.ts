import { NextResponse } from "next/server";
import { getRuntimeDb } from "@/db/runtime";
import { CheckoutService } from "@/checkout/service";
import { DrizzleCheckoutRepository } from "@/checkout/repository";
import { type CheckoutDb } from "@/checkout/db";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { CartService } from "@/cart/service";
import { DrizzleCartRepository } from "@/cart/repository";

export async function GET(request: Request) {
  // Optional: check for a cron secret if configured in production
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const db = getRuntimeDb();
    const catalog = new CatalogService(new DrizzleCatalogRepository(db));
    const cart = new CartService(new DrizzleCartRepository(db as unknown as CheckoutDb), catalog);
    const checkout = new CheckoutService(
      new DrizzleCheckoutRepository(db as unknown as CheckoutDb),
      cart,
      catalog,
    );

    const expiredCount = await checkout.expireReservations();
    
    return NextResponse.json({ success: true, expiredCount });
  } catch (error) {
    console.error("Failed to expire reservations:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
