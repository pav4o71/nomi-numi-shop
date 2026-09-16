import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { requireAdmin } from "@/auth/authorization";
import { adminCatalogErrorResponse, parseJsonBody } from "@/catalog/admin";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";
import type { ProductStatus } from "@/catalog/validators";

export async function GET() {
  try {
    await requireAdmin(await headers());

    const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));
    const products = await service.listAllProducts();

    return NextResponse.json(products);
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(await headers());

    const body = (await parseJsonBody(request)) as {
      title?: string;
      slug?: string;
      description?: string;
      status?: ProductStatus;
      position?: number;
      seoTitle?: string;
      seoDescription?: string;
    };
    const service = new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));

    const product = await service.createProduct({
      title: body?.title,
      slug: body?.slug,
      description: body?.description,
      status: body?.status,
      position: body?.position,
      seoTitle: body?.seoTitle,
      seoDescription: body?.seoDescription,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}
