/**
 * Guest Billing API
 * GET /api/guest/billing
 * Fetches all charges for the authenticated guest with totals
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isSalesforceEnabled } from '@/lib/workato/feature-flags';
import { getSalesforceClient } from '@/lib/workato/config';
import { executeQueryOne, executeQuery } from '@/lib/db/client';
import { mapUser, mapCharge } from '@/lib/db/mappers';
import { UserRow, ChargeRow, User, Charge } from '@/types';

interface BillingData {
  guest: User;
  charges: Charge[];
  subtotal: number;
  tax: number;
  total: number;
}

const TAX_RATE = 0.10; // 10% tax rate

export async function GET(request: NextRequest) {
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

    let charges: Charge[];

    if (isSalesforceEnabled()) {
      // Use Salesforce via Workato
      const client = getSalesforceClient();
      charges = await client.searchCharges({ guest_id: guest.id });
    } else {
      // Use local database (legacy behavior)
      const chargesQuery = `
        SELECT * FROM charges 
        WHERE guest_id = ? 
        ORDER BY date DESC
      `;
      const chargeRows = executeQuery<ChargeRow>(chargesQuery, [guest.id]);
      charges = chargeRows.map(mapCharge);
    }

    // Calculate totals
    const subtotal = charges.reduce((sum, charge) => sum + charge.amount, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    const billingData: BillingData = {
      guest,
      charges,
      subtotal,
      tax,
      total,
    };

    return NextResponse.json(billingData);

  } catch (error) {
    console.error('Billing API error:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch billing data',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}
