import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function generateSBPaySignature(payload: unknown): string {
  const dataToSign = JSON.stringify(payload);
  return crypto
    .createHmac("sha256", process.env.SBPAY_SECRET!)
    .update(dataToSign)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    // Create a sample SBPay request
    const sbPayRequest = {
      transaction_id: `SBPAY_${Date.now()}`,
      amount: 100.00,
      currency: "ILS",
      customer: {
        name: "Test Customer",
        email: "customer@example.com",
        phone: "0501234567"
      },
      success_url: "https://your-site.com/success",
      cancel_url: "https://your-site.com/cancel",
      metadata: {
        order_reference: "REF123",
        product_id: "PROD456"
      }
    };

    // Generate signature
    const signature = generateSBPaySignature(sbPayRequest);

    // Send to your payment endpoint
    const response = await fetch(`${new URL(request.url).origin}/api/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SBPay-Signature": signature,
      },
      body: JSON.stringify(sbPayRequest),
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });

  } catch (error) {
    console.error("SBPay test request failed:", error);
    return NextResponse.json(
      { error: "Test request failed" },
      { status: 500 }
    );
  }
} 