/**
 * GET /api/guest/service-requests/tokens
 * Retrieve idempotency tokens for guest's service requests
 * 
 * This endpoint allows the AI agent to lookup tracking references
 * for service requests associated with the authenticated guest.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireGuest } from '@/lib/auth/middleware';
import { executeQuery } from '@/lib/db/client';
import { ServiceRequestRow } from '@/types';
import { createErrorResponse } from '@/lib/errors/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await requireGuest(request);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Build query
    let query = `
      SELECT id, type, priority, description, status, 
             idempotency_token, salesforce_ticket_id, created_at
      FROM service_requests 
      WHERE guest_id = ?
    `;
    const params: any[] = [session.userId];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const requests = executeQuery<ServiceRequestRow>(query, params);
    
    // Format response with tracking information
    const trackingInfo = requests.map(req => ({
      id: req.id,
      type: req.type,
      description: req.description,
      status: req.status,
      idempotency_token: req.idempotency_token,
      salesforce_ticket_id: req.salesforce_ticket_id,
      created_at: req.created_at,
    }));
    
    return NextResponse.json({
      success: true,
      count: trackingInfo.length,
      requests: trackingInfo,
    });
    
  } catch (error) {
    return createErrorResponse(error, 'GET /api/guest/service-requests/tokens');
  }
}
