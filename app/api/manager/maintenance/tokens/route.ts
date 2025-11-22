/**
 * GET /api/manager/maintenance/tokens
 * Retrieve idempotency tokens for maintenance tasks
 * 
 * This endpoint allows the AI agent to lookup tracking references
 * for maintenance tasks. Managers can query by room or status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireManager } from '@/lib/auth/middleware';
import { executeQuery } from '@/lib/db/client';
import { MaintenanceTaskRow } from '@/types';
import { createErrorResponse } from '@/lib/errors/api-response';

export async function GET(request: NextRequest) {
  try {
    await requireManager(request);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Build query
    let query = `
      SELECT id, room_id, title, description, priority, status, 
             assigned_to, created_by, idempotency_token, created_at
      FROM maintenance_tasks 
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (roomId) {
      query += ' AND room_id = ?';
      params.push(roomId);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (assignedTo) {
      query += ' AND assigned_to = ?';
      params.push(assignedTo);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const tasks = executeQuery<MaintenanceTaskRow>(query, params);
    
    // Format response with tracking information
    const trackingInfo = tasks.map(task => ({
      id: task.id,
      room_id: task.room_id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      assigned_to: task.assigned_to,
      idempotency_token: task.idempotency_token,
      created_at: task.created_at,
    }));
    
    return NextResponse.json({
      success: true,
      count: trackingInfo.length,
      tasks: trackingInfo,
    });
    
  } catch (error) {
    return createErrorResponse(error, 'GET /api/manager/maintenance/tokens');
  }
}
