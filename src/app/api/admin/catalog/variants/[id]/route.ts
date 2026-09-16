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
    const variant = await service.getVariantDetails(id);

    return NextResponse.json(variant);
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(await headers());
    const { id } = await params;

    const body = await parseJsonBody(request);
    const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));

    const variant = await service.updateVariant(id, body);
    
    const parsedBody = body as { prices?: unknown[] };
    if (parsedBody?.prices !== undefined) {
      await service.setVariantPrices(id, { prices: parsedBody.prices });
    }

    const updatedVariant = await service.getVariantDetails(id);

    return NextResponse.json(updatedVariant);
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}
