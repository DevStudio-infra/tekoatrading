import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Development token using base64 JSON encoding that the backend will accept
const devTokenData = {
  userId: 1,
  id: 1,
  email: "dev@example.com"
};
// Include the Bearer prefix as required by the backend
const DEV_AUTH_TOKEN = `Bearer ${Buffer.from(JSON.stringify(devTokenData)).toString('base64')}`;

/**
 * GET handler for retrieving user's strategies
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Strategies API] GET request received');
    
    // In development mode, always bypass Clerk authentication
    let userId: string | null = null;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Strategies API] Development mode: Bypassing Clerk authentication');
      // Use a hardcoded userId for development
      userId = '1';
      console.log(`[Strategies API] Using development userId: ${userId}`);
    } else {
      // In production, use Clerk authentication
      try {
        const auth = getAuth(request);
        userId = auth.userId;
      } catch (authError) {
        console.error('Authentication error:', authError);
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
      }
      
      if (!userId) {
        console.error('Unauthorized access attempt to strategies API');
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
      }
    }

    // Get params from URL
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    // In development mode, always use the development token regardless of what's in the header
    let authHeader;
    
    if (process.env.NODE_ENV === 'development') {
      // Always use the development token in development mode
      authHeader = DEV_AUTH_TOKEN;
      console.log('[Strategies API] Using development token for authentication');
    } else {
      // In production, use the authorization header from the request
      authHeader = request.headers.get('authorization');
    }
    
    // Log the authentication state
    console.log('[Strategies API] Request headers:', { auth: authHeader ? 'Present' : 'Missing' });
    console.log('[Strategies API] Auth header format:', authHeader ? authHeader.substring(0, 20) + '...' : 'None');

    // Handle single strategy retrieval if ID is provided
    let url;
    if (id) {
      url = `${BACKEND_URL}/api/v1/strategies/${id}`;
    } else {
      url = `${BACKEND_URL}/api/v1/strategies`;
    }

    console.log('[Strategies API] Forwarding request to:', url);
    
    // Forward the request to the backend API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || ''
      },
      credentials: 'include', // Include cookies if needed for auth
    });

    // Get the response from the backend
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('[Strategies API] Error parsing response:', e);
      return NextResponse.json({ success: false, message: 'Error parsing server response' }, { status: 500 });
    }

    console.log(`[Strategies API] Backend response status: ${response.status}`);
    
    if (!response.ok) {
      console.error('[Strategies API] Error response:', data);
      return NextResponse.json({ success: false, message: data?.message || 'Failed to retrieve strategies' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in strategies GET endpoint:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST handler for creating a new strategy
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Strategies API] POST request received');
    
    // In development mode, always bypass Clerk authentication
    let userId: string | null = null;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Strategies API] Development mode: Bypassing Clerk authentication');
      // Use a hardcoded userId for development
      userId = '1';
      console.log(`[Strategies API] Using development userId: ${userId}`);
    } else {
      // In production, use Clerk authentication
      try {
        const auth = getAuth(request);
        userId = auth.userId;
      } catch (authError) {
        console.error('Authentication error:', authError);
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
      }
      
      if (!userId) {
        console.error('Unauthorized access attempt to create strategy');
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
      }
    }

    // Parse the request body
    const body = await request.json();
    console.log('[Strategies API] Creating strategy with data:', body);

    // In development mode, always use the development token regardless of what's in the header
    let authHeader;
    
    if (process.env.NODE_ENV === 'development') {
      // Always use the development token in development mode
      authHeader = DEV_AUTH_TOKEN;
      console.log('[Strategies API] Using development token for authentication');
    } else {
      // In production, use the authorization header from the request
      authHeader = request.headers.get('authorization');
    }
    
    // Log the authentication state
    console.log('[Strategies API] Request headers:', { auth: authHeader ? 'Present' : 'Missing' });
    console.log('[Strategies API] Auth header format:', authHeader ? authHeader.substring(0, 20) + '...' : 'None');

    // Forward the request to the backend API
    const response = await fetch(`${BACKEND_URL}/api/v1/strategies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || ''
      },
      credentials: 'include', // Include cookies if needed for auth
      body: JSON.stringify(body),
    });

    // Get the response from the backend
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('[Strategies API] Error parsing response:', e);
      return NextResponse.json({ success: false, message: 'Error parsing server response' }, { status: 500 });
    }

    console.log('[Strategies API] Backend response:', { status: response.status, data: data ? 'Success' : 'No data' });

    if (!response.ok) {
      return NextResponse.json({ success: false, message: data?.message || 'Failed to create strategy' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in strategy creation endpoint:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
