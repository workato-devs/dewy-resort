#!/usr/bin/env node

/**
 * Database initialization script
 * Creates the SQLite database and applies the schema
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'var', 'hotel.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'database', 'schema.sql');

function initDatabase() {
  try {
    console.log('🏨 Initializing Hotel Management Database...\n');

    // Ensure database directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('✓ Created database directory');
    }

    // Read schema file
    if (!fs.existsSync(SCHEMA_PATH)) {
      console.error('❌ Schema file not found at:', SCHEMA_PATH);
      process.exit(1);
    }

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    console.log('✓ Loaded schema file');

    // Create database connection
    const db = new Database(DB_PATH);
    console.log('✓ Connected to database');

    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    console.log('✓ Enabled foreign key constraints');

    // Execute schema
    db.exec(schema);
    console.log('✓ Applied database schema');

    // Verify tables were created
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `).all();

    console.log('\n📊 Created tables:');
    tables.forEach(table => {
      if (table.name !== 'sqlite_sequence') {
        console.log(`   - ${table.name}`);
      }
    });

    // Close connection
    db.close();
    console.log('\n✅ Database initialization complete!');
    console.log(`📁 Database location: ${DB_PATH}\n`);

  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

// Run initialization
initDatabase();
