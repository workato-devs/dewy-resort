#!/usr/bin/env node

/**
 * Migration script to add Cognito token columns to sessions table
 * 
 * This script adds the following columns to the sessions table:
 * - cognito_id_token
 * - cognito_access_token
 * - cognito_refresh_token
 * 
 * Run this script after updating the codebase to support Bedrock integration.
 */

const Database = require('better-sqlite3');
const path = require('path');

// Script is now in scripts/migration/, so go up 2 levels to app root
const DB_PATH = path.join(__dirname, '../..', 'var', 'hotel.db');

function migrate() {
  console.log('Starting Cognito token migration...');
  console.log(`Database: ${DB_PATH}`);

  const db = new Database(DB_PATH);

  try {
    // Check if columns already exist
    const tableInfo = db.prepare('PRAGMA table_info(sessions)').all();
    const columnNames = tableInfo.map(col => col.name);

    const columnsToAdd = [
      { name: 'cognito_id_token', type: 'TEXT' },
      { name: 'cognito_access_token', type: 'TEXT' },
      { name: 'cognito_refresh_token', type: 'TEXT' },
    ];

    let addedColumns = 0;

    for (const column of columnsToAdd) {
      if (!columnNames.includes(column.name)) {
        console.log(`Adding column: ${column.name}`);
        db.prepare(`ALTER TABLE sessions ADD COLUMN ${column.name} ${column.type}`).run();
        addedColumns++;
      } else {
        console.log(`Column ${column.name} already exists, skipping`);
      }
    }

    if (addedColumns > 0) {
      console.log(`✓ Migration complete. Added ${addedColumns} column(s).`);
    } else {
      console.log('✓ No migration needed. All columns already exist.');
    }

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run migration
migrate();
