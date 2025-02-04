import { NextRequest, NextResponse } from 'next/server';

// Mock SBPay POST data structure
interface SBPayRequest {
  OrderId: string;
  Amount: string;
  Currency: string;
  CustomerName: string;
  CustomerEmail?: string;
  CustomerPhone?: string;
  Description?: string;
  SuccessUrl?: string;
  FailureUrl?: string;
  CancelUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Sample SBPay request data
    const mockSBPayRequest: SBPayRequest = {
      OrderId: `ORDER_${Date.now()}`,
      Amount: "100.00",
      Currency: "ILS",
      CustomerName: "Test Customer",
      CustomerEmail: "test@example.com",
      CustomerPhone: "0501234567",
      Description: "Test Payment",
      SuccessUrl: "http://localhost:3000/success",
      FailureUrl: "http://localhost:3000/failure",
      CancelUrl: "http://localhost:3000/cancel",
    };
    
    // Send this to your payment endpoint
    const response = await fetch(`${new URL(request.url).origin}/api/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Simulate SBPay headers if needed
        'X-SBPay-Signature': 'test_signature',
        'X-SBPay-Timestamp': new Date().toISOString(),
      },
      body: JSON.stringify({
        order_id: mockSBPayRequest.OrderId,
        amount: mockSBPayRequest.Amount,
        customer_name: mockSBPayRequest.CustomerName,
      }),
    });

    const result = await response.json();
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Test payment failed:', error);
    return NextResponse.json(
      { error: 'Test payment failed' },
      { status: 500 }
    );
  }
} 