import { z } from 'zod';

export const PaymentStatus = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  PENDING: 'PENDING',
} as const;

export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

export interface PaymentResult {
  status: PaymentStatus;
  orderId: string;
  amount: number;
  error?: string;
}

const paymentResponseSchema = z.object({
  CCode: z.string(),
  ACode: z.string(),
  Order: z.string(),
  Amount: z.string().transform(val => parseFloat(val)),
  Token: z.string().optional(),
});

export function validatePaymentResponse(data: unknown): PaymentResult {
  try {
    const validated = paymentResponseSchema.parse(data);
    
    const isSuccess = validated.CCode === '0';
    
    return {
      status: isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILURE,
      orderId: validated.Order,
      amount: validated.Amount,
      error: isSuccess ? undefined : `Payment failed with code: ${validated.CCode}`,
    };
  } catch (error) {
    console.error('Payment validation failed:', error);
    return {
      status: PaymentStatus.FAILURE,
      orderId: 'UNKNOWN',
      amount: 0,
      error: 'Invalid payment response format',
    };
  }
}

export function logPaymentResult(result: PaymentResult): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    ...result,
  };
  
  // Log to console for now, but you might want to:
  // 1. Send to a logging service
  // 2. Store in database
  // 3. Notify monitoring systems
  console.log('Payment Result:', logEntry);
  
  if (result.status === PaymentStatus.FAILURE) {
    console.error('Payment Failed:', logEntry);
  }
} 