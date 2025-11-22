/**
 * Guest Checkout API
 * POST /api/guest/checkout
 * Processes payment and updates guest status to checked out
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { executeQueryOne, executeQuery, executeUpdate } from '@/lib/db/client';
import { mapUser } from '@/lib/db/mappers';
import { UserRow, User } from '@/types';

interface CheckoutRequest {
  paymentMethod: {
    cardNumber: string;
    expiry: string;
    cvv: string;
    cardholderName: string;
  };
}

interface CheckoutResponse {
  success: boolean;
  transactionId: string;
  message: string;
  amount: number;
}

const TAX_RATE = 0.10; // 10% tax rate

export async function POST(request: NextRequest) {
  try {
    // Get session from cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('hotel_session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Verify session and get user
    const sessionQuery = `
      SELECT u.* FROM users u
      INNER JOIN sessions s ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > datetime('now')
    `;
    
    const userRow = executeQueryOne<UserRow>(sessionQuery, [sessionId]);

    if (!userRow) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: 'Invalid or expired session' } },
        { status: 401 }
      );
    }

    const guest = mapUser(userRow);

    // Verify user is a guest
    if (guest.role !== 'guest') {
      return NextResponse.json(
        { error: { code: 'AUTHZ_ERROR', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Parse request body
    const body: CheckoutRequest = await request.json();

    // Validate payment method
    if (!body.paymentMethod || 
        !body.paymentMethod.cardNumber || 
        !body.paymentMethod.expiry || 
        !body.paymentMethod.cvv ||
        !body.paymentMethod.cardholderName) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid payment method details' } },
        { status: 400 }
      );
    }

    // Calculate total amount
    const chargesQuery = `
      SELECT SUM(amount) as total FROM charges 
      WHERE guest_id = ? AND paid = 0
    `;
    const result = executeQueryOne<{ total: number | null }>(chargesQuery, [guest.id]);
    const subtotal = result?.total || 0;
    
    if (subtotal === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No unpaid charges to process' } },
        { status: 400 }
      );
    }

    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    // Call mock Workato Stripe API
    const workatoResponse = await fetch(`${request.nextUrl.origin}/api/workato/stripe/process-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guestId: guest.id,
        amount: total,
        paymentMethod: body.paymentMethod,
      }),
    });

    if (!workatoResponse.ok) {
      const errorData = await workatoResponse.json();
      return NextResponse.json(
        { 
          error: { 
            code: 'PAYMENT_ERROR', 
            message: errorData.error?.message || 'Payment processing failed' 
          } 
        },
        { status: 502 }
      );
    }

    const paymentResult = await workatoResponse.json();

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: { code: 'PAYMENT_ERROR', message: paymentResult.message || 'Payment failed' } },
        { status: 400 }
      );
    }

    // Create transaction record
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const insertTransactionQuery = `
      INSERT INTO transactions (id, guest_id, amount, type, status, stripe_transaction_id, created_at)
      VALUES (?, ?, ?, 'payment', 'completed', ?, datetime('now'))
    `;
    executeUpdate(insertTransactionQuery, [
      transactionId,
      guest.id,
      total,
      paymentResult.transactionId,
    ]);

    // Mark all charges as paid
    const updateChargesQuery = `
      UPDATE charges 
      SET paid = 1 
      WHERE guest_id = ? AND paid = 0
    `;
    executeUpdate(updateChargesQuery, [guest.id]);

    // Update room status to vacant (guest checked out)
    if (guest.roomNumber) {
      const updateRoomQuery = `
        UPDATE rooms 
        SET status = 'cleaning', current_guest_id = NULL 
        WHERE room_number = ?
      `;
      executeUpdate(updateRoomQuery, [guest.roomNumber]);
    }

    const checkoutResponse: CheckoutResponse = {
      success: true,
      transactionId: paymentResult.transactionId,
      message: 'Payment processed successfully. Thank you for your stay!',
      amount: total,
    };

    return NextResponse.json(checkoutResponse);

  } catch (error) {
    console.error('Checkout API error:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to process checkout',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}
