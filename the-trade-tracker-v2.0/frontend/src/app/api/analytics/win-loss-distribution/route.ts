import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    // Get user authentication
    const { userId } = await auth();

    // In development, allow unauthenticated requests for testing
    const effectiveUserId = userId || (process.env.NODE_ENV === "development" ? "dev-user" : null);

    if (!effectiveUserId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Call backend API
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const response = await fetch(`${backendUrl}/api/v1/analytics/win-loss-distribution`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${effectiveUserId}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          message: errorData.message || "Failed to fetch win/loss distribution",
          error: errorData.error,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Analytics Win/Loss Distribution API Error:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
