import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const signaturePayloadSchema = z.object({
  Order: z.string(),
  Amount: z.number(),
  ClientName: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request payload
    const payload = signaturePayloadSchema.parse(body);
    
    // Construct signature parameters
    const signatureParams = {
      action: "APISign",
      What: "SIGN",
      KEY: process.env.YAAD_KEY,
      PassP: process.env.YAAD_PassP,
      Masof: process.env.YAAD_MASOF,
      Order: payload.Order,
      Amount: payload.Amount,
      ClientName: payload.ClientName,
      tmp: "7",
    };

    // Convert params to query string
    const queryString = new URLSearchParams(
      Object.entries(signatureParams).map(([key, value]) => [key, String(value)])
    ).toString();

    return NextResponse.json(queryString, { status: 200 });
  } catch (error) {
    console.error('Signature generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate payment signature' },
      { status: 500 }
    );
  }
} 