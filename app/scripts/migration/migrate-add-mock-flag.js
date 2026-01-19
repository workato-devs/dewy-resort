#!/usr/bin/env node

/**
 * Migration script to add use_mock column to room_devices table
 * Run this on existing databases to add the new feature
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Script is now in scripts/migration/, so go up 2 levels to app root
const DB_PATH = path.join(__dirname, '../..', 'var', 'hotel.db');
const MIGRATION_PATH = path.join(__dirname, '../..', 'database', 'migrations', 'add-mock-device-flag.sql');

async function runMigration() {
  try {
    console.log('🔄 Running migration: Add use_mock flag to room_devices\n');

    // Check if database exists
    if (!fs.existsSync(DB_PATH)) {
      console.error('❌ Database not found at:', DB_PATH);
      console.log('   Run "npm run db:init" first to create the database.');
      process.exit(1);
    }

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    // Check if column already exists
    const tableInfo = db.prepare('PRAGMA table_info(room_devices)').all();
    const hasUseMockColumn = tableInfo.some(col => col.name === 'use_mock');

    if (hasUseMockColumn) {
      console.log('✓ Column "use_mock" already exists in room_devices table');
      console.log('  No migration needed.\n');
      db.close();
      return;
    }

    console.log('📝 Adding use_mock column to room_devices table...');

    // Read and execute migration SQL
    const migrationSQL = fs.readFileSync(MIGRATION_PATH, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      db.prepare(statement).run();
    }

    console.log('✓ Migration completed successfully\n');

    // Verify the change
    const updatedTableInfo = db.prepare('PRAGMA table_info(room_devices)').all();
    const useMockColumn = updatedTableInfo.find(col => col.name === 'use_mock');
    
    if (useMockColumn) {
      console.log('✅ Verification successful:');
      console.log(`   - Column: ${useMockColumn.name}`);
      console.log(`   - Type: ${useMockColumn.type}`);
      console.log(`   - Default: ${useMockColumn.dflt_value}`);
      console.log(`   - Not Null: ${useMockColumn.notnull ? 'Yes' : 'No'}\n`);
    }

    // Show current device count
    const deviceCount = db.prepare('SELECT COUNT(*) as count FROM room_devices').get();
    console.log(`📊 Updated ${deviceCount.count} existing devices (all set to use_mock = 0 by default)\n`);

    db.close();

    console.log('💡 Next steps:');
    console.log('   - All existing devices default to real Home Assistant mode (use_mock = 0)');
    console.log('   - To mark specific devices as mock, update the database:');
    console.log('     sqlite3 database/hotel.db "UPDATE room_devices SET use_mock = 1 WHERE id = \'device-id\'"');
    console.log('   - Or modify scripts/seed-db.js to set useMock: true for specific devices\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
runMigration();
