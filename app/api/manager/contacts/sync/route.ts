/**
 * Contact Sync API
 * Synchronizes user data with Salesforce Contacts
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQueryOne, executeUpdate } from '@/lib/db/client';
import { WorkatoClient } from '@/lib/workato/client';
import { ContactData } from '@/lib/workato/types';

interface UserRow {
  id: string;
  email: string;
  name: string;
  room_number: string | null;
  salesforce_contact_id: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID is required',
            fields: { userId: 'User ID is required' },
          },
        },
        { status: 400 }
      );
    }

    // Fetch user from local database
    const user = executeQueryOne<UserRow>(
      'SELECT id, email, name, room_number, salesforce_contact_id FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      );
    }

    // Split name into first and last name
    const nameParts = user.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';

    // Prepare contact data
    const contactData: ContactData = {
      firstName,
      lastName,
      email: user.email,
      roomNumber: user.room_number || undefined,
    };

    // Call Workato to upsert contact
    const workatoClient = new WorkatoClient();
    const response = await workatoClient.upsertContact(contactData);

    if (!response.success || !response.data) {
      return NextResponse.json(
        {
          error: {
            code: 'SALESFORCE_ERROR',
            message: response.error || 'Failed to sync contact with Salesforce',
            correlationId: response.correlationId,
          },
        },
        { status: 500 }
      );
    }

    // Store Salesforce Contact ID in local database
    executeUpdate(
      'UPDATE users SET salesforce_contact_id = ? WHERE id = ?',
      [response.data.id, userId]
    );

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        salesforceContactId: response.data.id,
        email: response.data.email,
        name: response.data.name,
      },
      correlationId: response.correlationId,
    });
  } catch (error) {
    console.error('Contact sync API error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'SYNC_ERROR',
          message: 'Failed to synchronize contact',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
