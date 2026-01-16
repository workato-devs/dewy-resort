/**
 * Contact Search API
 * Searches for contacts in Salesforce using the new SalesforceClient
 * Falls back to local SQLite database when Salesforce is unavailable
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceClient } from '@/lib/workato/config';
import { ContactSearchCriteria } from '@/types/salesforce';
import { WorkatoSalesforceError } from '@/lib/workato/errors';
import { executeQuery } from '@/lib/db/client';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  room_number: string | null;
  salesforce_contact_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, email, contact_type, limit } = body;

    // Validate that at least one search parameter is provided
    if (!query && !email && !contact_type) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one search parameter is required',
            fields: { 
              query: 'Provide a search term (name or email)',
              email: 'Or provide an exact email address',
              contact_type: 'Or provide a contact type (Guest, Manager, Vendor)'
            },
          },
        },
        { status: 400 }
      );
    }

    // Prepare search criteria
    const searchCriteria: ContactSearchCriteria = {
      query: query?.trim() || undefined,
      email: email?.trim() || undefined,
      contact_type: contact_type || undefined,
      limit: limit || 10,
    };

    // Try to get Salesforce client and search contacts
    try {
      const client = getSalesforceClient();
      const contacts = await client.searchContacts(searchCriteria);

      // Return results
      return NextResponse.json({
        success: true,
        contacts: contacts,
        count: contacts.length,
      });
    } catch (salesforceError) {
      // If Salesforce fails, fall back to local database
      console.warn('Salesforce contact search failed, using local database:', salesforceError);
      
      // Build SQL query based on search criteria
      let sql = `
        SELECT 
          id,
          email,
          name,
          role,
          room_number,
          salesforce_contact_id,
          created_at,
          updated_at
        FROM users
        WHERE 1=1
      `;
      const params: any[] = [];

      // Add search conditions
      if (searchCriteria.query) {
        sql += ` AND (name LIKE ? OR email LIKE ?)`;
        const searchPattern = `%${searchCriteria.query}%`;
        params.push(searchPattern, searchPattern);
      }

      if (searchCriteria.email) {
        sql += ` AND email = ?`;
        params.push(searchCriteria.email);
      }

      if (searchCriteria.contact_type) {
        // Map Salesforce contact types to user roles
        const roleMap: Record<string, string> = {
          'Guest': 'guest',
          'Manager': 'manager',
          'Vendor': 'maintenance', // Map vendor to maintenance role
        };
        const role = roleMap[searchCriteria.contact_type] || searchCriteria.contact_type.toLowerCase();
        sql += ` AND role = ?`;
        params.push(role);
      }

      // Add ordering and limit
      sql += ` ORDER BY name ASC`;
      if (searchCriteria.limit) {
        sql += ` LIMIT ?`;
        params.push(searchCriteria.limit);
      }

      // Execute query
      const users = executeQuery<UserRow>(sql, params);

      // Transform database results to Contact format
      const contacts = users.map(user => {
        // Split name into first and last name
        const nameParts = user.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Map role to contact type
        const roleToContactType: Record<string, string> = {
          'guest': 'Guest',
          'manager': 'Manager',
          'housekeeping': 'Manager',
          'maintenance': 'Vendor',
        };

        return {
          id: user.salesforce_contact_id || user.id,
          first_name: firstName,
          last_name: lastName,
          email: user.email,
          phone: undefined, // Not stored in local database
          contact_type: roleToContactType[user.role] || 'Guest',
          loyalty_number: undefined, // Not stored in local database
          account_name: undefined, // Not stored in local database
        };
      });

      return NextResponse.json({
        success: true,
        contacts: contacts,
        count: contacts.length,
        usingFallback: true,
        fallbackReason: salesforceError instanceof Error ? salesforceError.message : 'Salesforce API unavailable',
      });
    }

  } catch (error) {
    console.error('Contact search API error:', error);

    // Handle WorkatoSalesforceError
    if (error instanceof WorkatoSalesforceError) {
      return NextResponse.json(
        {
          error: {
            code: 'SALESFORCE_ERROR',
            message: error.message,
            correlationId: error.correlationId,
          },
        },
        { status: error.statusCode }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      {
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to search contacts',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
