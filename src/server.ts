import express from "express";
import crypto from "crypto";
import { z } from "zod";

const app = express();
app.use(express.json());

// Validation schemas and helper functions remain the same
const sbPayRequestSchema = z.object({
  transaction_id: z.string(),
  amount: z.number().or(z.string().transform((val) => parseFloat(val))),
  currency: z.string().default("ILS"),
  customer: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  metadata: z.record(z.unknown()).optional(),
  signature: z.string(),
});

function validateSBPaySignature(
  payload: Record<string, unknown>,
  signature: string
): boolean {
  try {
    const { signature: _, ...payloadWithoutSignature } = payload;
    const dataToSign = JSON.stringify(payloadWithoutSignature);
    return (
      crypto
        .createHmac("sha256", process.env.SBPAY_SECRET!)
        .update(dataToSign)
        .digest("hex") === signature
    );
  } catch (error) {
    console.error("Signature validation failed:", error);
    return false;
  }
}

// Main payment endpoint
app.post("/api/payment", async (req, res) => {
  try {
    const sbPaySignature = req.headers["x-sbpay-signature"];
    if (!sbPaySignature) {
      return res.status(401).json({ error: "Missing SBPay signature" });
    }

    if (!validateSBPaySignature(req.body, sbPaySignature as string)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const paymentData = sbPayRequestSchema.parse(req.body);

    // Get Yaad signature
    const signatureUrl = `https://icom.yaad.net/p/?${new URLSearchParams({
      action: "APISign",
      What: "SIGN",
      KEY: process.env.TEST_KEY!,
      PassP: process.env.TEST_PassP!,
      Masof: process.env.TEST_Masof!,
      Order: paymentData.transaction_id,
      Amount: paymentData.amount.toString(),
      ClientName: paymentData.customer.name,
      Currency: "1",
      tmp: "1",
    })}`;

    const signResponse = await fetch(signatureUrl);
    const signature = await signResponse.text();

    // Create final payment URL
    const finalPaymentUrl = `https://icom.yaad.net/p/?action=pay&${signature}`;

    // Return or redirect based on environment
    if (process.env.NODE_ENV === "production") {
      return res.redirect(finalPaymentUrl);
    }

    return res.json({
      status: "success",
      payment_url: finalPaymentUrl,
      transaction_id: paymentData.transaction_id,
      debug: { signatureUrl, signature, finalPaymentUrl },
    });
  } catch (error) {
    console.error("Payment processing failed:", error);
    return res.status(500).json({ error: "Payment processing failed" });
  }
});

// Test endpoint
app.post("/api/test/sbpay", async (req, res) => {
  try {
    const sbPayRequest = {
      transaction_id: `SBPAY_${Date.now()}`,
      amount: req.body.custom_amount || 100.0,
      currency: "ILS",
      customer: {
        name: "Test Customer",
        email: "test@example.com",
        phone: "0501234567",
      },
    };

    const signature = crypto
      .createHmac("sha256", process.env.SBPAY_SECRET!)
      .update(JSON.stringify(sbPayRequest))
      .digest("hex");

    const response = await fetch(
      `${req.protocol}://${req.get("host")}/api/payment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SBPay-Signature": signature,
        },
        body: JSON.stringify({ ...sbPayRequest, signature }),
      }
    );

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error("Test request failed:", error);
    res.status(500).json({ error: "Test request failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
