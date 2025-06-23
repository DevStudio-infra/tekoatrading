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
 * POST handler for evaluating a bot
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log(`[Bot Evaluate API] POST request received for bot ${id}`);
    
    // In development mode, always bypass Clerk authentication
    let userId: string | null = null;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Bot Evaluate API] Development mode: Bypassing Clerk authentication');
      // Use a hardcoded userId for development
      userId = '1';
      console.log(`[Bot Evaluate API] Using development userId: ${userId}`);
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
        console.error('Unauthorized access attempt to evaluate bot');
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
      }
    }

    // In development mode, always use the development token regardless of what's in the header
    let authHeader;
    
    if (process.env.NODE_ENV === 'development') {
      // Always use the development token in development mode
      authHeader = DEV_AUTH_TOKEN;
      console.log('[Bot Evaluate API] Using development token for authentication');
    } else {
      // In production, use the authorization header from the request
      authHeader = request.headers.get('authorization');
    }
    
    // Log the authentication state
    console.log('[Bot Evaluate API] Request headers:', { auth: authHeader ? 'Present' : 'Missing' });
    console.log('[Bot Evaluate API] Auth header format:', authHeader ? authHeader.substring(0, 20) + '...' : 'None');

    // Forward request to backend
    console.log(`[Bot Evaluate API] Forwarding evaluate request to backend: ${BACKEND_URL}/api/v1/bots/${id}/evaluate`);
    
    const response = await fetch(`${BACKEND_URL}/api/v1/bots/${id}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || ''
      },
      credentials: 'include', // Include cookies if needed for auth
      body: JSON.stringify({ userId }),
    });

    // Get the response from the backend
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('[Bot Evaluate API] Error parsing response:', e);
      return NextResponse.json({ success: false, message: 'Error parsing server response' }, { status: 500 });
    }

    console.log(`[Bot Evaluate API] Backend response status: ${response.status}`);
    
    if (!response.ok) {
      console.error('[Bot Evaluate API] Error response:', data);
      return NextResponse.json({ success: false, message: data?.message || 'Failed to evaluate bot' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in evaluate bot endpoint:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
