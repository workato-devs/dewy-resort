/**
 * Contact Search API
 * Searches for contacts in Salesforce
 */

import { NextRequest, NextResponse } from 'next/server';
// @todo: Fix deprecated API - searchContacts method was removed from WorkatoClient
// when the legacy Salesforce API collection was deprecated in Dec 2025.
// This needs to be reimplemented using the new SalesforceClient.
// import { WorkatoClient } from '@/lib/workato/client';
// import { SearchCriteria } from '@/lib/workato/types';

export async function POST(request: NextRequest) {
  // @todo: Restore this implementation once searchContacts is available in new API
  return NextResponse.json(
    {
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Contact search is temporarily unavailable. This feature needs to be reimplemented with the new Salesforce API.',
      },
    },
    { status: 501 }
  );

  /* ORIGINAL CODE - COMMENTED OUT DUE TO DEPRECATED API
  try {
    const body = await request.json();
    const { query, fields, limit } = body;

    // Validate query parameter
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search query is required',
            fields: { query: 'Query must be a non-empty string' },
          },
        },
        { status: 400 }
      );
    }

    // Prepare search criteria
    const searchCriteria: SearchCriteria = {
      query: query.trim(),
      fields: fields || undefined,
      limit: limit || 50,
    };

    // Call Workato to search contacts
    const workatoClient = new WorkatoClient();
    const response = await workatoClient.searchContacts(searchCriteria);

    if (!response.success) {
      return NextResponse.json(
        {
          error: {
            code: 'SALESFORCE_ERROR',
            message: response.error || 'Failed to search contacts in Salesforce',
            correlationId: response.correlationId,
          },
        },
        { status: 500 }
      );
    }

    // Handle no results found
    if (!response.data || response.data.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          count: 0,
          message: 'No results found',
        },
        correlationId: response.correlationId,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        results: response.data,
        count: response.data.length,
      },
      correlationId: response.correlationId,
    });
  } catch (error) {
    console.error('Contact search API error:', error);
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
  */
}
