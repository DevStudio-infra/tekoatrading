import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Development token using base64 JSON encoding that the backend will accept
const devTokenData = {
  userId: 1,
  id: 1,
  email: "dev@example.com",
};
// Include the Bearer prefix as required by the backend
const DEV_AUTH_TOKEN = `Bearer ${Buffer.from(JSON.stringify(devTokenData)).toString("base64")}`;

/**
 * GET handler for AI performance metrics
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({ success: false, message: "Bot ID is required" }, { status: 400 });
    }

    console.log(`[AI Metrics API] Fetching AI performance metrics for bot ${id}`);

    // Get auth token
    let authToken = DEV_AUTH_TOKEN;

    if (process.env.NODE_ENV === "production") {
      const { getToken } = getAuth(request);
      const token = await getToken();

      if (!token) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }

      authToken = `Bearer ${token}`;
    }

    // Forward request to backend
    const response = await fetch(`${BACKEND_URL}/api/v1/bots/${id}/ai-metrics`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[AI Metrics API] Error response:", data);
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Failed to fetch AI metrics",
        },
        { status: response.status }
      );
    }

    console.log(`[AI Metrics API] AI metrics retrieved for bot ${id}`);

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: unknown) {
    console.error("Error in AI metrics endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
