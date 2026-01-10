// Core type definitions for the hotel management system

export type UserRole = 'guest' | 'manager' | 'housekeeping' | 'maintenance';
export type RoomType = 'standard' | 'deluxe' | 'suite';
export type RoomStatus = 'vacant' | 'occupied' | 'cleaning' | 'maintenance';
export type DeviceType = 'light' | 'thermostat' | 'blinds';
export type ServiceRequestType = 'housekeeping' | 'room_service' | 'maintenance' | 'concierge';
export type Priority = 'low' | 'medium' | 'high';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ServiceRequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type MaintenanceTaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';
export type ChargeType = 'room' | 'service' | 'food' | 'other';
export type TransactionType = 'charge' | 'payment' | 'refund';
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type ChatRole = 'user' | 'assistant';

// User & Authentication
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roomNumber?: string;
  createdAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

// Room Management
export interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  type: RoomType;
  status: RoomStatus;
  currentGuestId?: string;
}

export interface RoomDevice {
  id: string;
  roomId: string;
  type: DeviceType;
  name: string;
  state: string;
  homeAssistantEntityId?: string;
  useMock: boolean;
}

// Service Requests
export interface ServiceRequest {
  id: string;
  guestId: string;
  roomNumber: string;
  type: ServiceRequestType;
  priority: Priority;
  description: string;
  status: ServiceRequestStatus;
  salesforceTicketId?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Maintenance Tasks
export interface MaintenanceTask {
  id: string;
  roomId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: MaintenanceTaskStatus;
  assignedTo?: string;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}

// Billing
export interface Charge {
  id: string;
  guestId: string;
  type: ChargeType;
  description: string;
  amount: number;
  date: Date;
  paid: boolean;
}

export interface Transaction {
  id: string;
  guestId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  stripeTransactionId?: string;
  createdAt: Date;
}

// Chat
export interface ChatMessage {
  id: string;
  userId: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  metadata?: string;
}

// Database row types (snake_case from database)
export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  role: string;
  room_number: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface RoomRow {
  id: string;
  room_number: string;
  floor: number;
  type: string;
  status: string;
  current_guest_id: string | null;
}

export interface RoomDeviceRow {
  id: string;
  room_id: string;
  type: string;
  name: string;
  state: string;
  home_assistant_entity_id: string | null;
  use_mock: number;
}

export interface ServiceRequestRow {
  id: string;
  guest_id: string;
  room_number: string;
  type: string;
  priority: string;
  description: string;
  status: string;
  salesforce_ticket_id: string | null;
  idempotency_token: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface MaintenanceTaskRow {
  id: string;
  room_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_by: string;
  idempotency_token: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ChargeRow {
  id: string;
  guest_id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  paid: number;
}

export interface TransactionRow {
  id: string;
  guest_id: string;
  amount: number;
  type: string;
  status: string;
  stripe_transaction_id: string | null;
  idempotency_token: string | null;
  created_at: string;
}

export interface BookingRow {
  id: string;
  guest_id: string | null;
  room_id: string | null;
  opportunity_id: string | null;
  booking_number: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  number_of_guests: number;
  special_requests: string | null;
  status: string;
  idempotency_token: string;
  salesforce_booking_id: string | null;
  salesforce_opportunity_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ChatMessageRow {
  id: string;
  user_id: string;
  role: string;
  content: string;
  timestamp: string;
  metadata: string | null;
}

export interface SessionRow {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
  okta_session_id: string | null;
  is_okta_session: number;
  cognito_id_token: string | null;
  cognito_access_token: string | null;
  cognito_refresh_token: string | null;
}

// ============================================================================
// Salesforce Integration Types
// ============================================================================

export * from './salesforce';
