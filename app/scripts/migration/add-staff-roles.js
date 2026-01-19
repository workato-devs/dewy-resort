#!/usr/bin/env node

/**
 * Script to add housekeeping and maintenance roles to the database
 * and create test users for these roles
 * 
 * Usage: node scripts/add-staff-roles.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logInfo(message) {
  log(`[INFO] ${message}`, 'green');
}

function logError(message) {
  log(`[ERROR] ${message}`, 'red');
}

function logWarning(message) {
  log(`[WARNING] ${message}`, 'yellow');
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(message, 'blue');
  log('='.repeat(60), 'blue');
}

// Database path
// Script is now in scripts/migration/, so go up 2 levels to app root
const dbPath = path.join(__dirname, '../..', 'var', 'hotel.db');
const migrationPath = path.join(__dirname, '../..', 'database', 'migrations', 'add-staff-roles.sql');

// Check if database exists
if (!fs.existsSync(dbPath)) {
  logError(`Database not found at: ${dbPath}`);
  logError('Please run: npm run db:init');
  process.exit(1);
}

// Check if migration file exists
if (!fs.existsSync(migrationPath)) {
  logError(`Migration file not found at: ${migrationPath}`);
  process.exit(1);
}

// Connect to database
let db;
try {
  db = new Database(dbPath);
  logInfo(`Connected to database: ${dbPath}`);
} catch (err) {
  logError(`Failed to connect to database: ${err.message}`);
  process.exit(1);
}

// Helper function to run SQL
function runSQL(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  } catch (err) {
    throw err;
  }
}

// Helper function to query SQL
function querySQL(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (err) {
    throw err;
  }
}

// Helper function to hash password (simple for demo)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper function to generate UUID
function generateUUID() {
  return crypto.randomUUID();
}

async function applyMigration() {
  logSection('Applying Database Migration');
  
  try {
    // Read migration file
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    logInfo('Executing migration as a single transaction');
    
    // Execute the entire migration as one transaction
    db.exec(migrationSQL);
    
    logInfo('Migration applied successfully');
    return true;
  } catch (err) {
    logError(`Migration failed: ${err.message}`);
    console.error(err);
    return false;
  }
}

async function createTestUsers() {
  logSection('Creating Test Users');
  
  const testUsers = [
    {
      id: generateUUID(),
      email: 'housekeeping@hotel.local',
      password: 'Housekeeping123!',
      name: 'Maria Housekeeping',
      role: 'housekeeping',
    },
    {
      id: generateUUID(),
      email: 'maintenance@hotel.local',
      password: 'Maintenance123!',
      name: 'John Maintenance',
      role: 'maintenance',
    },
  ];
  
  for (const user of testUsers) {
    try {
      // Check if user already exists
      const existing = await querySQL(
        'SELECT id FROM users WHERE email = ?',
        [user.email]
      );
      
      if (existing.length > 0) {
        logWarning(`User ${user.email} already exists, skipping`);
        continue;
      }
      
      // Create user
      runSQL(
        `INSERT INTO users (id, email, password_hash, name, role, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [user.id, user.email, hashPassword(user.password), user.name, user.role]
      );
      
      logInfo(`✓ Created ${user.role} user: ${user.email}`);
      log(`  Password: ${user.password}`, 'yellow');
    } catch (err) {
      logError(`Failed to create user ${user.email}: ${err.message}`);
    }
  }
}

async function verifyChanges() {
  logSection('Verifying Changes');
  
  try {
    // Check if new roles are supported
    const users = await querySQL('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    
    logInfo('User roles in database:');
    for (const row of users) {
      log(`  ${row.role}: ${row.count} user(s)`, 'blue');
    }
    
    // Verify housekeeping and maintenance users exist
    const staffUsers = await querySQL(
      "SELECT email, name, role FROM users WHERE role IN ('housekeeping', 'maintenance')"
    );
    
    if (staffUsers.length > 0) {
      logInfo('\nStaff users created:');
      for (const user of staffUsers) {
        log(`  ${user.role}: ${user.name} (${user.email})`, 'blue');
      }
    } else {
      logWarning('No staff users found');
    }
    
    return true;
  } catch (err) {
    logError(`Verification failed: ${err.message}`);
    return false;
  }
}

async function displaySummary() {
  logSection('Summary');
  
  console.log(`
Database Migration Complete!

The following changes have been applied:

1. ✓ Updated users table to support 'housekeeping' and 'maintenance' roles
2. ✓ Created test users for staff roles

Test User Credentials:
----------------------
Housekeeping:
  Email: housekeeping@hotel.local
  Password: Housekeeping123!

Maintenance:
  Email: maintenance@hotel.local
  Password: Maintenance123!

Next Steps:
-----------
1. Update your Cognito User Pool to include these roles
2. Create corresponding users in Cognito with custom:role attribute
3. Deploy the Identity Pool CloudFormation stack (if not already done)
4. Test the Bedrock chat integration with staff roles

CloudFormation Note:
-------------------
The Identity Pool CloudFormation template already includes IAM roles
for housekeeping and maintenance. No template updates are needed.

To create Cognito users with these roles, use the AWS CLI:

  aws cognito-idp admin-create-user \\
    --user-pool-id YOUR_USER_POOL_ID \\
    --username housekeeping@hotel.local \\
    --user-attributes \\
      Name=email,Value=housekeeping@hotel.local \\
      Name=name,Value="Maria Housekeeping" \\
      Name=custom:role,Value=housekeeping \\
    --temporary-password "TempPassword123!" \\
    --message-action SUPPRESS

  aws cognito-idp admin-create-user \\
    --user-pool-id YOUR_USER_POOL_ID \\
    --username maintenance@hotel.local \\
    --user-attributes \\
      Name=email,Value=maintenance@hotel.local \\
      Name=name,Value="John Maintenance" \\
      Name=custom:role,Value=maintenance \\
    --temporary-password "TempPassword123!" \\
    --message-action SUPPRESS
`);
}

// Main execution
async function main() {
  try {
    logSection('Add Housekeeping and Maintenance Roles');
    logInfo('Starting database migration and user creation');
    
    // Apply migration
    const migrationSuccess = await applyMigration();
    if (!migrationSuccess) {
      logError('Migration failed, aborting');
      process.exit(1);
    }
    
    // Create test users
    await createTestUsers();
    
    // Verify changes
    const verifySuccess = await verifyChanges();
    if (!verifySuccess) {
      logWarning('Verification had issues, but migration may have succeeded');
    }
    
    // Display summary
    await displaySummary();
    
    logInfo('Script completed successfully');
  } catch (err) {
    logError(`Script failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    // Close database connection
    if (db) {
      try {
        db.close();
      } catch (err) {
        logError(`Error closing database: ${err.message}`);
      }
    }
  }
}

// Run main function
main();
