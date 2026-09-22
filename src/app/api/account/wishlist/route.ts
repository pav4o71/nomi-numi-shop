import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireCustomer } from "@/auth/authorization";
import { authorizationErrorResponse } from "@/auth/http";
import { CustomerService } from "@/customer/service";
import { DrizzleCustomerRepository } from "@/customer/repository";
import { getRuntimeDb } from "@/db/runtime";
import { type CustomerDb } from "@/customer/db";
import { z } from "zod";

function getCustomerService() {
  const db = getRuntimeDb();
  return new CustomerService(new DrizzleCustomerRepository(db as unknown as CustomerDb));
}

const toggleSchema = z.object({
  variantId: z.string().min(1),
  isAdded: z.boolean(),
});

export async function GET() {
  try {
    const principal = await requireCustomer(await headers());
    const service = getCustomerService();
    const wishlist = await service.getWishlist(principal.userId);
    return NextResponse.json(wishlist);
  } catch (error: unknown) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const principal = await requireCustomer(await headers());

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = toggleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const service = getCustomerService();
    await service.toggleWishlist(principal.userId, parsed.data.variantId, parsed.data.isAdded);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
