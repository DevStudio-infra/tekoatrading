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
 * POST handler for AI-enhanced bot evaluation
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({ success: false, message: "Bot ID is required" }, { status: 400 });
    }

    // Get request body
    const body = await request.json();
    const { chartImageBase64, symbol, timeframe } = body;

    if (!chartImageBase64 || !symbol || !timeframe) {
      return NextResponse.json(
        {
          success: false,
          message: "Chart image, symbol, and timeframe are required",
        },
        { status: 400 }
      );
    }

    console.log(`[AI Evaluate API] Processing AI evaluation for bot ${id}`);

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
    const response = await fetch(`${BACKEND_URL}/api/v1/bots/${id}/ai-evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken,
      },
      body: JSON.stringify({
        chartImageBase64,
        symbol,
        timeframe,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[AI Evaluate API] Error response:", data);
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Failed to run AI evaluation",
        },
        { status: response.status }
      );
    }

    console.log(`[AI Evaluate API] AI evaluation completed for bot ${id}`);

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: unknown) {
    console.error("Error in AI evaluation endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
