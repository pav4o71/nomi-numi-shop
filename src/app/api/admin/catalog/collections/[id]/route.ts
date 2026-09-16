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
    const collection = await service.getCollectionById(id);

    return NextResponse.json(collection);
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(await headers());
    const { id } = await params;

    const body = (await parseJsonBody(request)) as {
      name?: string;
      slug?: string;
      description?: string;
      position?: number;
      published?: boolean;
      publishedFrom?: string;
      publishedUntil?: string;
      archivedAt?: string;
    };
    const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));

    const collection = await service.updateCollection(id, {
      name: body?.name,
      slug: body?.slug,
      description: body?.description,
      position: body?.position,
      published: body?.published,
      publishedFrom:
        body?.publishedFrom === ""
          ? null
          : body?.publishedFrom
            ? new Date(body.publishedFrom)
            : undefined,
      publishedUntil:
        body?.publishedUntil === ""
          ? null
          : body?.publishedUntil
            ? new Date(body.publishedUntil)
            : undefined,
      archivedAt:
        body?.archivedAt === "" ? null : body?.archivedAt ? new Date(body.archivedAt) : undefined,
    });

    return NextResponse.json(collection);
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}
