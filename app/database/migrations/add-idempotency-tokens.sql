-- Add idempotency_token columns for tracking external service requests
-- Migration: add-idempotency-tokens.sql
-- Date: 2025-11-21

-- Add idempotency_token to service_requests table
ALTER TABLE service_requests ADD COLUMN idempotency_token TEXT;

-- Add idempotency_token to maintenance_tasks table
ALTER TABLE maintenance_tasks ADD COLUMN idempotency_token TEXT;

-- Add idempotency_token to transactions table (for Stripe payment idempotency)
ALTER TABLE transactions ADD COLUMN idempotency_token TEXT;

-- Create unique indexes for fast lookups and uniqueness constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_requests_idempotency_token 
  ON service_requests(idempotency_token) WHERE idempotency_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_tasks_idempotency_token 
  ON maintenance_tasks(idempotency_token) WHERE idempotency_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency_token 
  ON transactions(idempotency_token) WHERE idempotency_token IS NOT NULL;
