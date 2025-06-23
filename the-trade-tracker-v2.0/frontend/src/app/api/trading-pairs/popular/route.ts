import { NextRequest, NextResponse } from 'next/server';
import { mockTradingPairs } from '../mock-data';
import { handleApiAuth, fixAuthorizationHeader } from '@/lib/api-auth';

// Flag to prevent repeated failed API calls
let apiFailedRecently = false;
let lastApiFailTime = 0;
const API_RETRY_INTERVAL = 60000; // 1 minute cooling off period

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// API URL for popular trading pairs
const TRADING_PAIRS_POPULAR_URL = `${BACKEND_URL}/api/v1/trading-pairs/popular`;

// Flag to force use of real data (overriding the cooling off mechanism)
const FORCE_REAL_DATA = true;

export async function GET(request: NextRequest) {
  try {
    // Handle authentication using our utility function
    const { userId, authHeader, isAuthenticated } = await handleApiAuth(request);
    
    if (!isAuthenticated) {
      console.log('[Trading Pairs API] Authentication failed');
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    console.log(`[Trading Pairs API] Authenticated as user ${userId}`);

    const searchParams = request.nextUrl.searchParams;
    const url = `${TRADING_PAIRS_POPULAR_URL}?${searchParams.toString()}`;
    
    // Check if API has failed recently to avoid repeated calls
    const now = Date.now();
    let useRealApi = true;
    
    // If FORCE_REAL_DATA is true, always use real API regardless of cooling off period
    if (!FORCE_REAL_DATA && apiFailedRecently && (now - lastApiFailTime) < API_RETRY_INTERVAL) {
      // Skip API call and use mock data directly
      console.log('[DEBUG] Using mock data (API cooling off period)');
      useRealApi = false;
    }
    
    // Always log whether we're using real API or mock data
    console.log('[DEBUG] Using real API data:', useRealApi || FORCE_REAL_DATA ? 'YES' : 'NO');
    
    if (useRealApi || FORCE_REAL_DATA) {
      try {
        // Ensure the authorization header is properly formatted
        const formattedAuthHeader = fixAuthorizationHeader(authHeader);
        console.log('[Trading Pairs API] Using auth header:', formattedAuthHeader ? 'Bearer [token]' : 'None');
        
        // Try the actual API call
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': formattedAuthHeader || ''
          },
          // Add credentials to include cookies in the request
          credentials: 'include'
        });

        
        const data = await response.json();
        
        // If the API call was successful, use the real data
        if (data.success) {
          // Reset API failure flags on success
          apiFailedRecently = false;
          console.log('[DEBUG] Using real data from backend - found', data.pairs?.length || 0, 'pairs');
          
          // Log the structure of a sample item to debug data mapping issues
          if (data.pairs && data.pairs.length > 0) {
            console.log('[DEBUG] Real data structure sample:', JSON.stringify(data.pairs[0]));
            
            // Ensure the data has the correct structure for the frontend component
            const mappedData = data.pairs.map((pair: any) => ({
              id: pair.id,
              symbol: pair.symbol,
              name: pair.name || pair.symbol,
              description: pair.description,
              marketId: pair.market_id,
              type: pair.type,
              category: pair.category,
              brokerName: pair.broker_name,
              isActive: pair.is_active,
              metadata: pair.metadata,
              lastUpdated: pair.last_updated,
              createdAt: pair.created_at
            }));
            
            console.log('[DEBUG] Real data structure sample:', JSON.stringify(mappedData[0]));
            
            // Add debugging to see category distribution
            const categoryMap: Record<string, number> = {};
            mappedData.forEach((pair: any) => {
              if (pair.category) {
                categoryMap[pair.category] = (categoryMap[pair.category] || 0) + 1;
              } else {
                categoryMap['uncategorized'] = (categoryMap['uncategorized'] || 0) + 1;
              }
            });
            console.log('[DEBUG] Category distribution:', categoryMap);
            
            return NextResponse.json({
              success: true,
              pairs: mappedData,
            });
          }
          
          return NextResponse.json(data);
        } else {
          // If the API call failed or returned no pairs, use mock data
          apiFailedRecently = true;
          lastApiFailTime = now;
          // Continue to mock data
          console.log('[DEBUG] Backend returned success=false, using mock data');
        }
      } catch (error) {
        // Set cooling off period on error
        apiFailedRecently = true;
        lastApiFailTime = now;
        console.log('[DEBUG] Using mock data due to API error');
      }
    }
    
    // Extract query parameters
    const brokerName = searchParams.get('brokerName') || 'Capital.com';
    // Increase default limit to get more items from all categories
    const limit = parseInt(searchParams.get('limit') || '200');
    
    // Filter mock data based on broker
    const mockPairs = mockTradingPairs
      .filter(pair => !brokerName || pair.brokerName === brokerName)
      .slice(0, limit);
      
    return NextResponse.json({
      success: true,
      pairs: mockPairs,
    });
  } catch (error) {
    console.error('Error fetching popular trading pairs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch popular trading pairs' },
      { status: 500 }
    );
  }
}
