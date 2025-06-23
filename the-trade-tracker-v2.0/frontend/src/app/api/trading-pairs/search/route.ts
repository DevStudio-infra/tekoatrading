import { NextRequest, NextResponse } from 'next/server';
import { mockTradingPairs } from '../mock-data';

// Flag to prevent repeated failed API calls
let apiFailedRecently = false;
let lastApiFailTime = 0;
const API_RETRY_INTERVAL = 60000; // 1 minute cooling off period

// Flag to force use of real data (overriding the cooling off mechanism)
const FORCE_REAL_DATA = true;
import { fetchWithAuth } from '@/lib/fetch-with-auth';

// API URL for trading pairs search
const TRADING_PAIRS_SEARCH_URL = `${process.env.NEXT_PUBLIC_API_URL}/trading-pairs/search`;

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization');
    
    // Create a development token if no auth header is present
    let token = authHeader;
    if (!token) {
      // Create a development token - same approach used in other API routes
      const devTokenData = {
        userId: 1,
        id: 1,
        email: "dev@example.com"
      };
      token = "Bearer " + Buffer.from(JSON.stringify(devTokenData)).toString('base64');
      console.log('[DEBUG] Using development auth token for trading pairs search');
    }

    const searchParams = request.nextUrl.searchParams;
    const url = `${TRADING_PAIRS_SEARCH_URL}?${searchParams.toString()}`;

    // Check if API has failed recently to avoid repeated calls
    const now = Date.now();
    let useRealApi = true;
    
    // If FORCE_REAL_DATA is true, always use real API regardless of cooling off period
    if (!FORCE_REAL_DATA && apiFailedRecently && (now - lastApiFailTime) < API_RETRY_INTERVAL) {
      // Skip API call and use mock data directly
      console.log('[DEBUG] Using mock data for search (API cooling off period)');
      useRealApi = false;
    }
    
    // Always log whether we're using real API or mock data
    console.log('[DEBUG] Using real API data for search:', useRealApi || FORCE_REAL_DATA ? 'YES' : 'NO');
    
    if (useRealApi) {
      try {
        // Make the API request with the token
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          },
          credentials: 'include'
        });
        
        const data = await response.json();
        
        // If the API call was successful, use real data
        if (data.success) {
          // Reset API failure flags on success
          apiFailedRecently = false;
          console.log('[DEBUG] Using real search results from backend - found', data.pairs?.length || 0, 'pairs');
          return NextResponse.json(data);
        } else {
          // Mark as failed and continue to mock data
          apiFailedRecently = true;
          lastApiFailTime = now;
          console.log('[DEBUG] Backend returned success=false for search, using mock data');
        }
      } catch (error) {
        // Set cooling off period on error
        apiFailedRecently = true;
        lastApiFailTime = now;
        console.log('[DEBUG] Using mock data for search due to API error');
      }
    }
    
    // Get search parameters
    const query = searchParams.get('query') || '';
    const brokerName = searchParams.get('brokerName') || 'Capital.com';
    const category = searchParams.get('category') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Filter mock data based on search parameters
    let filteredPairs = mockTradingPairs
      .filter(pair => !brokerName || pair.brokerName === brokerName);
      
    // Apply query filter if provided
    if (query) {
      const lowerQuery = query.toLowerCase();
      filteredPairs = filteredPairs.filter(pair => 
        pair.symbol.toLowerCase().includes(lowerQuery) ||
        pair.name.toLowerCase().includes(lowerQuery) ||
        (pair.description && pair.description.toLowerCase().includes(lowerQuery))
      );
    }
    
    // Apply category filter if provided
    if (category && category !== 'All') {
      filteredPairs = filteredPairs.filter(pair => pair.category === category);
    }
    
    // Limit results
    filteredPairs = filteredPairs.slice(0, limit);
    
    // Return filtered mock data
    return NextResponse.json({
      success: true,
      pairs: filteredPairs,
    });
  } catch (error) {
    console.error('Error searching trading pairs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to search trading pairs' },
      { status: 500 }
    );
  }
}
