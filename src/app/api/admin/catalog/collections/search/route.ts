import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "@/auth/authorization";
import { adminCatalogErrorResponse } from "@/catalog/admin";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";

export async function GET(request: Request) {
  try {
    await requireAdmin(await headers());

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";

    const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));
    const collections = await service.searchCollections(q);

    return NextResponse.json(collections);
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}
