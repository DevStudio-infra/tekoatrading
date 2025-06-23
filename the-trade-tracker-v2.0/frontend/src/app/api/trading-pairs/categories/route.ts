import { NextRequest, NextResponse } from 'next/server';
import { mockCategories } from '../mock-data';
import { getAuth } from '@clerk/nextjs/server';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// API URL for trading pair categories
const TRADING_PAIRS_CATEGORIES_URL = `${BACKEND_URL}/api/v1/trading-pairs/categories`;

// Flag to prevent repeated failed API calls
let apiFailedRecently = false;
let lastApiFailTime = 0;
const API_RETRY_INTERVAL = 60000; // 1 minute cooling off period

// Flag to force use of real data (overriding the cooling off mechanism)
const FORCE_REAL_DATA = true;

export async function GET(request: NextRequest) {
  try {
    // Handle authentication - with dev mode fallback
    let userId: string | null = null;
    
    try {
      // Try to get auth from Clerk
      const auth = getAuth(request);
      userId = auth.userId;
    } catch (authError) {
      // In development, bypass auth errors
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Bypassing Clerk authentication');
        userId = 'dev-user-id';
      } else {
        throw authError; // Re-throw in production
      }
    }
    
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const url = `${TRADING_PAIRS_CATEGORIES_URL}?${searchParams.toString()}`;
    console.log('[Trading Pairs Categories API] Requesting URL:', url);
    
    // Get request headers
    const authHeader = request.headers.get('authorization');
    
    // Check if API has failed recently to avoid repeated calls
    const now = Date.now();
    let useRealApi = true;
    
    // If FORCE_REAL_DATA is true, always use real API regardless of cooling off period
    if (!FORCE_REAL_DATA && apiFailedRecently && (now - lastApiFailTime) < API_RETRY_INTERVAL) {
      // Skip API call and use mock data directly
      console.log('[DEBUG] Using mock categories (API cooling off period)');
      useRealApi = false;
    }
    
    // Always log whether we're using real API or mock data
    console.log('[DEBUG] Using real API data for categories:', useRealApi || FORCE_REAL_DATA ? 'YES' : 'NO');
    
    if (useRealApi) {
      try {
        // Try the actual API call
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { 'Authorization': authHeader } : {})
          }
        });
        
        const data = await response.json();
        
        // If the API call was successful, use the real data
        if (data.success) {
          // Reset API failure flags on success
          apiFailedRecently = false;
          console.log('[DEBUG] Using real categories from backend - found', data.categories?.length || 0, 'categories');
          return NextResponse.json(data);
        } else {
          // If the API call failed, use mock data
          apiFailedRecently = true;
          lastApiFailTime = now;
          // Continue to mock data
          console.log('[DEBUG] Backend returned success=false for categories, using mock data');
        }
      } catch (error) {
        // Set cooling off period on error
        apiFailedRecently = true;
        lastApiFailTime = now;
        console.log('[DEBUG] Using mock categories due to API error');
      }
    }
    
    // Return mock categories
    return NextResponse.json({
      success: true,
      categories: mockCategories
    });
  } catch (error) {
    console.error('Error fetching trading pair categories:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch trading pair categories' },
      { status: 500 }
    );
  }
}
