import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const success = searchParams.get('success') === 'true';
    
    // Simulate YaadPay callback
    const mockCallbackData = {
      CCode: success ? '0' : '1',
      ACode: '123456',
      Order: searchParams.get('order') || 'TEST123',
      Amount: searchParams.get('amount') || '100.00',
      Token: 'test_token_123',
    };
    
    // Convert to query string
    const queryString = new URLSearchParams(mockCallbackData).toString();
    
    // Get base URL from request
    const baseUrl = new URL(request.url).origin;
    
    // Redirect to callback endpoint with proper base URL
    return NextResponse.redirect(
      `${baseUrl}/api/callback?${queryString}`
    );
  } catch (error) {
    console.error('Test callback failed:', error);
    return NextResponse.json(
      { error: 'Test callback failed' },
      { status: 500 }
    );
  }
} 