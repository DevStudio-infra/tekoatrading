import { NextRequest, NextResponse } from "next/server";
import { handleApiAuth } from "@/lib/api-auth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export async function GET(request: NextRequest) {
  try {
    const { userId, authHeader, isAuthenticated } = await handleApiAuth(request);

    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Dashboard API] Fetching dashboard data for user ${userId}`);

    const response = await fetch(`${BACKEND_URL}/api/v1/dashboard`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || `Bearer ${userId}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[Dashboard API] Error response:", errorData);
      return NextResponse.json(
        {
          error: errorData.message || "Failed to fetch dashboard data",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[Dashboard API] Dashboard data retrieved successfully for user ${userId}`);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in dashboard endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
