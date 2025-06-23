import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    // In development, allow unauthenticated requests for testing
    const effectiveUserId = userId || (process.env.NODE_ENV === "development" ? "dev-user" : null);

    if (!effectiveUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract search parameters
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "30d";

    const backendUrl = `${BACKEND_URL}/api/v1/analytics/risk-analysis?period=${period}`;

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${effectiveUserId}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Backend request failed: ${response.status}`, errorData);
      return NextResponse.json({ error: "Failed to fetch risk analysis data", details: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Risk analysis API error:", error);
    return NextResponse.json({ error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
