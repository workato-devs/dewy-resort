-- Migration: Add housekeeping and maintenance roles
-- Date: 2024-11-14
-- Description: Updates the users table to support housekeeping and maintenance staff roles

-- SQLite doesn't support ALTER TABLE ... MODIFY COLUMN with CHECK constraints
-- We need to recreate the table with the new constraint

-- Disable foreign key constraints temporarily
PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- Step 1: Create a new users table with updated role constraint
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('guest', 'manager', 'housekeeping', 'maintenance')),
  room_number TEXT,
  salesforce_contact_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

-- Step 2: Copy existing data from old table
INSERT INTO users_new (id, email, password_hash, name, role, room_number, salesforce_contact_id, created_at, updated_at)
SELECT id, email, password_hash, name, role, room_number, salesforce_contact_id, created_at, updated_at
FROM users;

-- Step 3: Drop the old table
DROP TABLE users;

-- Step 4: Rename the new table to users
ALTER TABLE users_new RENAME TO users;

-- Step 5: Recreate indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_room_number ON users(room_number);

COMMIT;

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Migration complete
