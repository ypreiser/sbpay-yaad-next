import { NextRequest, NextResponse } from 'next/server';
import { validatePaymentResponse, logPaymentResult, PaymentStatus } from '@/utils/payment';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const callbackData = Object.fromEntries(searchParams.entries());
    
    // Validate and process payment result
    const paymentResult = validatePaymentResponse(callbackData);
    
    // Log the result
    logPaymentResult(paymentResult);
    
    // Handle the result
    if (paymentResult.status === PaymentStatus.SUCCESS) {
      // Update your database with payment success
      // Notify SBPay about successful payment
      //POST to POST /api/order/{id}/approve
      const orderId = paymentResult.orderId;
      const response = await fetch(`XXXXXXXXXXXXXXXXXXXXXXXXXXX${orderId}/approve`, {
        method: 'POST',
        headers: {
          'X-Merchant': process.env.Merchant,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id:orderId }),
      });


      
      return NextResponse.redirect(new URL('/success', request.url));
    } else {
      return NextResponse.redirect(
        new URL(`/failure?error=${encodeURIComponent(paymentResult.error || '')}`, request.url)
      );
    }
  } catch (error) {
    console.error('Callback processing failed:', error);
    
    return NextResponse.redirect(
      new URL('/failure?error=unexpected_error', request.url)
    );
  }
} 