import { NextRequest, NextResponse } from "next/server";

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

/**
 * Handle GET requests to fetch strategy templates grouped by category
 * This proxies the request to the backend API
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    console.log("[API Proxy] Forwarding strategy templates categories request to backend");

    // Forward the request to the backend API
    const response = await fetch(`${BACKEND_URL}/api/v1/strategy-templates/categories`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    // Get the response from the backend
    const data = await response.json();

    // Return the backend response
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("[API Proxy] Error forwarding categories request:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error fetching strategy template categories",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
