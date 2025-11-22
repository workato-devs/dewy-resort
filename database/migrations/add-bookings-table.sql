-- Add bookings table for tracking reservations with idempotency tokens
-- This table caches booking metadata locally for quick token lookups
-- Salesforce is the source of truth for booking data

CREATE TABLE IF NOT EXISTS bookings (
  idempotency_token TEXT PRIMARY KEY,
  guest_id TEXT,
  room_id TEXT,
  opportunity_id TEXT,
  booking_number TEXT,
  check_in_date TEXT,
  check_out_date TEXT,
  number_of_guests INTEGER DEFAULT 1,
  special_requests TEXT,
  status TEXT CHECK(status IN ('reserved', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  salesforce_opportunity_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (guest_id) REFERENCES users(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- Index for guest lookups
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);

-- Index for room lookups
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in_date, check_out_date);
