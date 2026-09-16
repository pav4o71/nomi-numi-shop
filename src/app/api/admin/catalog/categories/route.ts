import { requireAdmin } from "@/auth/authorization";
import { adminCatalogErrorResponse, parseJsonBody } from "@/catalog/admin";
import { CatalogService } from "@/catalog/service";
import { DrizzleCatalogRepository } from "@/catalog/repository";
import { getRuntimeDb } from "@/db/runtime";

function getCatalogService() {
  return new CatalogService(new DrizzleCatalogRepository(getRuntimeDb()));
}

/**
 * GET /api/admin/catalog/categories — list all categories (admin view).
 * POST /api/admin/catalog/categories — create a new category.
 *
 * Exact `admin` role required. Unauthenticated → 401; wrong role → 403.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request.headers);
    const service = getCatalogService();
    const categories = await service.listAllCategories();
    return Response.json({ categories });
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request.headers);
    const body = await parseJsonBody(request);
    const service = getCatalogService();
    const category = await service.createCategory(body);
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    return adminCatalogErrorResponse(error);
  }
}
