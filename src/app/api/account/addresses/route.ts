import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireCustomer } from "@/auth/authorization";
import { CustomerService } from "@/customer/service";
import { DrizzleCustomerRepository } from "@/customer/repository";
import { getRuntimeDb } from "@/db/runtime";
import { type CustomerDb } from "@/customer/db";
import { z } from "zod";

function getCustomerService() {
  const db = getRuntimeDb();
  return new CustomerService(new DrizzleCustomerRepository(db as unknown as CustomerDb));
}

const addressSchema = z.object({
  type: z.enum(["billing", "shipping"]),
  name: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  isDefault: z.boolean().default(false),
});

export async function GET() {
  try {
    const principal = await requireCustomer(await headers());
    const service = getCustomerService();
    const addresses = await service.listAddresses(principal.userId);
    return NextResponse.json(addresses);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const principal = await requireCustomer(await headers());
    const body = await request.json();
    const parsed = addressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const service = getCustomerService();
    const address = await service.addAddress(principal.userId, parsed.data);
    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
