import { NextRequest, NextResponse } from 'next/server';
import { isSalesforceEnabled } from '@/lib/workato/feature-flags';
import { getSalesforceClient } from '@/lib/workato/config';
import { getDatabase } from '@/lib/db/client';
import { mapMaintenanceTask } from '@/lib/db/mappers';
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
      
      const tasks = await client.searchMaintenanceTasks(criteria);
      
      return NextResponse.json({ tasks });
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
    return NextResponse.json(
      { error: 'Failed to fetch maintenance tasks' },
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
