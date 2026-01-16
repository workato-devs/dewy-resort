/**
 * Manager Billing API
 * Provides billing overview for all guest accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { isSalesforceEnabled, isStripeEnabled } from '@/lib/workato/feature-flags';
import { getSalesforceClient, getStripeClient } from '@/lib/workato/config';
import { executeQuery, executeQueryOne } from '@/lib/db/client';
import { ChargeRow, TransactionRow, UserRow } from '@/types';

export async function GET(request: NextRequest) {
  const apiFailures: Array<{ source: string; error: string }> = [];

  try {
    // Get all guests from local database (users are still managed locally/OKTA)
    const guests = executeQuery<UserRow>(`
      SELECT * FROM users WHERE role = 'guest' ORDER BY room_number
    `, []);

    let allCharges: any[] = [];
    let allTransactions: TransactionRow[] = [];

    // Try to get charges from Salesforce
    if (isSalesforceEnabled()) {
      try {
        const client = getSalesforceClient();
        allCharges = await client.searchCharges({});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        apiFailures.push({
          source: 'Salesforce',
          error: `Failed to fetch charges: ${errorMessage}`,
        });
        // Fallback to local database for charges
        allCharges = executeQuery<ChargeRow>(`SELECT * FROM charges`, []);
      }
    } else {
      // Use local database for charges
      allCharges = executeQuery<ChargeRow>(`SELECT * FROM charges`, []);
    }

    // Try to get transactions from Stripe
    if (isStripeEnabled()) {
      try {
        // For now, Stripe integration is for future payment processing
        // Transactions are still stored locally but could be synced with Stripe
        allTransactions = executeQuery<TransactionRow>(`
          SELECT * FROM transactions ORDER BY created_at DESC
        `, []);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        apiFailures.push({
          source: 'Stripe',
          error: `Failed to fetch transactions: ${errorMessage}`,
        });
        // Fallback to local database
        allTransactions = executeQuery<TransactionRow>(`
          SELECT * FROM transactions ORDER BY created_at DESC
        `, []);
      }
    } else {
      // Use local database for transactions
      allTransactions = executeQuery<TransactionRow>(`
        SELECT * FROM transactions ORDER BY created_at DESC
      `, []);
    }
    
    // Build guest accounts with charges
    const guestAccounts = guests.map(guest => {
      const guestCharges = allCharges.filter((c: any) => c.guest_id === guest.id);
      const guestTransactions = allTransactions.filter((t: any) => t.guest_id === guest.id);
      
      const totalCharges = guestCharges.reduce((sum: number, c: any) => sum + c.amount, 0);
      const totalPaid = guestCharges.filter((c: any) => c.paid).reduce((sum: number, c: any) => sum + c.amount, 0);
      const balance = totalCharges - totalPaid;
      
      const lastTransaction = guestTransactions.length > 0 
        ? guestTransactions[0].created_at 
        : null;
      
      return {
        guestId: guest.id,
        guestName: guest.name,
        guestEmail: guest.email,
        roomNumber: guest.room_number,
        totalCharges,
        totalPaid,
        balance,
        lastTransactionDate: lastTransaction ? new Date(lastTransaction) : null,
        paymentStatus: balance > 0 ? 'pending' : 'paid',
      };
    });
    
    // Calculate revenue metrics
    const totalCharges = allCharges.reduce((sum: number, c: any) => sum + c.amount, 0);
    const totalPending = allCharges.filter((c: any) => !c.paid).reduce((sum: number, c: any) => sum + c.amount, 0);
    const completedPayments = allTransactions.filter((t: any) => t.type === 'payment' && t.status === 'completed');
    const totalRevenue = completedPayments.reduce((sum, t) => sum + t.amount, 0);
    
    // Get recent transactions with guest info
    const recentTransactions = allTransactions.slice(0, 50).map(transaction => {
      const guest = guests.find(g => g.id === transaction.guest_id);
      return {
        id: transaction.id,
        guestId: transaction.guest_id,
        guestName: guest?.name || 'Unknown',
        roomNumber: guest?.room_number || null,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        stripeTransactionId: transaction.stripe_transaction_id,
        createdAt: new Date(transaction.created_at),
      };
    });
    
    // Calculate daily revenue for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentCompletedPayments = completedPayments.filter(t => 
      new Date(t.created_at) >= sevenDaysAgo
    );
    
    const dailyRevenueMap = new Map<string, number>();
    recentCompletedPayments.forEach(t => {
      const date = new Date(t.created_at).toISOString().split('T')[0];
      dailyRevenueMap.set(date, (dailyRevenueMap.get(date) || 0) + t.amount);
    });
    
    const dailyRevenue = Array.from(dailyRevenueMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => b.date.localeCompare(a.date));
    
    return NextResponse.json({
      apiFailures: apiFailures.length > 0 ? apiFailures : undefined,
      guestAccounts,
      revenueMetrics: {
        totalRevenue,
        totalPending,
        totalCharges,
        completedPayments: completedPayments.length,
        pendingPayments: allTransactions.filter(t => t.type === 'payment' && t.status === 'pending').length,
        failedPayments: allTransactions.filter(t => t.type === 'payment' && t.status === 'failed').length,
        collectionRate: totalCharges ? Math.round((totalRevenue / totalCharges) * 100) : 0,
      },
      recentTransactions,
      dailyRevenue,
    });
  } catch (error) {
    console.error('Manager billing API error:', error);
    return NextResponse.json(
      { 
        error: {
          code: 'BILLING_ERROR',
          message: 'Failed to fetch billing data',
          details: error instanceof Error ? error.message : 'Unknown error',
        }
      },
      { status: 500 }
    );
  }
}
