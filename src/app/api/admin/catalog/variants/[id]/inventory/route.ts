import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { requireAdmin } from "@/auth/authorization";
import { adminCatalogErrorResponse, parseJsonBody } from "@/catalog/admin";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(await headers());
    const { id } = await params;

    const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));

    const [balance, movements] = await Promise.all([
      service.getVariantInventoryBalance(id),
      service.getVariantInventoryMovements(id),
    ]);
    return NextResponse.json({
      balance: balance ?? { variantId: id, onHand: 0, reserved: 0 },
      movements,
    });
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin(await headers());
    const { id } = await params;

    const body = await parseJsonBody(request);
    const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));

    // session.userId is passed as the sourceReference for manual adjustments
    await service.adjustVariantInventory(id, body, session.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}
