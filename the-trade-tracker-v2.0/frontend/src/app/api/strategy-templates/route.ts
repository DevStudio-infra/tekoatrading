import { NextRequest, NextResponse } from "next/server";

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

/**
 * Handle GET requests to fetch strategy templates
 * This proxies the request to the backend API
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);

    // Forward search parameters
    const queryString = searchParams.toString();
    const url = queryString ? `${BACKEND_URL}/api/v1/strategy-templates?${queryString}` : `${BACKEND_URL}/api/v1/strategy-templates`;

    console.log("[API Proxy] Forwarding strategy templates request to backend:", url);

    // Forward the request to the backend API
    const response = await fetch(url, {
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
    console.error("[API Proxy] Error forwarding strategy templates request:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error fetching strategy templates",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
