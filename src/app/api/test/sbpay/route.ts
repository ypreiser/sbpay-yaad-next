import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function generateSBPaySignature(payload: Record<string, unknown>): string {
  // Create a copy of the payload without the signature field
  // eslint-disable-next-line
  const { signature, ...payloadWithoutSignature } = payload;

  // Generate signature from the payload without the signature field
  const dataToSign = JSON.stringify(payloadWithoutSignature);
  return crypto
    .createHmac("sha256", process.env.SBPAY_SECRET!)
    .update(dataToSign)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    // Get custom values from request or use defaults
    const body = await request.json();

    // Create a sample SBPay request
    const sbPayRequest = {
      transaction_id: `SBPAY_${Date.now()}`,
      amount: body.custom_amount || 100.0,
      currency: "ILS",
      customer: {
        name: "Test Customer",
        email: "customer@example.com",
        phone: "0501234567",
      },
      success_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
      metadata: {
        order_reference: body.custom_reference || "REF123",
        product_id: "PROD456",
      },
    };

    // First create the signed request
    const signedRequest = {
      ...sbPayRequest,
      signature: "", // Add empty signature first
    };

    // Then generate the signature from the full payload
    const signature = generateSBPaySignature(signedRequest);

    // Update the signature in the request
    signedRequest.signature = signature;

    // Send to your payment endpoint
    const response = await fetch(`${new URL(request.url).origin}/api/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SBPay-Signature": signature,
      },
      body: JSON.stringify(signedRequest),
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error("SBPay test request failed:", error);
    return NextResponse.json({ error: "Test request failed" }, { status: 500 });
  }
}
