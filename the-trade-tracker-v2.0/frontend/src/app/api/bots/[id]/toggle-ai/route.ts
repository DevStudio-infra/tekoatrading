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
 * PATCH handler for toggling bot AI trading
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log(`[Bot Toggle AI API] PATCH request received for bot ${id}`);
    
    // In development mode, always bypass Clerk authentication
    let userId: string | null = null;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Bot Toggle AI API] Development mode: Bypassing Clerk authentication');
      // Use a hardcoded userId for development
      userId = '1';
      console.log(`[Bot Toggle AI API] Using development userId: ${userId}`);
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
        console.error('Unauthorized access attempt to toggle bot AI trading');
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
      }
    }

    // In development mode, always use the development token regardless of what's in the header
    let authHeader;
    
    if (process.env.NODE_ENV === 'development') {
      // Always use the development token in development mode
      authHeader = DEV_AUTH_TOKEN;
      console.log('[Bot Toggle AI API] Using development token for authentication');
    } else {
      // In production, use the authorization header from the request
      authHeader = request.headers.get('authorization');
    }
    
    // Log the authentication state
    console.log('[Bot Toggle AI API] Request headers:', { auth: authHeader ? 'Present' : 'Missing' });
    console.log('[Bot Toggle AI API] Auth header format:', authHeader ? authHeader.substring(0, 20) + '...' : 'None');

    // Forward request to backend
    console.log(`[Bot Toggle AI API] Forwarding toggle AI request to backend: ${BACKEND_URL}/api/v1/bots/${id}/toggle-ai`);
    
    const response = await fetch(`${BACKEND_URL}/api/v1/bots/${id}/toggle-ai`, {
      method: 'PATCH',
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
      console.error('[Bot Toggle AI API] Error parsing response:', e);
      return NextResponse.json({ success: false, message: 'Error parsing server response' }, { status: 500 });
    }

    console.log(`[Bot Toggle AI API] Backend response status: ${response.status}`);
    
    if (!response.ok) {
      console.error('[Bot Toggle AI API] Error response:', data);
      return NextResponse.json({ success: false, message: data?.message || 'Failed to toggle bot AI trading' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in toggle bot AI trading endpoint:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
