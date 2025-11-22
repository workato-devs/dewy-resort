/**
 * Database row mappers
 * Convert between database rows (snake_case) and application types (camelCase)
 */

import {
  User, UserRow,
  Room, RoomRow,
  RoomDevice, RoomDeviceRow,
  ServiceRequest, ServiceRequestRow,
  MaintenanceTask, MaintenanceTaskRow,
  Charge, ChargeRow,
  Transaction, TransactionRow,
  ChatMessage, ChatMessageRow,
  Session, SessionRow,
  UserRole, RoomType, RoomStatus, DeviceType,
  ServiceRequestType, Priority, ServiceRequestStatus,
  TaskPriority, MaintenanceTaskStatus,
  ChargeType, TransactionType, TransactionStatus, ChatRole
} from '@/types';
import { parseDate, intToBool } from './client';

/**
 * Map UserRow to User
 */
export function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
    roomNumber: row.room_number || undefined,
    createdAt: parseDate(row.created_at) || new Date(),
  };
}

/**
 * Map RoomRow to Room
 */
export function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    roomNumber: row.room_number,
    floor: row.floor,
    type: row.type as RoomType,
    status: row.status as RoomStatus,
    currentGuestId: row.current_guest_id || undefined,
  };
}

/**
 * Map RoomDeviceRow to RoomDevice
 */
export function mapRoomDevice(row: RoomDeviceRow): RoomDevice {
  return {
    id: row.id,
    roomId: row.room_id,
    type: row.type as DeviceType,
    name: row.name,
    state: row.state,
    homeAssistantEntityId: row.home_assistant_entity_id || undefined,
    useMock: intToBool(row.use_mock),
  };
}

/**
 * Map ServiceRequestRow to ServiceRequest
 */
export function mapServiceRequest(row: ServiceRequestRow): ServiceRequest {
  return {
    id: row.id,
    guestId: row.guest_id,
    roomNumber: row.room_number,
    type: row.type as ServiceRequestType,
    priority: row.priority as Priority,
    description: row.description,
    status: row.status as ServiceRequestStatus,
    salesforceTicketId: row.salesforce_ticket_id || undefined,
    createdAt: parseDate(row.created_at) || new Date(),
    completedAt: parseDate(row.completed_at),
  };
}

/**
 * Map MaintenanceTaskRow to MaintenanceTask
 */
export function mapMaintenanceTask(row: MaintenanceTaskRow): MaintenanceTask {
  return {
    id: row.id,
    roomId: row.room_id,
    title: row.title,
    description: row.description,
    priority: row.priority as TaskPriority,
    status: row.status as MaintenanceTaskStatus,
    assignedTo: row.assigned_to || undefined,
    createdBy: row.created_by,
    createdAt: parseDate(row.created_at) || new Date(),
    completedAt: parseDate(row.completed_at),
  };
}

/**
 * Map ChargeRow to Charge
 */
export function mapCharge(row: ChargeRow): Charge {
  return {
    id: row.id,
    guestId: row.guest_id,
    type: row.type as ChargeType,
    description: row.description,
    amount: row.amount,
    date: parseDate(row.date) || new Date(),
    paid: intToBool(row.paid),
  };
}

/**
 * Map TransactionRow to Transaction
 */
export function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    guestId: row.guest_id,
    amount: row.amount,
    type: row.type as TransactionType,
    status: row.status as TransactionStatus,
    stripeTransactionId: row.stripe_transaction_id || undefined,
    createdAt: parseDate(row.created_at) || new Date(),
  };
}

/**
 * Map ChatMessageRow to ChatMessage
 */
export function mapChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role as ChatRole,
    content: row.content,
    timestamp: parseDate(row.timestamp) || new Date(),
    metadata: row.metadata || undefined,
  };
}

/**
 * Map SessionRow to Session
 */
export function mapSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    expiresAt: parseDate(row.expires_at) || new Date(),
    createdAt: parseDate(row.created_at) || new Date(),
  };
}
