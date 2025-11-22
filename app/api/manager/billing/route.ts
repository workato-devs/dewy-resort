/**
 * Manager Billing API
 * Provides billing overview for all guest accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { isSalesforceEnabled } from '@/lib/workato/feature-flags';
import { getSalesforceClient } from '@/lib/workato/config';
import { executeQuery, executeQueryOne } from '@/lib/db/client';
import { ChargeRow, TransactionRow, UserRow } from '@/types';

export async function GET(request: NextRequest) {
  try {
    if (isSalesforceEnabled()) {
      // Use Salesforce via Workato for charges
      const client = getSalesforceClient();
      
      // Get all guests from local database (users are still managed locally/OKTA)
      const guests = executeQuery<UserRow>(`
        SELECT * FROM users WHERE role = 'guest' ORDER BY room_number
      `, []);
      
      // Get all charges from Salesforce
      const allCharges = await client.searchCharges({});
      
      // Transactions are still in local database (Stripe integration)
      const allTransactions = executeQuery<TransactionRow>(`
        SELECT * FROM transactions ORDER BY created_at DESC
      `, []);
      
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
    } else {
      // Use local database (legacy behavior)
      const guestAccounts = executeQuery<{
        guest_id: string;
        guest_name: string;
        guest_email: string;
        room_number: string | null;
        total_charges: number;
        total_paid: number;
        balance: number;
        last_transaction_date: string | null;
      }>(`
        SELECT 
          u.id as guest_id,
          u.name as guest_name,
          u.email as guest_email,
          u.room_number,
          COALESCE(SUM(c.amount), 0) as total_charges,
          COALESCE(SUM(CASE WHEN c.paid = 1 THEN c.amount ELSE 0 END), 0) as total_paid,
          COALESCE(SUM(CASE WHEN c.paid = 0 THEN c.amount ELSE 0 END), 0) as balance,
          (SELECT MAX(t.created_at) FROM transactions t WHERE t.guest_id = u.id) as last_transaction_date
        FROM users u
        LEFT JOIN charges c ON u.id = c.guest_id
        WHERE u.role = 'guest'
        GROUP BY u.id, u.name, u.email, u.room_number
        ORDER BY u.room_number
      `, []);

      const revenueMetrics = executeQueryOne<{
        total_revenue: number;
        total_pending: number;
        total_charges: number;
        completed_payments: number;
        pending_payments: number;
        failed_payments: number;
      }>(`
        SELECT 
          COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'payment' AND status = 'completed'), 0) as total_revenue,
          COALESCE((SELECT SUM(amount) FROM charges WHERE paid = 0), 0) as total_pending,
          COALESCE((SELECT SUM(amount) FROM charges), 0) as total_charges,
          COALESCE((SELECT COUNT(*) FROM transactions WHERE type = 'payment' AND status = 'completed'), 0) as completed_payments,
          COALESCE((SELECT COUNT(*) FROM transactions WHERE type = 'payment' AND status = 'pending'), 0) as pending_payments,
          COALESCE((SELECT COUNT(*) FROM transactions WHERE type = 'payment' AND status = 'failed'), 0) as failed_payments
      `, []);

      const recentTransactions = executeQuery<TransactionRow & { 
        guest_name: string;
        room_number: string | null;
      }>(`
        SELECT 
          t.*,
          u.name as guest_name,
          u.room_number
        FROM transactions t
        JOIN users u ON t.guest_id = u.id
        ORDER BY t.created_at DESC
        LIMIT 50
      `, []);

      const dailyRevenue = executeQuery<{
        date: string;
        revenue: number;
      }>(`
        SELECT 
          DATE(created_at) as date,
          SUM(amount) as revenue
        FROM transactions
        WHERE type = 'payment' 
          AND status = 'completed'
          AND created_at >= DATE('now', '-7 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, []);

      return NextResponse.json({
        guestAccounts: guestAccounts.map(account => ({
          guestId: account.guest_id,
          guestName: account.guest_name,
          guestEmail: account.guest_email,
          roomNumber: account.room_number,
          totalCharges: account.total_charges,
          totalPaid: account.total_paid,
          balance: account.balance,
          lastTransactionDate: account.last_transaction_date 
            ? new Date(account.last_transaction_date) 
            : null,
          paymentStatus: account.balance > 0 ? 'pending' : 'paid',
        })),
        revenueMetrics: {
          totalRevenue: revenueMetrics?.total_revenue || 0,
          totalPending: revenueMetrics?.total_pending || 0,
          totalCharges: revenueMetrics?.total_charges || 0,
          completedPayments: revenueMetrics?.completed_payments || 0,
          pendingPayments: revenueMetrics?.pending_payments || 0,
          failedPayments: revenueMetrics?.failed_payments || 0,
          collectionRate: revenueMetrics?.total_charges 
            ? Math.round((revenueMetrics.total_revenue / revenueMetrics.total_charges) * 100)
            : 0,
        },
        recentTransactions: recentTransactions.map(transaction => ({
          id: transaction.id,
          guestId: transaction.guest_id,
          guestName: transaction.guest_name,
          roomNumber: transaction.room_number,
          amount: transaction.amount,
          type: transaction.type,
          status: transaction.status,
          stripeTransactionId: transaction.stripe_transaction_id,
          createdAt: new Date(transaction.created_at),
        })),
        dailyRevenue: dailyRevenue.map(day => ({
          date: day.date,
          revenue: day.revenue,
        })),
      });
    }
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
