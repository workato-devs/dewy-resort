/**
 * Manager Billing Detail API
 * Provides detailed billing information for a specific guest
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeQueryOne } from '@/lib/db/client';
import { ChargeRow, TransactionRow, UserRow } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { guestId: string } }
) {
  try {
    const { guestId } = params;

    // Get guest information
    const guest = executeQueryOne<UserRow>(`
      SELECT * FROM users WHERE id = ? AND role = 'guest'
    `, [guestId]);

    if (!guest) {
      return NextResponse.json(
        { 
          error: {
            code: 'GUEST_NOT_FOUND',
            message: 'Guest not found',
          }
        },
        { status: 404 }
      );
    }

    // Get all charges for the guest
    const charges = executeQuery<ChargeRow>(`
      SELECT * FROM charges
      WHERE guest_id = ?
      ORDER BY date DESC
    `, [guestId]);

    // Get all transactions for the guest
    const transactions = executeQuery<TransactionRow>(`
      SELECT * FROM transactions
      WHERE guest_id = ?
      ORDER BY created_at DESC
    `, [guestId]);

    // Calculate billing summary
    const billingSummary = executeQueryOne<{
      total_charges: number;
      total_paid: number;
      balance: number;
      room_charges: number;
      service_charges: number;
      food_charges: number;
      other_charges: number;
    }>(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_charges,
        COALESCE(SUM(CASE WHEN paid = 1 THEN amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN paid = 0 THEN amount ELSE 0 END), 0) as balance,
        COALESCE(SUM(CASE WHEN type = 'room' THEN amount ELSE 0 END), 0) as room_charges,
        COALESCE(SUM(CASE WHEN type = 'service' THEN amount ELSE 0 END), 0) as service_charges,
        COALESCE(SUM(CASE WHEN type = 'food' THEN amount ELSE 0 END), 0) as food_charges,
        COALESCE(SUM(CASE WHEN type = 'other' THEN amount ELSE 0 END), 0) as other_charges
      FROM charges
      WHERE guest_id = ?
    `, [guestId]);

    // Get payment history summary
    const paymentSummary = executeQueryOne<{
      total_payments: number;
      completed_payments: number;
      pending_payments: number;
      failed_payments: number;
    }>(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) as total_payments,
        COALESCE(SUM(CASE WHEN type = 'payment' AND status = 'completed' THEN amount ELSE 0 END), 0) as completed_payments,
        COALESCE(SUM(CASE WHEN type = 'payment' AND status = 'pending' THEN amount ELSE 0 END), 0) as pending_payments,
        COALESCE(SUM(CASE WHEN type = 'payment' AND status = 'failed' THEN amount ELSE 0 END), 0) as failed_payments
      FROM transactions
      WHERE guest_id = ?
    `, [guestId]);

    return NextResponse.json({
      guest: {
        id: guest.id,
        name: guest.name,
        email: guest.email,
        roomNumber: guest.room_number,
        createdAt: new Date(guest.created_at),
      },
      charges: charges.map(charge => ({
        id: charge.id,
        guestId: charge.guest_id,
        type: charge.type,
        description: charge.description,
        amount: charge.amount,
        date: new Date(charge.date),
        paid: charge.paid === 1,
      })),
      transactions: transactions.map(transaction => ({
        id: transaction.id,
        guestId: transaction.guest_id,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        stripeTransactionId: transaction.stripe_transaction_id,
        createdAt: new Date(transaction.created_at),
      })),
      billingSummary: {
        totalCharges: billingSummary?.total_charges || 0,
        totalPaid: billingSummary?.total_paid || 0,
        balance: billingSummary?.balance || 0,
        chargesByType: {
          room: billingSummary?.room_charges || 0,
          service: billingSummary?.service_charges || 0,
          food: billingSummary?.food_charges || 0,
          other: billingSummary?.other_charges || 0,
        },
      },
      paymentSummary: {
        totalPayments: paymentSummary?.total_payments || 0,
        completedPayments: paymentSummary?.completed_payments || 0,
        pendingPayments: paymentSummary?.pending_payments || 0,
        failedPayments: paymentSummary?.failed_payments || 0,
      },
    });
  } catch (error) {
    console.error('Manager billing detail API error:', error);
    return NextResponse.json(
      { 
        error: {
          code: 'BILLING_DETAIL_ERROR',
          message: 'Failed to fetch guest billing details',
          details: error instanceof Error ? error.message : 'Unknown error',
        }
      },
      { status: 500 }
    );
  }
}
