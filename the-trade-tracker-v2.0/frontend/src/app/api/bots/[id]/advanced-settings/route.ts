import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Get the backend URL
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

    // Forward the request to the backend
    const response = await fetch(`${backendUrl}/api/v1/bots/${id}/advanced-settings`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Forward authorization header if present
        ...(request.headers.get("Authorization") ? { Authorization: request.headers.get("Authorization")! } : {}),
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch advanced settings" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching advanced settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();

    // Get the backend URL
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

    // Forward the request to the backend
    const response = await fetch(`${backendUrl}/api/v1/bots/${id}/advanced-settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        // Forward authorization header if present
        ...(request.headers.get("Authorization") ? { Authorization: request.headers.get("Authorization")! } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to update advanced settings" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating advanced settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
