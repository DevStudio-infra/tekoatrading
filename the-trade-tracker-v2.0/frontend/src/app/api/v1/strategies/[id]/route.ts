import { NextRequest, NextResponse } from 'next/server';

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Handle GET requests to fetch a specific strategy
 * This proxies the request to the backend API
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const authHeader = request.headers.get('authorization');
    
    console.log(`[API Proxy] Forwarding strategy fetch request for ID ${id} to backend`);
    
    // Forward the request to the backend API
    const response = await fetch(`${BACKEND_URL}/api/v1/strategies/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {})
      }
    });
    
    // Get the response from the backend
    const data = await response.json();
    
    // Return the backend response
    return NextResponse.json(data, {
      status: response.status
    });
  } catch (error) {
    console.error('[API Proxy] Error forwarding request:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching strategy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle PUT requests to update a strategy
 * This proxies the request to the backend API
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    
    console.log(`[API Proxy] Forwarding strategy update request for ID ${id} to backend`);
    
    // Forward the request to the backend API
    const response = await fetch(`${BACKEND_URL}/api/v1/strategies/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {})
      },
      body: JSON.stringify(body)
    });
    
    // Get the response from the backend
    const data = await response.json();
    
    // Return the backend response
    return NextResponse.json(data, {
      status: response.status
    });
  } catch (error) {
    console.error('[API Proxy] Error forwarding request:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error updating strategy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE requests to delete a strategy
 * This proxies the request to the backend API
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const authHeader = request.headers.get('authorization');
    
    console.log(`[API Proxy] Forwarding strategy deletion request for ID ${id} to backend`);
    
    // Forward the request to the backend API
    const response = await fetch(`${BACKEND_URL}/api/v1/strategies/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {})
      }
    });
    
    // Get the response from the backend
    const data = await response.json();
    
    // Return the backend response
    return NextResponse.json(data, {
      status: response.status
    });
  } catch (error) {
    console.error('[API Proxy] Error forwarding request:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error deleting strategy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
