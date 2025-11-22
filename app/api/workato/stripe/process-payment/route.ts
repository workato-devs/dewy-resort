/**
 * Mock Workato Stripe Integration
 * POST /api/workato/stripe/process-payment
 * Simulates Stripe payment processing through Workato
 */

import { NextRequest, NextResponse } from 'next/server';

interface PaymentRequest {
  guestId: string;
  amount: number;
  paymentMethod: {
    cardNumber: string;
    expiry: string;
    cvv: string;
    cardholderName: string;
  };
}

interface PaymentResponse {
  success: boolean;
  transactionId: string;
  status: string;
  message: string;
}

// Simulate payment processing delay
const PROCESSING_DELAY_MS = 300;

// Helper to validate card number (basic Luhn algorithm check)
function validateCardNumber(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s/g, '');
  
  if (!/^\d{13,19}$/.test(cleaned)) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

// Helper to validate expiry date
function validateExpiry(expiry: string): boolean {
  const match = expiry.match(/^(\d{2})\/(\d{2,4})$/);
  if (!match) return false;

  const month = parseInt(match[1], 10);
  let year = parseInt(match[2], 10);

  // Convert 2-digit year to 4-digit
  if (year < 100) {
    year += 2000;
  }

  if (month < 1 || month > 12) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return false;
  }

  return true;
}

// Helper to validate CVV
function validateCVV(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv);
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json();

    // Validate required fields
    if (!body.guestId || !body.amount || !body.paymentMethod) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields',
          },
        },
        { status: 400 }
      );
    }

    const { paymentMethod, amount, guestId } = body;

    // Validate payment method details
    if (!paymentMethod.cardNumber || !paymentMethod.expiry || 
        !paymentMethod.cvv || !paymentMethod.cardholderName) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Incomplete payment method details',
          },
        },
        { status: 400 }
      );
    }

    // Validate card number
    if (!validateCardNumber(paymentMethod.cardNumber)) {
      return NextResponse.json(
        {
          success: false,
          transactionId: '',
          status: 'failed',
          message: 'Invalid card number',
        },
        { status: 200 }
      );
    }

    // Validate expiry
    if (!validateExpiry(paymentMethod.expiry)) {
      return NextResponse.json(
        {
          success: false,
          transactionId: '',
          status: 'failed',
          message: 'Invalid or expired card',
        },
        { status: 200 }
      );
    }

    // Validate CVV
    if (!validateCVV(paymentMethod.cvv)) {
      return NextResponse.json(
        {
          success: false,
          transactionId: '',
          status: 'failed',
          message: 'Invalid CVV',
        },
        { status: 200 }
      );
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid amount',
          },
        },
        { status: 400 }
      );
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_MS));

    // Generate mock Stripe transaction ID
    const transactionId = `stripe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Mock payment success (in real scenario, this would call actual Stripe API)
    const response: PaymentResponse = {
      success: true,
      transactionId,
      status: 'completed',
      message: 'Payment processed successfully',
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Workato Stripe API error:', error);

    return NextResponse.json(
      {
        error: {
          code: 'EXTERNAL_SERVICE_ERROR',
          message: 'Payment processing failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
