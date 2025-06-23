import { NextRequest, NextResponse } from 'next/server';

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

/**
 * Handle POST requests to create broker credentials
 * This proxies the request to the backend API
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    
    console.log('[API Proxy] Forwarding broker credential creation request to backend');
    
    // Forward the request to the backend API
    const response = await fetch(`${BACKEND_URL}/api/v1/broker-credentials`, {
      method: 'POST',
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
        message: 'Error processing request',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests to fetch broker credentials
 * This proxies the request to the backend API
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    console.log('[API Proxy] Forwarding GET request to backend');
    
    // Forward the request to the backend API
    const response = await fetch(`${BACKEND_URL}/api/v1/broker-credentials`, {
      method: 'GET',
      headers: {
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
        message: 'Failed to fetch broker credentials',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
