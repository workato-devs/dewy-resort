-- Hotel Management System Database Schema
-- SQLite Database Schema for demo application

-- Users table
CREATE TABLE IF NOT EXISTS users (
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

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  room_number TEXT UNIQUE NOT NULL,
  floor INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('standard', 'deluxe', 'suite')),
  status TEXT NOT NULL CHECK(status IN ('vacant', 'occupied', 'cleaning', 'maintenance')),
  current_guest_id TEXT,
  FOREIGN KEY (current_guest_id) REFERENCES users(id)
);

-- Room devices table
CREATE TABLE IF NOT EXISTS room_devices (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('light', 'thermostat', 'blinds')),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  home_assistant_entity_id TEXT,
  use_mock BOOLEAN DEFAULT 0,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- Service requests table
CREATE TABLE IF NOT EXISTS service_requests (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL,
  room_number TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('housekeeping', 'room_service', 'maintenance', 'concierge')),
  priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high')),
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  salesforce_ticket_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (guest_id) REFERENCES users(id)
);

-- Maintenance tasks table
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'assigned', 'in_progress', 'completed')),
  assigned_to TEXT,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Charges table
CREATE TABLE IF NOT EXISTS charges (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('room', 'service', 'food', 'other')),
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid BOOLEAN DEFAULT 0,
  FOREIGN KEY (guest_id) REFERENCES users(id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('charge', 'payment', 'refund')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed')),
  stripe_transaction_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES users(id)
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  okta_session_id TEXT,
  is_okta_session BOOLEAN DEFAULT 0,
  cognito_id_token TEXT,
  cognito_access_token TEXT,
  cognito_refresh_token TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_room_number ON users(room_number);

CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_current_guest ON rooms(current_guest_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);

CREATE INDEX IF NOT EXISTS idx_room_devices_room_id ON room_devices(room_id);
CREATE INDEX IF NOT EXISTS idx_room_devices_use_mock ON room_devices(use_mock);

CREATE INDEX IF NOT EXISTS idx_service_requests_guest_id ON service_requests(guest_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_room_number ON service_requests(room_number);

CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_room_id ON maintenance_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status ON maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_assigned_to ON maintenance_tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_charges_guest_id ON charges(guest_id);
CREATE INDEX IF NOT EXISTS idx_charges_paid ON charges(paid);

CREATE INDEX IF NOT EXISTS idx_transactions_guest_id ON transactions(guest_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
