import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCustomer } from "@/auth/authorization";
import { authorizationErrorResponse } from "@/auth/http";
import { type CustomerDb } from "@/customer/db";
import { isCustomerError } from "@/customer/errors";
import { DrizzleCustomerRepository } from "@/customer/repository";
import { CustomerService } from "@/customer/service";
import { getRuntimeDb } from "@/db/runtime";

const addressUpdateSchema = z
  .object({
    type: z.enum(["billing", "shipping"]).optional(),
    name: z.string().min(1).optional(),
    street: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    postalCode: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

function getCustomerService() {
  const db = getRuntimeDb();
  return new CustomerService(new DrizzleCustomerRepository(db as unknown as CustomerDb));
}

function customerErrorResponse(error: unknown) {
  const authResponse = authorizationErrorResponse(error);
  if (authResponse) return authResponse;
  if (isCustomerError(error)) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "NOT_FOUND" ? 404 : 409 },
    );
  }
  console.error("Customer address error:", error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ addressId: string }> },
) {
  try {
    const principal = await requireCustomer(await headers());
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = addressUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { addressId } = await params;
    const address = await getCustomerService().updateAddress(
      principal.userId,
      addressId,
      parsed.data,
    );
    return NextResponse.json(address);
  } catch (error) {
    return customerErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ addressId: string }> },
) {
  try {
    const principal = await requireCustomer(await headers());
    const { addressId } = await params;
    await getCustomerService().deleteAddress(principal.userId, addressId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return customerErrorResponse(error);
  }
}
