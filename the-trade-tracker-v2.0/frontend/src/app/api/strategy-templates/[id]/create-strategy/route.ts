import { NextRequest, NextResponse } from "next/server";

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Handle POST requests to create a strategy from a template
 * This proxies the request to the backend API
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const authHeader = request.headers.get("authorization");
    const body = await request.json();

    console.log(`[API Proxy] Forwarding create strategy from template ${id} request to backend`);

    // Forward the request to the backend API
    const response = await fetch(`${BACKEND_URL}/api/v1/strategy-templates/${id}/create-strategy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    // Get the response from the backend
    const data = await response.json();

    // Return the backend response
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("[API Proxy] Error forwarding create strategy request:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error creating strategy from template",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
