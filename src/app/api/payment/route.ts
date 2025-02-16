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

// SBPay request schema
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
    signature: z.string(),
  })
  .transform((data) => ({
    Order: data.transaction_id,
    Amount: data.amount,
    ClientName: data.customer.name,
    Currency: data.currency,
  }));

function validateSBPaySignature(
  payload: Record<string, unknown>,
  signature: string
): boolean {
  try {
    // eslint-disable-next-line
    const { signature: _, ...payloadWithoutSignature } = payload;
    const dataToSign = JSON.stringify(payloadWithoutSignature);
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

const YAAD_BASE_URL = "https://icom.yaad.net";

// Use test or production credentials based on environment
const YAAD_CREDS = {
  Masof:
    process.env.NODE_ENV === "production"
      ? process.env.YAAD_MASOF!
      : process.env.TEST_Masof!,
  PassP:
    process.env.NODE_ENV === "production"
      ? process.env.YAAD_PassP!
      : process.env.TEST_PassP!,
  KEY:
    process.env.NODE_ENV === "production"
      ? process.env.YAAD_KEY!
      : process.env.TEST_KEY!,
};

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

    // First get signature from Yaad
    const signatureUrl = `${YAAD_BASE_URL}/p/?${new URLSearchParams({
      action: "APISign",
      What: "SIGN",
      KEY: YAAD_CREDS.KEY,
      PassP: YAAD_CREDS.PassP,
      Masof: YAAD_CREDS.Masof,
      Order: paymentData.Order,
      Amount: paymentData.Amount.toString(),
      ClientName: paymentData.ClientName,
      Currency: "1", // 1 for ILS
      tmp: "1",
    })}`;
    console.log({ signatureUrl });

    // Get signature from Yaad
    const signResponse = await fetch(signatureUrl);
    console.log({ signResponse });
    const signature = await signResponse.text();

    // Now create the final payment URL with the signature
    const finalPaymentUrl = `${YAAD_BASE_URL}/p/?action=pay&${signature}`;
    console.log({ finalPaymentUrl });

    // Return based on environment
    if (process.env.NODE_ENV === "production") {
      return NextResponse.redirect(finalPaymentUrl);
    }

    return NextResponse.json({
      status: "success",
      payment_url: finalPaymentUrl,
      transaction_id: paymentData.Order,
      debug: {
        signatureUrl,
        signature,
        finalPaymentUrl,
      },
    });
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
