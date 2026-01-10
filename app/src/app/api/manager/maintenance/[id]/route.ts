import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/client';
import { mapMaintenanceTask } from '@/lib/db/mappers';
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
      const validStatuses = ['pending', 'assigned', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        );
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { error: 'Invalid priority value' },
          { status: 400 }
        );
      }
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
  } catch (error) {
    console.error('Error updating maintenance task:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance task' },
      { status: 500 }
    );
  }
}
