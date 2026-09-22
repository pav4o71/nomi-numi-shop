import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { requireAdmin } from "@/auth/authorization";
import { adminCatalogErrorResponse, parseJsonBody } from "@/catalog/admin";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";
import type { ProductStatus } from "@/catalog/validators";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(await headers());
    const { id } = await params;

    const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));
    const product = await service.getProductById(id);

    return NextResponse.json(product);
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

    const finalProduct = await service.updateProduct(id, body);

    return NextResponse.json(finalProduct);
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}
