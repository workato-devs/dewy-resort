#!/usr/bin/env node

/**
 * Database seed script
 * Populates the database with demo data for workshop
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

// Script is now in scripts/setup/, so go up 2 levels to app root
const DB_PATH = path.join(__dirname, '../..', 'var', 'hotel.db');

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

async function seedDatabase() {
  try {
    console.log('🌱 Seeding Hotel Management Database...\n');

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    // Clear existing data (in correct order to respect foreign keys)
    console.log('🗑️  Clearing existing data...');
    const tables = [
      'chat_messages',
      'sessions',
      'transactions',
      'charges',
      'maintenance_tasks',
      'service_requests',
      'room_devices',
      'rooms',
      'users'
    ];
    
    // Temporarily disable foreign keys for deletion
    db.pragma('foreign_keys = OFF');
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    db.pragma('foreign_keys = ON');
    console.log('✓ Cleared existing data\n');

    // Hash password for all users (demo password: "password123")
    const passwordHash = await bcrypt.hash('password123', 10);

    // Seed Users (2 managers + 10 guests)
    console.log('👥 Creating users...');
    const managerIds = [];
    const guestIds = [];

    // Create managers
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
      console.log(`   ✓ Manager: ${manager.name} (${manager.email})`);
    }

    // Create guests
    const guestNames = [
      'Emma Wilson', 'James Brown', 'Olivia Davis', 'William Martinez',
      'Sophia Anderson', 'Benjamin Taylor', 'Ava Thomas', 'Lucas Garcia',
      'Isabella Rodriguez', 'Mason Lee'
    ];

    for (let i = 0; i < 10; i++) {
      const guestId = generateId();
      // Rooms 100-104 for first 5 guests, 200-204 for next 5 guests
      const roomNumber = i < 5 ? (100 + i).toString() : (200 + (i - 5)).toString();
      const email = `guest${i + 1}@hotel.com`;
      
      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, room_number, created_at)
        VALUES (?, ?, ?, ?, 'guest', ?, ?)
      `).run(guestId, email, passwordHash, guestNames[i], roomNumber, dateOffset(-randomInt(1, 7)));
      
      guestIds.push({ id: guestId, roomNumber, name: guestNames[i] });
      console.log(`   ✓ Guest: ${guestNames[i]} (${email}) - Room ${roomNumber}`);
    }

    // Seed Rooms (22 rooms: 100-110 and 200-210)
    console.log('\n🏨 Creating rooms...');
    const roomTypes = ['standard', 'deluxe', 'suite'];
    const roomStatuses = ['vacant', 'occupied', 'cleaning', 'maintenance'];
    const rooms = [];

    // Floor 1: Rooms 100-110
    for (let num = 100; num <= 110; num++) {
      const roomId = generateId();
      const roomNumber = num.toString();
      const type = num <= 106 ? 'standard' : num <= 109 ? 'deluxe' : 'suite';
      
      // First 5 rooms on floor 1 are occupied by guests
      let status, currentGuestId;
      const guestIndex = num - 100;
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
      
      // Next 5 rooms on floor 2 are occupied by remaining guests
      let status, currentGuestId;
      const guestIndex = (num - 200) + 5;
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

    // Seed Room Devices
    console.log('\n💡 Creating room devices...');
    let deviceCount = 0;
    
    for (const room of rooms) {
      // Room 100 has the real Govee Table Lamp 2, others are mock devices
      const isRoom100 = room.roomNumber === '100';
      
      // Each room gets devices based on room number
      let devices;
      
      if (isRoom100) {
        // Room 100: Real Govee lamp + mock bedside light and thermostat
        devices = [
          {
            id: generateId(),
            type: 'light',
            name: 'Govee Table Lamp 2',
            state: JSON.stringify({ 
              state: 'on', 
              on: true, 
              brightness: 255,
              supported_color_modes: ['color_temp', 'hs', 'xy'],
              effect_list: ['Energic', 'Rhythm', 'Spectrum', 'Rolling', 'Separation', 'Hopping', 'PianoKeys', 'Fountain', 'DayAndNight', 'Sprouting', 'Shiny']
            }),
            entityId: 'light.h6022',
            useMock: false  // Real Home Assistant device
          },
          {
            id: generateId(),
            type: 'light',
            name: 'Bedside Light',
            state: JSON.stringify({ state: 'off', on: false, brightness: 50 }),
            entityId: `light.room_${room.roomNumber}_bedside`,
            useMock: true  // Mock device
          },
          {
            id: generateId(),
            type: 'thermostat',
            name: 'Room Thermostat',
            state: JSON.stringify({ temperature: 72, mode: 'cool', target: 72, current_temperature: 71 }),
            entityId: `climate.room_${room.roomNumber}_hvac`,
            useMock: true  // Mock device
          }
        ];
      } else {
        // Other rooms: All mock devices
        devices = [
          {
            id: generateId(),
            type: 'light',
            name: 'Main Light',
            state: JSON.stringify({ state: 'on', on: true, brightness: 80 }),
            entityId: `light.room_${room.roomNumber}_main`,
            useMock: true
          },
          {
            id: generateId(),
            type: 'light',
            name: 'Bedside Light',
            state: JSON.stringify({ state: 'off', on: false, brightness: 50 }),
            entityId: `light.room_${room.roomNumber}_bedside`,
            useMock: true
          },
          {
            id: generateId(),
            type: 'thermostat',
            name: 'Room Thermostat',
            state: JSON.stringify({ temperature: 72, mode: 'cool', target: 72, current_temperature: 71 }),
            entityId: `climate.room_${room.roomNumber}_hvac`,
            useMock: true
          }
        ];
      }

      for (const device of devices) {
        const useMock = device.useMock ? 1 : 0;
        
        db.prepare(`
          INSERT INTO room_devices (id, room_id, type, name, state, home_assistant_entity_id, use_mock)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(device.id, room.id, device.type, device.name, device.state, device.entityId, useMock);
        deviceCount++;
      }
    }
    console.log(`   ✓ Created ${deviceCount} devices`);

    // Seed Service Requests
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

    // Seed Maintenance Tasks
    console.log('\n🔧 Creating maintenance tasks...');
    const taskPriorities = ['low', 'medium', 'high', 'urgent'];
    const taskStatuses = ['pending', 'assigned', 'in_progress', 'completed'];
    
    const maintenanceTasks = [
      { title: 'HVAC Filter Replacement', description: 'Replace air filters in Room 107', priority: 'medium' },
      { title: 'Plumbing Repair', description: 'Fix leaky faucet in Room 203', priority: 'high' },
      { title: 'Light Bulb Replacement', description: 'Replace burnt bulbs in hallway', priority: 'low' },
      { title: 'Window Seal Repair', description: 'Repair window seal in Room 109', priority: 'medium' },
      { title: 'Carpet Cleaning', description: 'Deep clean carpet in Room 205', priority: 'low' },
      { title: 'Door Lock Issue', description: 'Fix electronic lock on Room 108', priority: 'urgent' }
    ];

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

    // Seed Charges
    console.log('\n💰 Creating charges...');
    const chargeTypes = ['room', 'service', 'food', 'other'];
    
    for (const guest of guestIds.slice(0, 8)) {
      // Room charge
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

      // Random additional charges
      if (Math.random() > 0.5) {
        db.prepare(`
          INSERT INTO charges (id, guest_id, type, description, amount, date, paid)
          VALUES (?, ?, 'food', 'Room Service - Breakfast', ?, ?, 0)
        `).run(generateId(), guest.id, 24.99, dateOffset(-randomInt(0, 2)));
      }
      
      if (Math.random() > 0.6) {
        db.prepare(`
          INSERT INTO charges (id, guest_id, type, description, amount, date, paid)
          VALUES (?, ?, 'service', 'Laundry Service', ?, ?, 0)
        `).run(generateId(), guest.id, 15.50, dateOffset(-randomInt(0, 1)));
      }
    }
    console.log(`   ✓ Created charges for ${guestIds.slice(0, 8).length} guests`);

    // Seed Transactions
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

    // Seed Chat Messages
    console.log('\n💬 Creating chat messages...');
    for (let i = 0; i < 3; i++) {
      const guest = guestIds[i];
      
      // User message
      db.prepare(`
        INSERT INTO chat_messages (id, user_id, role, content, timestamp, metadata)
        VALUES (?, ?, 'user', ?, ?, NULL)
      `).run(
        generateId(),
        guest.id,
        'Hello, I need extra towels',
        dateOffset(-randomInt(0, 2))
      );
      
      // Assistant response
      db.prepare(`
        INSERT INTO chat_messages (id, user_id, role, content, timestamp, metadata)
        VALUES (?, ?, 'assistant', ?, ?, NULL)
      `).run(
        generateId(),
        guest.id,
        'Of course! I\'ve created a housekeeping request for extra towels. They should arrive within 30 minutes.',
        dateOffset(-randomInt(0, 2))
      );
    }
    console.log(`   ✓ Created sample chat conversations`);

    // Close database
    db.close();

    console.log('\n✅ Database seeding complete!');
    console.log('\n📊 Summary:');
    console.log(`   - ${managers.length} managers`);
    console.log(`   - ${guestIds.length} guests`);
    console.log(`   - ${rooms.length} rooms (100-110, 200-210)`);
    console.log(`   - ${deviceCount} room devices`);
    console.log(`   - 8 service requests`);
    console.log(`   - ${maintenanceTasks.length} maintenance tasks`);
    console.log(`   - Multiple charges and transactions`);
    console.log(`   - Sample chat messages`);
    console.log('\n🔑 Demo Credentials:');
    console.log('   Managers:');
    console.log('   - manager1@hotel.com / password123');
    console.log('   - manager2@hotel.com / password123');
    console.log('   Guests:');
    console.log('   - guest1@hotel.com / password123 (Room 100)');
    console.log('   - guest2@hotel.com / password123 (Room 101)');
    console.log('   - guest6@hotel.com / password123 (Room 200)');
    console.log('   - ... (guest3-10@hotel.com)\n');

  } catch (error) {
    console.error('\n❌ Database seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();
