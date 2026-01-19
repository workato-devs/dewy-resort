#!/usr/bin/env node

/**
 * Database verification script
 * Tests that the database is properly initialized and seeded
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'var', 'hotel.db');

function verifyDatabase() {
  try {
    console.log('🔍 Verifying database...\n');

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    // Check users
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log(`✓ Users: ${userCount.count}`);

    // Check rooms
    const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get();
    console.log(`✓ Rooms: ${roomCount.count}`);

    // Check room devices
    const deviceCount = db.prepare('SELECT COUNT(*) as count FROM room_devices').get();
    console.log(`✓ Room Devices: ${deviceCount.count}`);

    // Check service requests
    const requestCount = db.prepare('SELECT COUNT(*) as count FROM service_requests').get();
    console.log(`✓ Service Requests: ${requestCount.count}`);

    // Check maintenance tasks
    const taskCount = db.prepare('SELECT COUNT(*) as count FROM maintenance_tasks').get();
    console.log(`✓ Maintenance Tasks: ${taskCount.count}`);

    // Check charges
    const chargeCount = db.prepare('SELECT COUNT(*) as count FROM charges').get();
    console.log(`✓ Charges: ${chargeCount.count}`);

    // Check transactions
    const transactionCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
    console.log(`✓ Transactions: ${transactionCount.count}`);

    // Check chat messages
    const messageCount = db.prepare('SELECT COUNT(*) as count FROM chat_messages').get();
    console.log(`✓ Chat Messages: ${messageCount.count}`);

    // Test a join query
    const occupiedRooms = db.prepare(`
      SELECT r.room_number, u.name, u.email
      FROM rooms r
      JOIN users u ON r.current_guest_id = u.id
      WHERE r.status = 'occupied'
      LIMIT 3
    `).all();

    console.log('\n📋 Sample occupied rooms:');
    occupiedRooms.forEach(room => {
      console.log(`   Room ${room.room_number}: ${room.name} (${room.email})`);
    });

    db.close();
    console.log('\n✅ Database verification successful!\n');

  } catch (error) {
    console.error('\n❌ Database verification failed:', error.message);
    process.exit(1);
  }
}

verifyDatabase();
