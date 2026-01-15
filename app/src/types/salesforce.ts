// Salesforce Integration Type Definitions

// ============================================================================
// Unified Case Types (Salesforce-aligned)
// ============================================================================

export interface Case {
  id: string;
  case_number: string;
  type: 'Maintenance' | 'Service Request';
  status: 'New' | 'Working' | 'Escalated' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  subject: string;
  description: string;
  room_id: string | null;
  room_number: string | null;
  contact_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  owner_id: string | null;
  created_date: string;
  last_modified_date: string;
  is_closed: boolean;
}

export interface CaseSearchCriteria {
  type?: 'Maintenance' | 'Service Request';
  status?: string;
  priority?: string;
  guest_email?: string;
  room_number?: string;
  assigned_to?: string;
  limit?: number;
}

// ============================================================================
// Room Entity Types
// ============================================================================

export enum RoomType {
  STANDARD = 'standard',
  DELUXE = 'deluxe',
  SUITE = 'suite',
}

export enum RoomStatus {
  VACANT = 'vacant',
  OCCUPIED = 'occupied',
  CLEANING = 'cleaning',
  MAINTENANCE = 'maintenance',
}

export interface Room {
  id: string;
  room_number: string;
  floor: number;
  type: RoomType;
  status: RoomStatus;
  current_guest_id: string | null;
  assigned_manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomSearchCriteria {
  status?: RoomStatus | string; // Allow string for comma-separated values
  floor?: number;
  type?: RoomType;
  assigned_manager_id?: string;
  current_guest_id?: string;
}

export interface RoomCreate {
  room_number: string;
  floor: number;
  type: RoomType;
  status: RoomStatus;
  assigned_manager_id?: string;
}

export interface RoomUpdate {
  status?: RoomStatus;
  current_guest_id?: string | null;
  assigned_manager_id?: string | null;
}

// ============================================================================
// Service Request Types
// ============================================================================

export enum ServiceRequestType {
  HOUSEKEEPING = 'housekeeping',
  ROOM_SERVICE = 'room_service',
  MAINTENANCE = 'maintenance',
  CONCIERGE = 'concierge',
}

export enum ServiceRequestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum ServiceRequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface ServiceRequest {
  id: string;
  guest_id: string;
  room_number: string;
  type: ServiceRequestType;
  priority: ServiceRequestPriority;
  description: string;
  status: ServiceRequestStatus;
  salesforce_ticket_id: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestCreate {
  idempotency_token?: string;
  guest_email: string;
  guest_first_name: string;
  guest_last_name: string;
  room_number: string;
  type: ServiceRequestType;
  priority: ServiceRequestPriority;
  description: string;
}

export interface ServiceRequestSearch {
  guest_id?: string; // Deprecated: use guest_email instead
  guest_email?: string; // Business identifier (preferred)
  room_number?: string;
  status?: ServiceRequestStatus;
  type?: ServiceRequestType;
}

export interface ServiceRequestUpdate {
  status?: ServiceRequestStatus;
  priority?: ServiceRequestPriority;
}

// ============================================================================
// Maintenance Task Types
// ============================================================================

export enum MaintenancePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum MaintenanceStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface MaintenanceTask {
  id: string;
  room_id: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceTaskCreate {
  idempotency_token?: string;
  room_id: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  created_by: string;
  assigned_to?: string;
}

export interface MaintenanceTaskSearch {
  room_id?: string; // Deprecated: use room_number instead
  room_number?: string; // Business identifier (preferred)
  status?: MaintenanceStatus;
  assigned_to?: string;
  priority?: MaintenancePriority;
}

export interface MaintenanceTaskUpdate {
  status?: MaintenanceStatus;
  assigned_to?: string | null;
  priority?: MaintenancePriority;
}

// ============================================================================
// Charge Entity Types
// ============================================================================

export enum ChargeType {
  ROOM = 'room',
  SERVICE = 'service',
  FOOD = 'food',
  OTHER = 'other',
}

export interface Charge {
  id: string;
  guest_id: string;
  type: ChargeType;
  description: string;
  amount: number;
  date: string;
  paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChargeCreate {
  guest_id: string;
  type: ChargeType;
  description: string;
  amount: number;
  date: string;
}

export interface ChargeSearch {
  guest_id?: string;
  type?: ChargeType;
  paid?: boolean;
  date_from?: string;
  date_to?: string;
}

export interface ChargeUpdate {
  paid?: boolean;
  amount?: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ListResponse<T> {
  items: T[];
  total: number;
  page?: number;
  per_page?: number;
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  correlationId: string;
}
