import { NextRequest, NextResponse } from 'next/server';
import { isSalesforceEnabled } from '@/lib/workato/feature-flags';
import { getSalesforceClient } from '@/lib/workato/config';
import { getDatabase } from '@/lib/db/client';
import { mapMaintenanceTask, mapSalesforceMaintenanceTask } from '@/lib/db/mappers';
import { MaintenanceTaskRow } from '@/types';

/**
 * PATCH /api/manager/maintenance/:id
 * Update a maintenance task
 */
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const body = await request.json();
    const { status, priority, assignedTo, completedAt } = body;

    // Validate status if provided
    if (status !== undefined) {
      const validStatuses = ['pending', 'assigned', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        );
      }
    }

    // Validate priority if provided
    if (priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { error: 'Invalid priority value' },
          { status: 400 }
        );
      }
    }

    if (isSalesforceEnabled()) {
      // Use Salesforce via Workato
      const client = getSalesforceClient();
      
      // Build update data
      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (priority !== undefined) updateData.priority = priority;
      if (assignedTo !== undefined) updateData.assigned_to = assignedTo;
      if (completedAt !== undefined) updateData.completed_at = completedAt;
      
      // If status is completed, set completed_at to now if not provided
      if (status === 'completed' && completedAt === undefined) {
        updateData.completed_at = new Date().toISOString();
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'No fields to update' },
          { status: 400 }
        );
      }

      // Get existing task to check for assignment changes
      const existingTasks = await client.searchMaintenanceTasks({ status: 'pending,in_progress,assigned,completed' });
      const existingTask = existingTasks.find((t: any) => t.id === id);

      const task = await client.updateMaintenanceTask(id, updateData);

      // Map Salesforce task to application format
      const mappedTask = mapSalesforceMaintenanceTask(task);

      // Send notification if task was newly assigned
      if (assignedTo && existingTask && assignedTo !== existingTask.assigned_to) {
        try {
          const notificationResponse = await fetch(`${request.nextUrl.origin}/api/workato/twilio/send-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: assignedTo,
              message: `Maintenance task assigned: ${mappedTask.title} (Priority: ${mappedTask.priority})`,
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

      return NextResponse.json({ task: mappedTask });
    } else {
      // Use local database (legacy behavior)
      const db = getDatabase();

      // Check if task exists
      const existingTask = db.prepare('SELECT * FROM maintenance_tasks WHERE id = ?').get(id) as MaintenanceTaskRow | undefined;
      
      if (!existingTask) {
        return NextResponse.json(
          { error: 'Maintenance task not found' },
          { status: 404 }
        );
      }

      // Build update query dynamically
      const updates: string[] = [];
      const params: any[] = [];

      if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
      }

      if (priority !== undefined) {
        updates.push('priority = ?');
        params.push(priority);
      }

      if (assignedTo !== undefined) {
        updates.push('assigned_to = ?');
        params.push(assignedTo || null);
      }

      if (completedAt !== undefined) {
        updates.push('completed_at = ?');
        params.push(completedAt);
      }

      // If status is completed, set completed_at to now if not provided
      if (status === 'completed' && completedAt === undefined) {
        updates.push('completed_at = ?');
        params.push(new Date().toISOString());
      }

      if (updates.length === 0) {
        return NextResponse.json(
          { error: 'No fields to update' },
          { status: 400 }
        );
      }

      // Add task ID to params
      params.push(id);

      // Execute update
      const updateQuery = `UPDATE maintenance_tasks SET ${updates.join(', ')} WHERE id = ?`;
      db.prepare(updateQuery).run(...params);

      // Fetch updated task
      const updatedTaskRow = db.prepare('SELECT * FROM maintenance_tasks WHERE id = ?').get(id) as MaintenanceTaskRow;
      const task = mapMaintenanceTask(updatedTaskRow);

      // Send notification if task was newly assigned
      if (assignedTo && assignedTo !== existingTask.assigned_to) {
        try {
          const notificationResponse = await fetch(`${request.nextUrl.origin}/api/workato/twilio/send-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: assignedTo,
              message: `Maintenance task assigned: ${existingTask.title} (Priority: ${task.priority})`,
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

      return NextResponse.json({ task });
    }
  } catch (error) {
    console.error('Error updating maintenance task:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance task' },
      { status: 500 }
    );
  }
}
