-- Migration: Add use_mock flag to room_devices table
-- This allows mixing real and mock Home Assistant devices on a per-device basis

-- Add the use_mock column (defaults to false for backward compatibility)
ALTER TABLE room_devices ADD COLUMN use_mock BOOLEAN DEFAULT 0;

-- Add index for querying mock vs real devices
CREATE INDEX IF NOT EXISTS idx_room_devices_use_mock ON room_devices(use_mock);
