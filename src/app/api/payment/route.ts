import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

// Validate environment variables
const requiredEnvVars = [
  "SBPAY_API_KEY",
  "SBPAY_SECRET",
  "YAAD_KEY",
  "YAAD_PassP",
  "YAAD_MASOF",
] as const;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// SBPay request schema matching their actual API
const sbPayRequestSchema = z
  .object({
    transaction_id: z.string(),
    amount: z.number().or(z.string().transform((val) => parseFloat(val))),
    currency: z.string().default("ILS"),
    customer: z.object({
      name: z.string(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    }),
    metadata: z.record(z.unknown()).optional(),
    success_url: z.string().url().optional(),
    cancel_url: z.string().url().optional(),
    signature: z.string(), // SBPay's request signature
  })
  .transform((data) => ({
    Order: data.transaction_id,
    Amount: data.amount,
    ClientName: data.customer.name,
    Currency: data.currency,
    Email: data.customer.email,
    Phone: data.customer.phone,
    SuccessURL: data.success_url,
    CancelURL: data.cancel_url,
  }));

function validateSBPaySignature(payload: unknown, signature: string): boolean {
  try {
    // Recreate signature using your secret
    const dataToSign = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac("sha256", process.env.SBPAY_SECRET!)
      .update(dataToSign)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("Signature validation failed:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get SBPay signature from headers
    const sbPaySignature = request.headers.get("X-SBPay-Signature");
    if (!sbPaySignature) {
      return NextResponse.json(
        { error: "Missing SBPay signature" },
        { status: 401 }
      );
    }

    const rawBody = await request.json();

    // Validate signature
    if (!validateSBPaySignature(rawBody, sbPaySignature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse and validate the request body
    const paymentData = sbPayRequestSchema.parse(rawBody);

    // Store transaction details in your database here
    // await db.transactions.create({ ... })

    // Return the response SBPay expects
    return NextResponse.json(
      {
        status: "success",
        payment_url: `https://icom.yaad.net/p/?action=pay&${new URLSearchParams(
          {
            Order: paymentData.Order,
            Amount: paymentData.Amount.toString(),
            Currency: paymentData.Currency,
            // Add other required Yaad parameters
          }
        )}`,
        transaction_id: paymentData.Order,
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Payment request processing failed:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          status: "error",
          error: "Invalid request format",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        status: "error",
        error: "Payment processing failed",
      },
      { status: 500 }
    );
  }
}

// Add rate limiting middleware if needed
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "16kb", // Adjust as needed
    },
  },
};
