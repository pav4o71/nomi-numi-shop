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
    const variants = await service.listVariantDetailsForProduct(id);

    return NextResponse.json(variants);
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(await headers());
    const { id } = await params;

    const body = await parseJsonBody(request);
    const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));

    const result = await service.createVariant(id, body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}
