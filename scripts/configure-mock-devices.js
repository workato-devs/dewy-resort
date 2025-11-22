#!/usr/bin/env node

/**
 * Helper script to configure mock device settings
 * Provides easy commands to mark devices as mock or real
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'var', 'hotel.db');

function showUsage() {
  console.log(`
Mock Device Configuration Tool
==============================

Usage: node scripts/configure-mock-devices.js <command> [options]

Commands:
  list                          List all devices with their mock status
  list-mock                     List only mock devices
  list-real                     List only real devices
  stats                         Show statistics about mock vs real devices
  
  set-mock <device-id>          Mark a specific device as mock
  set-real <device-id>          Mark a specific device as real
  
  set-room-mock <room-number>   Mark all devices in a room as mock
  set-room-real <room-number>   Mark all devices in a room as real
  
  set-type-mock <device-type>   Mark all devices of a type as mock (light, thermostat, blinds)
  set-type-real <device-type>   Mark all devices of a type as real
  
  set-name-mock <device-name>   Mark all devices with a name as mock (e.g., "Bedside Light")
  set-name-real <device-name>   Mark all devices with a name as real

Examples:
  node scripts/configure-mock-devices.js list
  node scripts/configure-mock-devices.js set-room-mock 101
  node scripts/configure-mock-devices.js set-name-mock "Bedside Light"
  node scripts/configure-mock-devices.js set-type-real thermostat
  node scripts/configure-mock-devices.js stats
`);
}

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  return db;
}

function listDevices(mockFilter = null) {
  const db = getDb();
  
  let query = `
    SELECT 
      rd.id,
      rd.name,
      rd.type,
      r.room_number,
      rd.use_mock,
      rd.home_assistant_entity_id
    FROM room_devices rd
    JOIN rooms r ON rd.room_id = r.id
  `;
  
  if (mockFilter !== null) {
    query += ` WHERE rd.use_mock = ${mockFilter ? 1 : 0}`;
  }
  
  query += ` ORDER BY r.room_number, rd.name`;
  
  const devices = db.prepare(query).all();
  
  console.log('\n📋 Device List\n');
  console.log('Room | Device Name          | Type       | Mock | Entity ID');
  console.log('-----|----------------------|------------|------|----------------------------------');
  
  for (const device of devices) {
    const mockStatus = device.use_mock ? '✓' : ' ';
    const roomNum = device.room_number.padEnd(4);
    const name = device.name.padEnd(20);
    const type = device.type.padEnd(10);
    const entityId = device.home_assistant_entity_id || 'N/A';
    
    console.log(`${roomNum} | ${name} | ${type} | ${mockStatus}    | ${entityId}`);
  }
  
  console.log(`\nTotal: ${devices.length} devices\n`);
  
  db.close();
}

function showStats() {
  const db = getDb();
  
  const total = db.prepare('SELECT COUNT(*) as count FROM room_devices').get();
  const mock = db.prepare('SELECT COUNT(*) as count FROM room_devices WHERE use_mock = 1').get();
  const real = db.prepare('SELECT COUNT(*) as count FROM room_devices WHERE use_mock = 0').get();
  
  const byType = db.prepare(`
    SELECT type, 
           SUM(CASE WHEN use_mock = 1 THEN 1 ELSE 0 END) as mock_count,
           SUM(CASE WHEN use_mock = 0 THEN 1 ELSE 0 END) as real_count,
           COUNT(*) as total
    FROM room_devices
    GROUP BY type
  `).all();
  
  console.log('\n📊 Device Statistics\n');
  console.log(`Total Devices:  ${total.count}`);
  console.log(`Mock Devices:   ${mock.count} (${Math.round(mock.count / total.count * 100)}%)`);
  console.log(`Real Devices:   ${real.count} (${Math.round(real.count / total.count * 100)}%)`);
  
  console.log('\nBy Device Type:');
  console.log('Type       | Mock | Real | Total');
  console.log('-----------|------|------|------');
  
  for (const row of byType) {
    const type = row.type.padEnd(10);
    console.log(`${type} | ${String(row.mock_count).padStart(4)} | ${String(row.real_count).padStart(4)} | ${String(row.total).padStart(5)}`);
  }
  
  console.log('');
  
  db.close();
}

function setDeviceMock(deviceId, useMock) {
  const db = getDb();
  
  const result = db.prepare('UPDATE room_devices SET use_mock = ? WHERE id = ?')
    .run(useMock ? 1 : 0, deviceId);
  
  if (result.changes === 0) {
    console.log(`❌ Device not found: ${deviceId}`);
  } else {
    console.log(`✓ Device ${deviceId} set to ${useMock ? 'mock' : 'real'} mode`);
  }
  
  db.close();
}

function setRoomMock(roomNumber, useMock) {
  const db = getDb();
  
  const result = db.prepare(`
    UPDATE room_devices 
    SET use_mock = ? 
    WHERE room_id IN (SELECT id FROM rooms WHERE room_number = ?)
  `).run(useMock ? 1 : 0, roomNumber);
  
  if (result.changes === 0) {
    console.log(`❌ No devices found in room: ${roomNumber}`);
  } else {
    console.log(`✓ ${result.changes} device(s) in room ${roomNumber} set to ${useMock ? 'mock' : 'real'} mode`);
  }
  
  db.close();
}

function setTypeMock(deviceType, useMock) {
  const db = getDb();
  
  const result = db.prepare('UPDATE room_devices SET use_mock = ? WHERE type = ?')
    .run(useMock ? 1 : 0, deviceType);
  
  if (result.changes === 0) {
    console.log(`❌ No devices found with type: ${deviceType}`);
  } else {
    console.log(`✓ ${result.changes} ${deviceType} device(s) set to ${useMock ? 'mock' : 'real'} mode`);
  }
  
  db.close();
}

function setNameMock(deviceName, useMock) {
  const db = getDb();
  
  const result = db.prepare('UPDATE room_devices SET use_mock = ? WHERE name = ?')
    .run(useMock ? 1 : 0, deviceName);
  
  if (result.changes === 0) {
    console.log(`❌ No devices found with name: ${deviceName}`);
  } else {
    console.log(`✓ ${result.changes} device(s) named "${deviceName}" set to ${useMock ? 'mock' : 'real'} mode`);
  }
  
  db.close();
}

// Main execution
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'list':
    listDevices();
    break;
  
  case 'list-mock':
    listDevices(true);
    break;
  
  case 'list-real':
    listDevices(false);
    break;
  
  case 'stats':
    showStats();
    break;
  
  case 'set-mock':
    if (!arg) {
      console.log('❌ Device ID required');
      showUsage();
      process.exit(1);
    }
    setDeviceMock(arg, true);
    break;
  
  case 'set-real':
    if (!arg) {
      console.log('❌ Device ID required');
      showUsage();
      process.exit(1);
    }
    setDeviceMock(arg, false);
    break;
  
  case 'set-room-mock':
    if (!arg) {
      console.log('❌ Room number required');
      showUsage();
      process.exit(1);
    }
    setRoomMock(arg, true);
    break;
  
  case 'set-room-real':
    if (!arg) {
      console.log('❌ Room number required');
      showUsage();
      process.exit(1);
    }
    setRoomMock(arg, false);
    break;
  
  case 'set-type-mock':
    if (!arg) {
      console.log('❌ Device type required (light, thermostat, blinds)');
      showUsage();
      process.exit(1);
    }
    setTypeMock(arg, true);
    break;
  
  case 'set-type-real':
    if (!arg) {
      console.log('❌ Device type required (light, thermostat, blinds)');
      showUsage();
      process.exit(1);
    }
    setTypeMock(arg, false);
    break;
  
  case 'set-name-mock':
    if (!arg) {
      console.log('❌ Device name required');
      showUsage();
      process.exit(1);
    }
    setNameMock(arg, true);
    break;
  
  case 'set-name-real':
    if (!arg) {
      console.log('❌ Device name required');
      showUsage();
      process.exit(1);
    }
    setNameMock(arg, false);
    break;
  
  default:
    showUsage();
    process.exit(command ? 1 : 0);
}
