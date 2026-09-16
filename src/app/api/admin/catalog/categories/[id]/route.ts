import { requireAdmin } from "@/auth/authorization";
import { adminCatalogErrorResponse, parseJsonBody } from "@/catalog/admin";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";

function getCatalogService() {
  return new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));
}

/**
 * GET /api/admin/catalog/categories/[id] — get a single category by ID.
 * PATCH /api/admin/catalog/categories/[id] — update a category.
 *
 * Exact `admin` role required. Unauthenticated → 401; wrong role → 403.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request.headers);
    const { id } = await params;
    const service = getCatalogService();
    const category = await service.getCategoryById(id);
    return Response.json({ category });
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request.headers);
    const { id } = await params;
    const body = await parseJsonBody(request);
    const service = getCatalogService();
    const category = await service.updateCategory(id, body);
    return Response.json({ category });
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}
