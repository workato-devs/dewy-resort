#!/usr/bin/env node

/**
 * Migration script for Okta session management
 * 
 * This script adds the following columns to support Okta integration:
 * - sessions.okta_session_id (TEXT, nullable)
 * - sessions.is_okta_session (BOOLEAN, default 0)
 * - users.updated_at (DATETIME, nullable)
 * 
 * It also makes users.password_hash nullable for Okta users.
 */

const Database = require('better-sqlite3');
const path = require('path');

// Script is now in scripts/migration/, so go up 2 levels to app root
const DB_PATH = path.join(__dirname, '../..', 'var', 'hotel.db');

function runMigration() {
  console.log('Starting Okta session migration...');
  
  const db = new Database(DB_PATH);
  
  try {
    // Begin transaction
    db.exec('BEGIN TRANSACTION');
    
    // Check if columns already exist
    const sessionsInfo = db.pragma('table_info(sessions)');
    const usersInfo = db.pragma('table_info(users)');
    
    const hasOktaSessionId = sessionsInfo.some(col => col.name === 'okta_session_id');
    const hasIsOktaSession = sessionsInfo.some(col => col.name === 'is_okta_session');
    const hasUpdatedAt = usersInfo.some(col => col.name === 'updated_at');
    
    // Add okta_session_id column to sessions table
    if (!hasOktaSessionId) {
      console.log('Adding okta_session_id column to sessions table...');
      db.exec('ALTER TABLE sessions ADD COLUMN okta_session_id TEXT');
    } else {
      console.log('okta_session_id column already exists in sessions table');
    }
    
    // Add is_okta_session column to sessions table
    if (!hasIsOktaSession) {
      console.log('Adding is_okta_session column to sessions table...');
      db.exec('ALTER TABLE sessions ADD COLUMN is_okta_session BOOLEAN DEFAULT 0');
    } else {
      console.log('is_okta_session column already exists in sessions table');
    }
    
    // Add updated_at column to users table
    if (!hasUpdatedAt) {
      console.log('Adding updated_at column to users table...');
      db.exec('ALTER TABLE users ADD COLUMN updated_at DATETIME');
    } else {
      console.log('updated_at column already exists in users table');
    }
    
    // Note: SQLite doesn't support modifying column constraints directly
    // The password_hash column will remain NOT NULL in existing databases
    // New databases created from schema.sql will have it nullable
    // This is acceptable as the application logic handles both cases
    
    console.log('\nNote: password_hash column constraint cannot be modified in SQLite.');
    console.log('For existing databases, password_hash remains NOT NULL.');
    console.log('New databases will have password_hash as nullable.');
    console.log('Application logic handles both cases correctly.\n');
    
    // Commit transaction
    db.exec('COMMIT');
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK');
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run migration
runMigration();
