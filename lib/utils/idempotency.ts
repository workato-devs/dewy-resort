/**
 * Idempotency Token Utilities
 * 
 * Provides utilities for generating and managing idempotency tokens
 * to prevent duplicate submissions to external services (Workato/Salesforce).
 */

import { randomUUID } from 'crypto';
import { executeQueryOne } from '@/lib/db/client';
import { ServiceRequestRow, MaintenanceTaskRow, TransactionRow, BookingRow } from '@/types';

/**
 * Generates a unique idempotency token (UUID v4)
 * 
 * This token should be generated client-side or at the start of a request
 * and sent to external services to ensure duplicate requests are handled safely.
 * 
 * @returns A unique UUID string
 */
export function generateIdempotencyToken(): string {
  return randomUUID();
}

/**
 * Validates an idempotency token format
 * 
 * @param token - The token to validate
 * @returns true if the token is a valid UUID format
 */
export function isValidIdempotencyToken(token: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(token);
}

/**
 * Finds a service request by idempotency token
 * 
 * @param token - The idempotency token to search for
 * @returns The service request row if found, null otherwise
 */
export function findServiceRequestByToken(token: string): ServiceRequestRow | null {
  try {
    return executeQueryOne<ServiceRequestRow>(
      'SELECT * FROM service_requests WHERE idempotency_token = ?',
      [token]
    ) || null;
  } catch (error) {
    return null;
  }
}

/**
 * Finds a maintenance task by idempotency token
 * 
 * @param token - The idempotency token to search for
 * @returns The maintenance task row if found, null otherwise
 */
export function findMaintenanceTaskByToken(token: string): MaintenanceTaskRow | null {
  try {
    return executeQueryOne<MaintenanceTaskRow>(
      'SELECT * FROM maintenance_tasks WHERE idempotency_token = ?',
      [token]
    ) || null;
  } catch (error) {
    return null;
  }
}

/**
 * Finds a transaction by idempotency token
 * 
 * @param token - The idempotency token to search for
 * @returns The transaction row if found, null otherwise
 */
export function findTransactionByToken(token: string): TransactionRow | null {
  try {
    return executeQueryOne<TransactionRow>(
      'SELECT * FROM transactions WHERE idempotency_token = ?',
      [token]
    ) || null;
  } catch (error) {
    return null;
  }
}

/**
 * Finds a booking by idempotency token
 * 
 * @param token - The idempotency token to search for
 * @returns The booking row if found, null otherwise
 */
export function findBookingByToken(token: string): BookingRow | null {
  try {
    return executeQueryOne<BookingRow>(
      'SELECT * FROM bookings WHERE idempotency_token = ?',
      [token]
    ) || null;
  } catch (error) {
    return null;
  }
}
