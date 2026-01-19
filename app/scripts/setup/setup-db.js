#!/usr/bin/env node

/**
 * Complete Database Setup Script
 * 
 * This script performs all database setup in one command:
 * 1. Creates database and applies schema
 * 2. Runs all migrations
 * 3. Seeds with demo data
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Script is now in scripts/setup/, so go up 2 levels to app root
const DB_PATH = path.join(__dirname, '../..', 'var', 'hotel.db');
const SCHEMA_PATH = path.join(__dirname, '../..', 'database', 'schema.sql');
const MIGRATIONS_DIR = path.join(__dirname, '../..', 'database', 'migrations');

// Helper to generate UUID
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper to get random item from array
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper to get random number in range
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper to get date offset
function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function setupDatabase() {
  try {
    console.log('🏨 Complete Database Setup\n');

    // Step 1: Initialize schema
    console.log('📋 Step 1: Initializing database schema...');
    
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    if (!fs.existsSync(SCHEMA_PATH)) {
      throw new Error(`Schema file not found: ${SCHEMA_PATH}`);
    }

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    db.exec(schema);
    console.log('✓ Database schema applied\n');

    // Step 2: Run migrations
    console.log('🔄 Step 2: Running migrations...');
    
    const migrations = [
      'add-idempotency-tokens.sql',
      'add-salesforce-case-id.sql',
      'add-bookings-table.sql'
    ];

    for (const migration of migrations) {
      const migrationPath = path.join(MIGRATIONS_DIR, migration);
      if (fs.existsSync(migrationPath)) {
        const sql = fs.readFileSync(migrationPath, 'utf-8');
        try {
          db.exec(sql);
          console.log(`   ✓ Applied: ${migration}`);
        } catch (error) {
          // Ignore duplicate column errors
          if (!error.message.includes('duplicate column')) {
            throw error;
          }
          console.log(`   ⊘ Skipped: ${migration} (already applied)`);
        }
      }
    }
    console.log('✓ Migrations complete\n');

    // Step 3: Seed data
    console.log('🌱 Step 3: Seeding demo data...');
    
    // Hash password for all users
    const passwordHash = await bcrypt.hash('Hotel2026!', 10);

    // Create managers
    console.log('\n👥 Creating users...');
    const managerIds = [];
    const guestIds = [];

    const managers = [
      { id: generateId(), email: 'manager1@hotel.com', name: 'Sarah Johnson' },
      { id: generateId(), email: 'manager2@hotel.com', name: 'Michael Chen' }
    ];

    for (const manager of managers) {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, room_number, created_at)
        VALUES (?, ?, ?, ?, 'manager', NULL, ?)
      `).run(manager.id, manager.email, passwordHash, manager.name, dateOffset(-30));
      managerIds.push(manager.id);
      console.log(`   ✓ Manager: ${manager.name}`);
    }

    // Create guests
    const guestNames = [
      'Emma Wilson', 'James Brown', 'Olivia Davis', 'William Martinez',
      'Sophia Anderson', 'Benjamin Taylor', 'Ava Thomas', 'Lucas Garcia',
      'Isabella Rodriguez', 'Mason Lee'
    ];

    for (let i = 0; i < 10; i++) {
      const guestId = generateId();
      const roomNumber = i < 5 ? (100 + i).toString() : (200 + (i - 5)).toString();
      const email = `guest${i + 1}@hotel.com`;
      
      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, room_number, created_at)
        VALUES (?, ?, ?, ?, 'guest', ?, ?)
      `).run(guestId, email, passwordHash, guestNames[i], roomNumber, dateOffset(-randomInt(1, 7)));
      
      guestIds.push({ id: guestId, roomNumber, name: guestNames[i] });
      console.log(`   ✓ Guest: ${guestNames[i]} (Room ${roomNumber})`);
    }

    // Create rooms
    console.log('\n🏨 Creating rooms...');
    const rooms = [];

    // Floor 1: Rooms 100-110
    for (let num = 100; num <= 110; num++) {
      const roomId = generateId();
      const roomNumber = num.toString();
      const type = num <= 106 ? 'standard' : num <= 109 ? 'deluxe' : 'suite';
      
      const guestIndex = num - 100;
      let status, currentGuestId;
      if (guestIndex < 5) {
        status = 'occupied';
        currentGuestId = guestIds[guestIndex].id;
      } else if (num === 106) {
        status = 'cleaning';
        currentGuestId = null;
      } else if (num === 107) {
        status = 'maintenance';
        currentGuestId = null;
      } else {
        status = 'vacant';
        currentGuestId = null;
      }

      db.prepare(`
        INSERT INTO rooms (id, room_number, floor, type, status, current_guest_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(roomId, roomNumber, 1, type, status, currentGuestId);
      
      rooms.push({ id: roomId, roomNumber, type, status });
      console.log(`   ✓ Room ${roomNumber} (${type}) - ${status}`);
    }

    // Floor 2: Rooms 200-210
    for (let num = 200; num <= 210; num++) {
      const roomId = generateId();
      const roomNumber = num.toString();
      const type = num <= 206 ? 'standard' : num <= 209 ? 'deluxe' : 'suite';
      
      const guestIndex = (num - 200) + 5;
      let status, currentGuestId;
      if (guestIndex >= 5 && guestIndex < 10) {
        status = 'occupied';
        currentGuestId = guestIds[guestIndex].id;
      } else if (num === 206) {
        status = 'cleaning';
        currentGuestId = null;
      } else if (num === 207) {
        status = 'maintenance';
        currentGuestId = null;
      } else {
        status = 'vacant';
        currentGuestId = null;
      }

      db.prepare(`
        INSERT INTO rooms (id, room_number, floor, type, status, current_guest_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(roomId, roomNumber, 2, type, status, currentGuestId);
      
      rooms.push({ id: roomId, roomNumber, type, status });
      console.log(`   ✓ Room ${roomNumber} (${type}) - ${status}`);
    }

    // Create room devices
    console.log('\n💡 Creating room devices...');
    let deviceCount = 0;
    
    for (const room of rooms) {
      const devices = [
        {
          id: generateId(),
          type: 'light',
          name: 'Main Light',
          state: JSON.stringify({ on: true, brightness: 80 }),
          entityId: `light.room_${room.roomNumber}_main`
        },
        {
          id: generateId(),
          type: 'light',
          name: 'Bedside Light',
          state: JSON.stringify({ on: false, brightness: 50 }),
          entityId: `light.room_${room.roomNumber}_bedside`
        },
        {
          id: generateId(),
          type: 'thermostat',
          name: 'Room Thermostat',
          state: JSON.stringify({ temperature: 72, mode: 'cool', target: 72 }),
          entityId: `climate.room_${room.roomNumber}_hvac`
        }
      ];

      for (const device of devices) {
        db.prepare(`
          INSERT INTO room_devices (id, room_id, type, name, state, home_assistant_entity_id, use_mock)
          VALUES (?, ?, ?, ?, ?, ?, 0)
        `).run(device.id, room.id, device.type, device.name, device.state, device.entityId);
        deviceCount++;
      }
    }
    console.log(`   ✓ Created ${deviceCount} devices`);

    // Create service requests
    console.log('\n📋 Creating service requests...');
    const serviceTypes = ['housekeeping', 'room_service', 'maintenance', 'concierge'];
    const priorities = ['low', 'medium', 'high'];
    const statuses = ['pending', 'in_progress', 'completed'];
    
    const serviceDescriptions = {
      housekeeping: ['Extra towels needed', 'Room cleaning requested', 'Fresh linens please'],
      room_service: ['Breakfast order', 'Dinner delivery', 'Coffee and snacks'],
      maintenance: ['AC not cooling properly', 'Leaky faucet', 'TV remote not working'],
      concierge: ['Restaurant recommendation', 'Tour booking assistance', 'Transportation needed']
    };

    for (let i = 0; i < 8; i++) {
      const guest = guestIds[i];
      const type = randomItem(serviceTypes);
      const status = i < 3 ? 'pending' : i < 6 ? 'in_progress' : 'completed';
      
      db.prepare(`
        INSERT INTO service_requests (id, guest_id, room_number, type, priority, description, status, salesforce_ticket_id, created_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        generateId(),
        guest.id,
        guest.roomNumber,
        type,
        randomItem(priorities),
        randomItem(serviceDescriptions[type]),
        status,
        status !== 'pending' ? `SF-${randomInt(10000, 99999)}` : null,
        dateOffset(-randomInt(0, 3)),
        status === 'completed' ? dateOffset(-randomInt(0, 1)) : null
      );
      
      console.log(`   ✓ ${type} request for Room ${guest.roomNumber} - ${status}`);
    }

    // Create maintenance tasks
    console.log('\n🔧 Creating maintenance tasks...');
    const maintenanceTasks = [
      { title: 'HVAC Filter Replacement', description: 'Replace air filters in Room 107', priority: 'medium' },
      { title: 'Plumbing Repair', description: 'Fix leaky faucet in Room 203', priority: 'high' },
      { title: 'Light Bulb Replacement', description: 'Replace burnt bulbs in hallway', priority: 'low' },
      { title: 'Window Seal Repair', description: 'Repair window seal in Room 109', priority: 'medium' },
      { title: 'Carpet Cleaning', description: 'Deep clean carpet in Room 205', priority: 'low' },
      { title: 'Door Lock Issue', description: 'Fix electronic lock on Room 108', priority: 'urgent' }
    ];

    const taskStatuses = ['pending', 'assigned', 'in_progress', 'completed'];

    for (let i = 0; i < maintenanceTasks.length; i++) {
      const task = maintenanceTasks[i];
      const room = rooms[randomInt(0, rooms.length - 1)];
      const status = randomItem(taskStatuses);
      
      db.prepare(`
        INSERT INTO maintenance_tasks (id, room_id, title, description, priority, status, assigned_to, created_by, created_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        generateId(),
        room.id,
        task.title,
        task.description,
        task.priority,
        status,
        status !== 'pending' ? 'John Smith' : null,
        managerIds[0],
        dateOffset(-randomInt(1, 5)),
        status === 'completed' ? dateOffset(-randomInt(0, 2)) : null
      );
      
      console.log(`   ✓ ${task.title} - ${status}`);
    }

    // Create charges
    console.log('\n💰 Creating charges...');
    for (const guest of guestIds.slice(0, 8)) {
      db.prepare(`
        INSERT INTO charges (id, guest_id, type, description, amount, date, paid)
        VALUES (?, ?, 'room', ?, ?, ?, 0)
      `).run(
        generateId(),
        guest.id,
        `Room ${guest.roomNumber} - Nightly Rate`,
        rooms.find(r => r.roomNumber === guest.roomNumber).type === 'suite' ? 299.99 : 
        rooms.find(r => r.roomNumber === guest.roomNumber).type === 'deluxe' ? 199.99 : 149.99,
        dateOffset(-randomInt(1, 3))
      );

      if (Math.random() > 0.5) {
        db.prepare(`
          INSERT INTO charges (id, guest_id, type, description, amount, date, paid)
          VALUES (?, ?, 'food', 'Room Service - Breakfast', ?, ?, 0)
        `).run(generateId(), guest.id, 24.99, dateOffset(-randomInt(0, 2)));
      }
    }
    console.log(`   ✓ Created charges for ${guestIds.slice(0, 8).length} guests`);

    // Create transactions
    console.log('\n💳 Creating transactions...');
    for (let i = 0; i < 5; i++) {
      const guest = guestIds[i];
      db.prepare(`
        INSERT INTO transactions (id, guest_id, amount, type, status, stripe_transaction_id, created_at)
        VALUES (?, ?, ?, 'payment', 'completed', ?, ?)
      `).run(
        generateId(),
        guest.id,
        randomInt(100, 500),
        `ch_${generateId().substring(0, 24)}`,
        dateOffset(-randomInt(1, 5))
      );
    }
    console.log(`   ✓ Created 5 completed transactions`);

    db.close();

    console.log('\n✅ Database setup complete!\n');
    console.log('📊 Summary:');
    console.log(`   - ${managers.length} managers`);
    console.log(`   - ${guestIds.length} guests`);
    console.log(`   - ${rooms.length} rooms (100-110, 200-210)`);
    console.log(`   - ${deviceCount} room devices`);
    console.log(`   - 8 service requests`);
    console.log(`   - ${maintenanceTasks.length} maintenance tasks`);
    console.log(`   - Multiple charges and transactions`);
    console.log('\n🔑 Demo Credentials:');
    console.log('   Managers: manager1@hotel.com / Hotel2026!');
    console.log('   Guests: guest1@hotel.com / Hotel2026! (Room 100)');
    console.log(`   Database: ${DB_PATH}\n`);

  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run setup
setupDatabase();
