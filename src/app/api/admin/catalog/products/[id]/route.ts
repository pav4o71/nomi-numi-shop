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

    // Update base product details
    const product = await service.updateProduct(id, {
      title: body?.title,
      slug: body?.slug,
      description: body?.description,
      position: body?.position,
      seoTitle: body?.seoTitle,
      seoDescription: body?.seoDescription,
    });

    // Update status separately if provided, because updateProduct doesn't accept status.
    // The CatalogService has a separate changeProductStatus method.
    let finalProduct = product;
    if (body?.status && body.status !== product.status) {
      finalProduct = await service.changeProductStatus(id, { status: body.status });
    }

    return NextResponse.json(finalProduct);
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}
