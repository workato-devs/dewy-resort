/**
 * Manager Dashboard API
 * Provides aggregated data for the manager dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeQueryOne } from '@/lib/db/client';
import { RoomRow, MaintenanceTaskRow, ServiceRequestRow } from '@/types';
import { SalesforceClient } from '@/lib/workato/salesforce-client';
import { getWorkatoSalesforceConfig } from '@/lib/workato/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters for service request filtering
    const statusFilter = searchParams.get('status')?.split(',') || undefined;
    const priorityFilter = searchParams.get('priority')?.split(',') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Track API failures
    const apiFailures: Array<{ source: string; error: string }> = [];
    
    // Get occupancy data - will be calculated from room statuses later
    let occupancyData: {
      total_rooms: number;
      occupied: number;
      vacant: number;
      cleaning: number;
      maintenance: number;
    } | null = null;

    // Get pending maintenance tasks - fetch from Salesforce if available
    let pendingTasks: Array<MaintenanceTaskRow & { room_number: string }> = [];
    let salesforceTasksFailed = false;
    
    // Try to fetch from Salesforce via SalesforceClient
    try {
      const salesforceConfig = getWorkatoSalesforceConfig();
      const salesforceClient = new SalesforceClient(salesforceConfig);
      
      // MIGRATION: Always pass type='Maintenance' filter (required by new API)
      // Note: Use Salesforce status values (New, Working, Escalated)
      const salesforceTasks = await salesforceClient.searchMaintenanceTasks({
        status: 'New' as any, // Salesforce status for new/pending tasks
      });
      
      // Fetch room numbers from local database
      const roomIds = salesforceTasks.map(t => t.room_id);
      let localRooms: Array<{ id: string; room_number: string }> = [];
      
      if (roomIds.length > 0) {
        const placeholders = roomIds.map(() => '?').join(',');
        localRooms = executeQuery<{ id: string; room_number: string }>(`
          SELECT id, room_number FROM rooms WHERE id IN (${placeholders})
        `, roomIds);
      }
      
      // Map Salesforce tasks to dashboard format
      pendingTasks = salesforceTasks
        .filter(t => ['pending', 'in_progress'].includes(t.status))
        .slice(0, 10)
        .map(sfTask => {
          const localRoom = localRooms.find(r => r.id === sfTask.room_id);
          return {
            id: sfTask.id,
            room_id: sfTask.room_id,
            room_number: localRoom?.room_number || 'Unknown',
            title: sfTask.title,
            description: sfTask.description,
            priority: sfTask.priority,
            status: sfTask.status,
            assigned_to: sfTask.assigned_to,
            created_by: sfTask.created_by,
            idempotency_token: null,
            created_at: sfTask.created_at,
            updated_at: sfTask.updated_at,
            completed_at: null,
          };
        });
    } catch (error) {
      salesforceTasksFailed = true;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Failed to fetch maintenance tasks from Salesforce, falling back to local data:', error);
      apiFailures.push({
        source: 'Salesforce Maintenance Tasks',
        error: errorMessage,
      });
    }
    
    // Fallback to local database ONLY if Salesforce API failed (not if it returned empty results)
    if (salesforceTasksFailed) {
      pendingTasks = executeQuery<MaintenanceTaskRow & { room_number: string }>(`
        SELECT 
          mt.*,
          r.room_number
        FROM maintenance_tasks mt
        JOIN rooms r ON mt.room_id = r.id
        WHERE mt.status IN ('pending', 'assigned', 'in_progress')
        ORDER BY 
          CASE mt.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          mt.created_at DESC
        LIMIT 10
      `, []);
    }

    // Get active service requests - fetch from Salesforce if available
    let serviceRequests: Array<ServiceRequestRow & { guest_name: string }> = [];
    let salesforceRequestsFailed = false;
    
    // Try to fetch from Salesforce via SalesforceClient
    try {
      const salesforceConfig = getWorkatoSalesforceConfig();
      const salesforceClient = new SalesforceClient(salesforceConfig);
      
      // MIGRATION: Always pass type='Service Request' filter (required by new API)
      // Note: Use Salesforce status values (New, Working, Escalated, Closed)
      const salesforceRequests = await salesforceClient.searchServiceRequests({
        status: statusFilter?.[0] as any, // Pass through user's filter (should be Salesforce status)
      });
      
      // Fetch local users to enrich with guest names
      const guestIds = salesforceRequests.map(sr => sr.guest_id);
      let localUsers: Array<{ id: string; name: string }> = [];
      
      if (guestIds.length > 0) {
        const placeholders = guestIds.map(() => '?').join(',');
        localUsers = executeQuery<{ id: string; name: string }>(`
          SELECT id, name FROM users WHERE id IN (${placeholders})
        `, guestIds);
      }
      
      // Map Salesforce service requests to dashboard format
      serviceRequests = salesforceRequests
        .filter(sr => !statusFilter || statusFilter.includes(sr.status))
        .filter(sr => !priorityFilter || priorityFilter.includes(sr.priority))
        .slice(offset, offset + limit)
        .map(sfRequest => {
          const localUser = localUsers.find(u => u.id === sfRequest.guest_id);
          return {
            id: sfRequest.id,
            guest_id: sfRequest.guest_id,
            guest_name: localUser?.name || 'Unknown',
            room_number: sfRequest.room_number,
            type: sfRequest.type,
            priority: sfRequest.priority,
            description: sfRequest.description,
            status: sfRequest.status,
            salesforce_ticket_id: sfRequest.salesforce_ticket_id,
            idempotency_token: null,
            created_at: sfRequest.created_at,
            updated_at: sfRequest.updated_at,
            completed_at: null,
          };
        });
    } catch (error) {
      salesforceRequestsFailed = true;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Failed to fetch service requests from Salesforce, falling back to local data:', error);
      apiFailures.push({
        source: 'Salesforce Service Requests',
        error: errorMessage,
      });
    }
    
    // Fallback to local database ONLY if Salesforce API failed (not if it returned empty results)
    if (salesforceRequestsFailed) {
      let query = `
        SELECT 
          sr.*,
          u.name as guest_name
        FROM service_requests sr
        JOIN users u ON sr.guest_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      
      // Apply status filter
      if (statusFilter && statusFilter.length > 0) {
        const placeholders = statusFilter.map(() => '?').join(',');
        query += ` AND sr.status IN (${placeholders})`;
        params.push(...statusFilter);
      } else {
        query += ` AND sr.status IN ('pending', 'in_progress')`;
      }
      
      // Apply priority filter
      if (priorityFilter && priorityFilter.length > 0) {
        const placeholders = priorityFilter.map(() => '?').join(',');
        query += ` AND sr.priority IN (${placeholders})`;
        params.push(...priorityFilter);
      }
      
      // Apply date range filter
      if (dateFrom) {
        query += ` AND sr.created_at >= ?`;
        params.push(dateFrom);
      }
      if (dateTo) {
        query += ` AND sr.created_at <= ?`;
        params.push(dateTo);
      }
      
      query += `
        ORDER BY 
          CASE sr.priority
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
          END,
          sr.created_at DESC
        LIMIT ? OFFSET ?
      `;
      params.push(limit, offset);
      
      serviceRequests = executeQuery<ServiceRequestRow & { guest_name: string }>(query, params);
    }

    // Get room statuses for grid - fetch from Salesforce if available
    let roomStatuses: Array<RoomRow & { guest_name: string | null }> = [];
    let salesforceRoomsFailed = false;
    
    // Try to fetch from Salesforce via SalesforceClient
    try {
      const salesforceConfig = getWorkatoSalesforceConfig();
      const salesforceClient = new SalesforceClient(salesforceConfig);
      
      // MIGRATION: The API requires at least one filter parameter
      // Since we need all rooms regardless of status, we'll make multiple calls
      // and combine the results (the API doesn't support OR queries or comma-separated values)
      const statuses: Array<'vacant' | 'occupied' | 'cleaning' | 'maintenance'> = [
        'vacant',
        'occupied', 
        'cleaning',
        'maintenance'
      ];
      
      const roomPromises = statuses.map(status => 
        salesforceClient.searchRooms({ status })
      );
      
      const roomResults = await Promise.all(roomPromises);
      const salesforceRooms = roomResults.flat();
      
      // Fetch local users to enrich with guest names
      const guestIds = salesforceRooms
        .map(r => r.current_guest_id)
        .filter((id): id is string => id !== null);
      
      let localUsers: Array<{ id: string; name: string }> = [];
      if (guestIds.length > 0) {
        const placeholders = guestIds.map(() => '?').join(',');
        localUsers = executeQuery<{ id: string; name: string }>(`
          SELECT id, name FROM users WHERE id IN (${placeholders})
        `, guestIds);
      }
      
      // Map Salesforce rooms to dashboard format
      roomStatuses = salesforceRooms.map(sfRoom => {
        const localUser = localUsers.find(u => u.id === sfRoom.current_guest_id);
        return {
          id: sfRoom.id,
          room_number: sfRoom.room_number,
          floor: sfRoom.floor,
          type: sfRoom.type,
          status: sfRoom.status,
          current_guest_id: sfRoom.current_guest_id,
          assigned_manager_id: sfRoom.assigned_manager_id,
          guest_name: localUser?.name || null,
          created_at: sfRoom.created_at,
          updated_at: sfRoom.updated_at,
        };
      });
    } catch (error) {
      salesforceRoomsFailed = true;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Failed to fetch rooms from Salesforce, falling back to local data:', error);
      apiFailures.push({
        source: 'Salesforce Rooms',
        error: errorMessage,
      });
    }
    
    // Fallback to local database ONLY if Salesforce API failed (not if it returned empty results)
    if (salesforceRoomsFailed) {
      roomStatuses = executeQuery<RoomRow & { guest_name: string | null }>(`
        SELECT 
          r.*,
          u.name as guest_name
        FROM rooms r
        LEFT JOIN users u ON r.current_guest_id = u.id
        ORDER BY r.room_number
      `, []);
    }

    // Calculate occupancy data from room statuses
    occupancyData = {
      total_rooms: roomStatuses.length,
      occupied: roomStatuses.filter(r => r.status === 'occupied').length,
      vacant: roomStatuses.filter(r => r.status === 'vacant').length,
      cleaning: roomStatuses.filter(r => r.status === 'cleaning').length,
      maintenance: roomStatuses.filter(r => r.status === 'maintenance').length,
    };

    // Calculate revenue metrics
    const revenueData = executeQueryOne<{
      total_revenue: number;
      pending_charges: number;
      completed_transactions: number;
    }>(`
      SELECT 
        COALESCE(SUM(CASE WHEN c.paid = 1 THEN c.amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN c.paid = 0 THEN c.amount ELSE 0 END), 0) as pending_charges,
        COALESCE((SELECT COUNT(*) FROM transactions WHERE status = 'completed'), 0) as completed_transactions
      FROM charges c
    `, []);

    // Get today's revenue
    const todayRevenue = executeQueryOne<{ today_revenue: number }>(`
      SELECT COALESCE(SUM(amount), 0) as today_revenue
      FROM transactions
      WHERE status = 'completed'
        AND type = 'payment'
        AND DATE(created_at) = DATE('now')
    `, []);

    // Only include API failures if SHOW_FALLBACK_ERRORS is enabled
    const shouldShowErrors = process.env.SHOW_FALLBACK_ERRORS === 'true';
    
    return NextResponse.json({
      apiFailures: shouldShowErrors && apiFailures.length > 0 ? apiFailures : undefined,
      occupancy: {
        totalRooms: occupancyData?.total_rooms || 0,
        occupied: occupancyData?.occupied || 0,
        vacant: occupancyData?.vacant || 0,
        cleaning: occupancyData?.cleaning || 0,
        maintenance: occupancyData?.maintenance || 0,
        occupancyRate: occupancyData?.total_rooms 
          ? Math.round((occupancyData.occupied / occupancyData.total_rooms) * 100)
          : 0,
      },
      pendingTasks: pendingTasks.map(task => ({
        id: task.id,
        roomId: task.room_id,
        roomNumber: task.room_number,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        assignedTo: task.assigned_to,
        createdBy: task.created_by,
        createdAt: new Date(task.created_at),
        completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
      })),
      serviceRequests: serviceRequests.map(request => ({
        id: request.id,
        guestId: request.guest_id,
        guestName: request.guest_name,
        roomNumber: request.room_number,
        type: request.type,
        priority: request.priority,
        description: request.description,
        status: request.status,
        salesforceTicketId: request.salesforce_ticket_id,
        createdAt: new Date(request.created_at),
        completedAt: request.completed_at ? new Date(request.completed_at) : undefined,
      })),
      roomStatuses: roomStatuses.map(room => ({
        id: room.id,
        roomNumber: room.room_number,
        floor: room.floor,
        type: room.type,
        status: room.status,
        currentGuestId: room.current_guest_id,
        guestName: room.guest_name,
      })),
      revenue: {
        totalRevenue: revenueData?.total_revenue || 0,
        pendingCharges: revenueData?.pending_charges || 0,
        completedTransactions: revenueData?.completed_transactions || 0,
        todayRevenue: todayRevenue?.today_revenue || 0,
      },
    });
  } catch (error) {
    console.error('Manager dashboard API error:', error);
    return NextResponse.json(
      { 
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Failed to fetch dashboard data',
          details: error instanceof Error ? error.message : 'Unknown error',
        }
      },
      { status: 500 }
    );
  }
}
