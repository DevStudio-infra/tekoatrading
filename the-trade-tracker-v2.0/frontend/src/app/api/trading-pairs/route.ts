import { NextRequest, NextResponse } from 'next/server';
import { handleApiAuth, fixAuthorizationHeader } from '@/lib/api-auth';

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// API URL for trading pairs
const TRADING_PAIRS_URL = `${BACKEND_URL}/api/v1/trading-pairs`;

/**
 * GET handler for retrieving trading pairs
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Trading Pairs API] GET request received');
    
    // Handle authentication using our utility function
    const { userId, authHeader, isAuthenticated } = await handleApiAuth(request);
    
    if (!isAuthenticated) {
      console.log('[Trading Pairs API] Authentication failed');
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    console.log(`[Trading Pairs API] Authenticated as user ${userId}`);
    
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    
    // Ensure the authorization header is properly formatted
    const formattedAuthHeader = fixAuthorizationHeader(authHeader);
    console.log('[Trading Pairs API] Using auth header:', formattedAuthHeader ? 'Bearer [token]' : 'None');

    // Construct URL with search params
    const url = `${TRADING_PAIRS_URL}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

    console.log('[Trading Pairs API] Forwarding request to:', url);
    
    // Forward the request to the backend API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': formattedAuthHeader || ''
      },
      credentials: 'include', // Include cookies if needed for auth
    });

    // Get the response from the backend
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('[Trading Pairs API] Error parsing response:', e);
      return NextResponse.json({ success: false, message: 'Error parsing server response' }, { status: 500 });
    }

    console.log(`[Trading Pairs API] Backend response status: ${response.status}`);
    
    if (!response.ok) {
      console.error('[Trading Pairs API] Error response:', data);
      return NextResponse.json({ success: false, message: data?.message || 'Failed to retrieve trading pairs' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in trading pairs GET endpoint:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
