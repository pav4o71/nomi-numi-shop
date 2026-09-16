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
    const collections = await service.listProductCollections(id);

    return NextResponse.json(collections);
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(await headers());
    const { id } = await params;

    const body = await parseJsonBody(request);
    const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));

    await service.replaceProductCollections(id, body);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}
