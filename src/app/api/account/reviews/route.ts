import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireCustomer } from "@/auth/authorization";
import { authorizationErrorResponse } from "@/auth/http";
import { ReviewService } from "@/reviews/service";
import { CreateReviewSchema } from "@/reviews/schema";

export async function GET() {
  try {
    const principal = await requireCustomer(await headers());
    const reviews = await ReviewService.getCustomerReviews(principal.userId);
    return NextResponse.json(reviews);
  } catch (error: unknown) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const principal = await requireCustomer(await headers());

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = CreateReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    try {
      const review = await ReviewService.submitReview(principal.userId, parsed.data);
      return NextResponse.json({ success: true, review });
    } catch (e: unknown) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 400 });
    }
  } catch (error: unknown) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
