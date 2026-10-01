import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "@/auth/authorization";
import { authorizationErrorResponse } from "@/auth/http";
import { ReviewService } from "@/reviews/service";
import { z } from "zod";

const PatchReviewSchema = z.object({
  status: z.enum(["pending", "published", "rejected"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Wait, wait, is requireAdmin the right authorization function?
    await requireAdmin(await headers());

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = PatchReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const p = await params;
    const review = await ReviewService.moderateReview(p.id, parsed.data.status);
    
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, review });
  } catch (error: unknown) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
