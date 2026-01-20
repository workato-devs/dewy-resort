import { NextRequest, NextResponse } from 'next/server';
import { isSalesforceEnabled } from '@/lib/workato/feature-flags';
import { getSalesforceClient } from '@/lib/workato/config';
import { getDatabase } from '@/lib/db/client';
import { mapMaintenanceTask, mapSalesforceMaintenanceTask } from '@/lib/db/mappers';
import { MaintenanceTaskRow } from '@/types';
import { generateIdempotencyToken } from '@/lib/utils/idempotency';

/**
 * GET /api/manager/maintenance
 * List all maintenance tasks with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    if (isSalesforceEnabled()) {
      // Use Salesforce via Workato
      const client = getSalesforceClient();
      
      // Build search criteria from query parameters
      const criteria: any = {};
      if (searchParams.get('status')) criteria.status = searchParams.get('status');
      if (searchParams.get('priority')) criteria.priority = searchParams.get('priority');
      if (searchParams.get('roomId')) criteria.room_id = searchParams.get('roomId');
      if (searchParams.get('assigned_to')) criteria.assigned_to = searchParams.get('assigned_to');
      
      // MIGRATION: Ensure at least one filter is provided
      // If no filters, default to New status to show active tasks
      // Note: Use Salesforce status values (New, Working, Escalated, Closed)
      if (!criteria.status && !criteria.priority && !criteria.room_id && !criteria.assigned_to) {
        criteria.status = 'New';
      }
      
      console.log('[Maintenance API] Searching with criteria:', criteria);
      
      const tasks = await client.searchMaintenanceTasks(criteria);
      
      console.log('[Maintenance API] Found tasks:', tasks.length);
      
      // Map Salesforce tasks to application format
      const mappedTasks = tasks.map(mapSalesforceMaintenanceTask);
      
      return NextResponse.json({ tasks: mappedTasks });
    } else {
      // Use local database (legacy behavior)
      const status = searchParams.get('status');
      const priority = searchParams.get('priority');
      const roomId = searchParams.get('roomId');

      const db = getDatabase();
      
      let query = 'SELECT * FROM maintenance_tasks';
      const conditions: string[] = [];
      const params: any[] = [];

      if (status) {
        conditions.push('status = ?');
        params.push(status);
      }

      if (priority) {
        conditions.push('priority = ?');
        params.push(priority);
      }

      if (roomId) {
        conditions.push('room_id = ?');
        params.push(roomId);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      const rows = db.prepare(query).all(...params) as MaintenanceTaskRow[];
      const tasks = rows.map(mapMaintenanceTask);

      return NextResponse.json({ tasks });
    }
  } catch (error) {
    console.error('Error fetching maintenance tasks:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch maintenance tasks';
    const errorDetails = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', errorDetails);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        tasks: [] // Return empty array so UI doesn't break
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/manager/maintenance
 * Create a new maintenance task
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, title, description, priority, assignedTo, createdBy } = body;

    // Validate required fields
    if (!roomId || !title || !description || !priority || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      );
    }

    if (isSalesforceEnabled()) {
      // Use Salesforce via Workato
      const client = getSalesforceClient();
      
      // Generate idempotency token to prevent duplicate submissions
      const idempotencyToken = generateIdempotencyToken();
      
      const task = await client.createMaintenanceTask({
        idempotency_token: idempotencyToken,
        room_id: roomId,
        title,
        description,
        priority,
        created_by: createdBy,
        assigned_to: assignedTo,
      });

      // Map Salesforce task to application format
      const mappedTask = mapSalesforceMaintenanceTask(task);

      // Send notification if task is assigned
      if (assignedTo) {
        try {
          const notificationResponse = await fetch(`${request.nextUrl.origin}/api/workato/twilio/send-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: assignedTo,
              message: `New maintenance task assigned: ${title} (Priority: ${priority})`,
              type: 'maintenance'
            })
          });

          if (notificationResponse.ok) {
            const notificationData = await notificationResponse.json();
            console.log('Notification sent:', notificationData.messageId);
          }
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
          // Don't fail the request if notification fails
        }
      }

      return NextResponse.json({ task: mappedTask }, { status: 201 });
    } else {
      // Use local database (legacy behavior)
      const db = getDatabase();
      
      // Generate task ID and idempotency token
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const idempotencyToken = generateIdempotencyToken();
      
      // Determine initial status
      const status = assignedTo ? 'assigned' : 'pending';

      // Insert task
      const stmt = db.prepare(`
        INSERT INTO maintenance_tasks (
          id, room_id, title, description, priority, status, assigned_to, created_by, idempotency_token
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(taskId, roomId, title, description, priority, status, assignedTo || null, createdBy, idempotencyToken);

      // Fetch the created task
      const taskRow = db.prepare('SELECT * FROM maintenance_tasks WHERE id = ?').get(taskId) as MaintenanceTaskRow;
      const task = mapMaintenanceTask(taskRow);

      // Send notification if task is assigned
      if (assignedTo) {
        try {
          const notificationResponse = await fetch(`${request.nextUrl.origin}/api/workato/twilio/send-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: assignedTo,
              message: `New maintenance task assigned: ${title} (Priority: ${priority})`,
              type: 'maintenance'
            })
          });

          if (notificationResponse.ok) {
            const notificationData = await notificationResponse.json();
            console.log('Notification sent:', notificationData.messageId);
          }
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
          // Don't fail the request if notification fails
        }
      }

      return NextResponse.json({ task }, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating maintenance task:', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance task' },
      { status: 500 }
    );
  }
}
