import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { requireAdmin } from "@/auth/authorization";
import { adminCatalogErrorResponse, parseJsonBody } from "@/catalog/admin";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";

export async function GET() {
  try {
    await requireAdmin(await headers());

    const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));
    const collections = await service.listAllCollections();

    return NextResponse.json(collections);
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(await headers());

    const body = (await parseJsonBody(request)) as {
      name?: string;
      slug?: string;
      description?: string;
      position?: number;
      published?: boolean;
      publishedFrom?: string;
      publishedUntil?: string;
    };
    const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));

    const collection = await service.createCollection({
      name: body?.name,
      slug: body?.slug,
      description: body?.description,
      position: body?.position,
      published: body?.published,
      publishedFrom: body?.publishedFrom ? new Date(body.publishedFrom) : null,
      publishedUntil: body?.publishedUntil ? new Date(body.publishedUntil) : null,
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}
