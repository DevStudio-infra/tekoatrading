import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

// Base API URL for trading pairs by broker
const TRADING_PAIRS_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/trading-pairs/broker`;

export async function GET(
  request: NextRequest,
  { params }: { params: { brokerName: string } }
) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { brokerName } = params;
    if (!brokerName) {
      return NextResponse.json(
        { success: false, message: 'Broker name is required' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const url = `${TRADING_PAIRS_API_URL}/${brokerName}?${searchParams.toString()}`;

    const response = await fetchWithAuth(url);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching trading pairs by broker:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch trading pairs by broker' },
      { status: 500 }
    );
  }
}
