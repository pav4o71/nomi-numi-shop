import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "@/auth/authorization";
import { authorizationErrorResponse } from "@/auth/http";
import { createPromotionSchema } from "@/promotions/schema";
import { PromotionService } from "@/promotions/service";

export async function GET() {
  try {
    await requireAdmin(await headers());
    const promotions = await PromotionService.getAllPromotions();
    return NextResponse.json(promotions);
  } catch (error: unknown) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("GET /api/admin/promotions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(await headers());

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createPromotionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Check if code already exists
    const existing = await PromotionService.getPromotionByCode(parsed.data.code);
    if (existing) {
      return NextResponse.json({ error: "Promotion code already exists" }, { status: 409 });
    }

    const promotion = await PromotionService.createPromotion(parsed.data);
    return NextResponse.json(promotion, { status: 201 });
  } catch (error: unknown) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("POST /api/admin/promotions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
